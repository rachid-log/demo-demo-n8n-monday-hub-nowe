import { PrismaClient, ExecutionStatus } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log("Starting database seed...");

  // Clear existing data
  await prisma.workflowExecution.deleteMany({});
  await prisma.workflow.deleteMany({});
  await prisma.mondayBoard.deleteMany({});
  await prisma.bIMetric.deleteMany({});
  await prisma.aIPromptTemplate.deleteMany({});

  // 1. Seed Workflows
  const invoiceWorkflow = await prisma.workflow.create({
    data: {
      name: "Invoice OCR & Monday.com Sync",
      description: "Triggered by email webhook, extracts invoice data using LLM, updates Monday.com billing board, and sends Slack notification.",
      isActive: true,
      nodes: [
        { id: "1", type: "webhook", name: "On Email Received", config: { path: "/webhook/invoice" } },
        { id: "2", type: "ai-ocr", name: "OpenAI OCR & Extract", config: { model: "gpt-4o", temperature: 0 } },
        { id: "3", type: "monday-update", name: "Update Monday Board", config: { boardId: "billing-board-id" } },
        { id: "4", type: "slack-notify", name: "Slack Notification", config: { channel: "#finance-alerts" } }
      ],
      edges: [
        { source: "1", target: "2" },
        { source: "2", target: "3" },
        { source: "3", target: "4" }
      ]
    }
  });

  const leadWorkflow = await prisma.workflow.create({
    data: {
      name: "Lead Enrichment & Cross-Board Routing",
      description: "Triggered when a new lead is added to Monday.com. Enrich lead data via Clearbit API and route to appropriate sales board.",
      isActive: true,
      nodes: [
        { id: "1", type: "monday-trigger", name: "Monday.com Lead Added", config: { boardId: "leads-board-id" } },
        { id: "2", type: "http-request", name: "Clearbit Enrichment", config: { url: "https://api.clearbit.com/v2/enrich" } },
        { id: "3", type: "router", name: "Route by Company Size", config: { conditions: [{ field: "employees", op: "gt", val: 500 }] } },
        { id: "4", type: "monday-update", name: "Move to Enterprise Board", config: { boardId: "enterprise-board-id" } },
        { id: "5", type: "monday-update", name: "Move to SMB Board", config: { boardId: "smb-board-id" } }
      ],
      edges: [
        { source: "1", target: "2" },
        { source: "2", target: "3" },
        { source: "3", target: "4" }, // True path
        { source: "3", target: "5" }  // False path
      ]
    }
  });

  // 2. Seed Monday.com Boards
  const billingBoard = await prisma.mondayBoard.create({
    data: {
      name: "Invoices & Billing",
      columns: [
        { id: "name", title: "Invoice Name", type: "text" },
        { id: "vendor", title: "Vendor", type: "text" },
        { id: "amount", title: "Amount ($)", type: "numeric" },
        { id: "status", title: "Status", type: "status" },
        { id: "extracted_at", title: "Extracted At", type: "date" }
      ],
      items: [
        {
          id: "item-1",
          name: "INV-2024-001",
          columnValues: { vendor: "AWS Cloud Services", amount: 1420.50, status: "Approved", extracted_at: "2024-10-20" }
        },
        {
          id: "item-2",
          name: "INV-2024-002",
          columnValues: { vendor: "Vercel Inc.", amount: 450.00, status: "Pending Review", extracted_at: "2024-10-21" }
        }
      ]
    }
  });

  const leadsBoard = await prisma.mondayBoard.create({
    data: {
      name: "CRM Leads",
      columns: [
        { id: "name", title: "Contact Name", type: "text" },
        { id: "company", title: "Company", type: "text" },
        { id: "employees", title: "Employees", type: "numeric" },
        { id: "status", title: "Lead Status", type: "status" }
      ],
      items: [
        {
          id: "lead-1",
          name: "Alice Smith",
          columnValues: { company: "Acme Corp", employees: 1200, status: "Enriched" }
        },
        {
          id: "lead-2",
          name: "Bob Jones",
          columnValues: { company: "Startup Inc", employees: 15, status: "New" }
        }
      ]
    }
  });

  // 3. Seed BI Metrics (Last 15 Days)
  const today = new Date();
  for (let i = 15; i >= 0; i--) {
    const date = new Date(today);
    date.setDate(today.getDate() - i);
    date.setHours(0, 0, 0, 0);
    await prisma.bIMetric.create({
      data: {
        date,
        totalExecutions: Math.floor(Math.random() * 150) + 100,
        successRate: Number((95 + Math.random() * 4.8).toFixed(1)), // 95% to 99.8%
        costSaved: Number(((Math.floor(Math.random() * 150) + 100) * 1.25).toFixed(2)), // $1.25 saved per execution
        dataThroughput: Math.floor(Math.random() * 500) + 300
      }
    });
  }

  // 4. Seed AI Prompt Templates
  await prisma.aIPromptTemplate.create({
    data: {
      name: "Invoice OCR Extractor",
      systemPrompt: "You are an expert OCR and document extraction AI. Extract structured fields from the raw invoice text.",
      userPrompt: "Extract: Invoice Number, Vendor Name, Total Amount, and Due Date from the following text:\n\n{{text}}",
      schema: {
        invoiceNumber: "string",
        vendorName: "string",
        totalAmount: "number",
        dueDate: "string"
      }
    }
  });

  // 5. Seed Workflow Executions
  await prisma.workflowExecution.create({
    data: {
      workflowId: invoiceWorkflow.id,
      status: ExecutionStatus.SUCCESS,
      triggerType: "Webhook",
      payload: { email_subject: "Invoice INV-2024-003 from Slack", body: "Please find attached invoice for $850.00 from Slack Inc." },
      output: { invoiceNumber: "INV-2024-003", vendorName: "Slack Inc.", totalAmount: 850.00, dueDate: "2024-11-15" },
      durationMs: 1420,
      cost: 0.012,
      logs: [
        { timestamp: new Date().toISOString(), nodeName: "On Email Received", status: "SUCCESS", message: "Webhook triggered successfully with payload." },
        { timestamp: new Date().toISOString(), nodeName: "OpenAI OCR & Extract", status: "SUCCESS", message: "Successfully extracted structured data using GPT-4o." },
        { timestamp: new Date().toISOString(), nodeName: "Update Monday Board", status: "SUCCESS", message: "Added item INV-2024-003 to Monday Board 'Invoices & Billing'." },
        { timestamp: new Date().toISOString(), nodeName: "Slack Notification", status: "SUCCESS", message: "Sent alert to #finance-alerts." }
      ]
    }
  });

  console.log("Database seeded successfully!");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
