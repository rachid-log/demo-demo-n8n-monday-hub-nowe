"use server";

import { db as prisma } from "@/lib/db";
import { ExecutionStatus } from "@prisma/client";
import { revalidatePath } from "next/cache";

export async function executeWorkflowAction(workflowId: string, payload: any) {
  const workflow = await prisma.workflow.findUnique({
    where: { id: workflowId },
  });

  if (!workflow) throw new Error("Workflow not found");

  const logs: any[] = [];
  let currentPayload = { ...(payload || {}) };
  let status: ExecutionStatus = ExecutionStatus.SUCCESS;
  let durationMs = 0;
  let cost = 0;
  let output: any = null;

  const nodes = (workflow.nodes as any[]) || [];

  for (const node of nodes) {
    const start = Date.now();
    logs.push({
      timestamp: new Date().toISOString(),
      nodeName: node.name,
      status: "RUNNING",
      message: `Starting node execution: ${node.name}`,
    });

    // Simulate node-specific latency
    await new Promise((resolve) => setTimeout(resolve, 350));

    if (node.type === "webhook") {
      logs.push({
        timestamp: new Date().toISOString(),
        nodeName: node.name,
        status: "SUCCESS",
        message: `Webhook payload received: ${JSON.stringify(currentPayload)}`,
      });
    } else if (node.type === "ai-ocr") {
      cost += 0.015;
      output = {
        invoiceNumber:
          currentPayload.invoiceNumber ||
          `INV-${Math.floor(Math.random() * 9000) + 1000}`,
        vendorName: currentPayload.vendorName || "Acme Corp",
        totalAmount:
          typeof currentPayload.totalAmount === "number"
            ? currentPayload.totalAmount
            : parseFloat(currentPayload.totalAmount) || 1250.0,
        dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
          .toISOString()
          .split("T")[0],
      };
      currentPayload = { ...currentPayload, ...output };
      logs.push({
        timestamp: new Date().toISOString(),
        nodeName: node.name,
        status: "SUCCESS",
        message: `AI Extraction complete. Extracted: ${JSON.stringify(output)}`,
      });
    } else if (node.type === "monday-update") {
      const board = await prisma.mondayBoard.findFirst({
        where: node.config?.boardId
          ? {
              OR: [
                { id: node.config.boardId },
                { name: { contains: "Invoice", mode: "insensitive" } },
              ],
            }
          : undefined,
      });

      const targetBoard = board || (await prisma.mondayBoard.findFirst());
      if (targetBoard) {
        const items = (targetBoard.items as any[]) || [];
        const isInvoice = currentPayload.invoiceNumber || currentPayload.totalAmount;
        const newItem = isInvoice
          ? {
              id: `item-${Date.now()}`,
              name: currentPayload.invoiceNumber || "INV-NEW",
              columnValues: {
                vendor: currentPayload.vendorName || "Unknown Vendor",
                amount: currentPayload.totalAmount || 0,
                status: "Approved",
                extracted_at: new Date().toISOString().split("T")[0],
              },
            }
          : {
              id: `lead-${Date.now()}`,
              name: currentPayload.leadName || currentPayload.name || "New Contact",
              columnValues: {
                company: currentPayload.company || "Enterprise Corp",
                employees: currentPayload.employees || 500,
                status: "Enriched",
              },
            };

        await prisma.mondayBoard.update({
          where: { id: targetBoard.id },
          data: {
            items: [newItem, ...items],
          },
        });
        logs.push({
          timestamp: new Date().toISOString(),
          nodeName: node.name,
          status: "SUCCESS",
          message: `Successfully synced item "${newItem.name}" to Monday.com Board: ${targetBoard.name}`,
        });
      }
    } else if (node.type === "slack-notify") {
      logs.push({
        timestamp: new Date().toISOString(),
        nodeName: node.name,
        status: "SUCCESS",
        message: `Slack notification dispatched to channel ${
          node.config?.channel || "#finance-alerts"
        }`,
      });
    } else if (node.type === "monday-trigger") {
      logs.push({
        timestamp: new Date().toISOString(),
        nodeName: node.name,
        status: "SUCCESS",
        message: `Triggered by Monday.com event: ${
          currentPayload.company || currentPayload.name || "Lead entry"
        }`,
      });
    } else if (node.type === "http-request") {
      cost += 0.005;
      const company = currentPayload.company || "Acme Technologies";
      output = {
        company,
        employees: currentPayload.employees || 750,
        domain: `${company.toLowerCase().replace(/[^a-z0-9]/g, "")}.io`,
        revenueTier: "Enterprise",
      };
      currentPayload = { ...currentPayload, ...output };
      logs.push({
        timestamp: new Date().toISOString(),
        nodeName: node.name,
        status: "SUCCESS",
        message: `Clearbit API response: Enriched metadata for ${company} (${output.employees} employees, Revenue Tier: Enterprise)`,
      });
    } else if (node.type === "router") {
      const emp = currentPayload.employees || 100;
      const destination = emp > 500 ? "Enterprise Board" : "SMB Board";
      logs.push({
        timestamp: new Date().toISOString(),
        nodeName: node.name,
        status: "SUCCESS",
        message: `Router evaluated condition: employees (${emp}) > 500 -> Routed to ${destination}`,
      });
    } else {
      logs.push({
        timestamp: new Date().toISOString(),
        nodeName: node.name,
        status: "SUCCESS",
        message: `Executed node: ${node.name}`,
      });
    }

    durationMs += Date.now() - start;
  }

  // Save execution record
  const execution = await prisma.workflowExecution.create({
    data: {
      workflowId,
      status,
      triggerType: payload?.triggerType || "Manual Trigger",
      payload: currentPayload,
      output: output || currentPayload,
      durationMs,
      cost,
      logs,
    },
  });

  // Update BI metrics for today
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    await (prisma as any).bIMetric.upsert({
      where: { date: today },
      update: {
        totalExecutions: { increment: 1 },
        costSaved: { increment: 1.25 },
        dataThroughput: { increment: 1 },
      },
      create: {
        date: today,
        totalExecutions: 1,
        successRate: 100.0,
        costSaved: 1.25,
        dataThroughput: 1,
      },
    });
  } catch (metricError) {
    console.warn("Could not update BI metric:", metricError);
  }

  revalidatePath("/dashboard");
  return execution;
}

export async function getMondayBoards() {
  return await prisma.mondayBoard.findMany();
}

export async function updateMondayItem(
  boardId: string,
  itemId: string,
  columnValues: any
) {
  const board = await prisma.mondayBoard.findUnique({ where: { id: boardId } });
  if (!board) throw new Error("Board not found");

  const items = (board.items as any[]) || [];
  const updatedItems = items.map((item) => {
    if (item.id === itemId) {
      return {
        ...item,
        columnValues: { ...item.columnValues, ...columnValues },
      };
    }
    return item;
  });

  const updatedBoard = await prisma.mondayBoard.update({
    where: { id: boardId },
    data: { items: updatedItems },
  });

  revalidatePath("/dashboard");
  return updatedBoard;
}

export async function addMondayItem(
  boardId: string,
  item: { name: string; columnValues: Record<string, any> }
) {
  const board = await prisma.mondayBoard.findUnique({ where: { id: boardId } });
  if (!board) throw new Error("Board not found");

  const items = (board.items as any[]) || [];
  const newItem = {
    id: `item-${Date.now()}`,
    name: item.name,
    columnValues: item.columnValues,
  };

  const updatedBoard = await prisma.mondayBoard.update({
    where: { id: boardId },
    data: { items: [newItem, ...items] },
  });

  revalidatePath("/dashboard");
  return updatedBoard;
}

export async function extractStructuredDataAction(
  templateId: string,
  rawText: string
) {
  let template = null;
  if (templateId) {
    template = await prisma.aIPromptTemplate.findUnique({
      where: { id: templateId },
    });
  }
  if (!template) {
    template = await prisma.aIPromptTemplate.findFirst();
  }

  // Simulate LLM processing delay
  await new Promise((resolve) => setTimeout(resolve, 900));

  const textLower = (rawText || "").toLowerCase();
  let vendor = "Acme Corp";
  let amount = 1250.0;
  let invNum = "INV-" + Math.floor(Math.random() * 90000 + 10000);

  if (textLower.includes("amazon") || textLower.includes("aws")) {
    vendor = "Amazon Web Services";
  } else if (textLower.includes("vercel")) {
    vendor = "Vercel Inc.";
  } else if (textLower.includes("google")) {
    vendor = "Google Cloud Platform";
  } else if (textLower.includes("slack")) {
    vendor = "Slack Technologies";
  } else if (textLower.includes("microsoft") || textLower.includes("azure")) {
    vendor = "Microsoft Azure";
  }

  const amountMatch = rawText.match(/\$\s*([0-9]{1,3}(?:,[0-9]{3})*(?:\.[0-9]{2})?|[0-9]+(?:\.[0-9]{2})?)/);
  if (amountMatch && amountMatch[1]) {
    amount = parseFloat(amountMatch[1].replace(/,/g, ""));
  }

  const invMatch = rawText.match(/(?:INV-[A-Z0-9-]+|Invoice\s*#?\s*:?\s*[A-Z0-9-]+)/i);
  if (invMatch) {
    const rawInv = invMatch[0].trim();
    invNum = rawInv.toUpperCase().replace(/^INVOICE\s*#?\s*:?\s*/i, "INV-");
    if (invNum.startsWith("INV-INV-")) {
      invNum = invNum.substring(4);
    }
  }

  return {
    invoiceNumber: invNum,
    vendorName: vendor,
    totalAmount: amount,
    dueDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000)
      .toISOString()
      .split("T")[0],
  };
}
