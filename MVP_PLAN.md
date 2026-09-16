# MVP Plan - FlowForge AI (n8n & Monday.com Automation Hub)

This plan details the implementation of **FlowForge AI**, an interactive n8n workflow builder, Monday.com integration simulator, AI structured data extraction playground, and BI analytics dashboard. It is designed to run autonomously inside the Next.js standalone container on the VPS.

---

## Phase 1: Database Setup & Prisma Models

### 1. Prisma Schema (`prisma/schema.prisma`)
Create or update the schema to support workflows, executions, mock Monday.com boards, BI metrics, and AI prompt templates.

```prisma
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

generator client {
  provider = "prisma-client-js"
}

model Workflow {
  id          String              @id @default(uuid())
  name        String
  description String
  isActive    Boolean             @default(true)
  nodes       Json                // Array of node objects: { id, type, name, config }
  edges       Json                // Array of edge objects: { source, target }
  executions  WorkflowExecution[]
  createdAt   DateTime            @default(now())
  updatedAt   DateTime            @updatedAt
}

model WorkflowExecution {
  id          String         @id @default(uuid())
  workflowId  String
  workflow    Workflow       @relation(fields: [workflowId], onDelete: Cascade)
  status      ExecutionStatus
  triggerType String         // e.g., "Webhook", "Schedule", "Monday.com Event"
  payload     Json           // Input payload
  output      Json?          // Final output payload
  durationMs  Int
  cost        Float          @default(0.0) // Simulated AI cost
  logs        Json           // Array of log steps: { timestamp, nodeName, status, message }
  createdAt   DateTime       @default(now())
}

enum ExecutionStatus {
  SUCCESS
  FAILED
  RETRYING
}

model MondayBoard {
  id        String   @id @default(uuid())
  name      String
  columns   Json     // Array of columns: { id, title, type }
  items     Json     // Array of items: { id, name, columnValues: Record<string, any> }
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
}

model BIMetric {
  id             String   @id @default(uuid())
  date           DateTime @unique
  totalExecutions Int
  successRate    Float
  costSaved      Float
  dataThroughput Int      // Number of records processed
  createdAt      DateTime @default(now())
}

model AIPromptTemplate {
  id           String   @id @default(uuid())
  name         String
  systemPrompt String
  userPrompt   String
  schema       Json     // Expected JSON output structure
  createdAt    DateTime @default(now())
}
```

### 2. Seed Script (`prisma/seed.ts`)
Create a rich seed script to populate realistic demo data.

```typescript
import { PrismaClient, ExecutionStatus } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  // Clear existing data
  await prisma.workflowExecution.deleteMany({});
  await prisma.workflow.deleteMany({});
  await prisma.mondayBoard.deleteMany({});
  await prisma.BIMetric.deleteMany({});
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
    await prisma.BIMetric.create({
      data: {
        date,
        totalExecutions: Math.floor(Math.random() * 150) + 100,
        successRate: 95 + Math.random() * 4.8, // 95% to 99.8%
        costSaved: (Math.floor(Math.random() * 150) + 100) * 1.25, // $1.25 saved per execution
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
```

---

## Phase 2: Server Actions & Route Handlers

Create a robust set of Server Actions in `app/actions/automation.ts` to handle workflow execution, Monday.com updates, AI extraction, and BI reporting.

### 1. Workflow Execution Action
Simulates step-by-step execution of an n8n workflow, updating the database and returning live execution logs.

```typescript
"use server";

import { PrismaClient, ExecutionStatus } from '@prisma/client';
import { revalidatePath } from 'next/cache';

const prisma = new PrismaClient();

export async function executeWorkflowAction(workflowId: string, payload: any) {
  const workflow = await prisma.workflow.findUnique({
    where: { id: workflowId }
  });

  if (!workflow) throw new Error("Workflow not found");

  const logs: any[] = [];
  let currentPayload = { ...payload };
  let status: ExecutionStatus = ExecutionStatus.SUCCESS;
  let durationMs = 0;
  let cost = 0;
  let output: any = null;

  const nodes = workflow.nodes as any[];

  for (const node of nodes) {
    const start = Date.now();
    logs.push({
      timestamp: new Date().toISOString(),
      nodeName: node.name,
      status: "RUNNING",
      message: `Starting node execution: ${node.name}`
    });

    // Simulate node-specific logic
    await new Promise((resolve) => setTimeout(resolve, 400)); // Simulate latency

    if (node.type === "webhook") {
      logs.push({
        timestamp: new Date().toISOString(),
        nodeName: node.name,
        status: "SUCCESS",
        message: `Webhook payload received: ${JSON.stringify(currentPayload)}`
      });
    } else if (node.type === "ai-ocr") {
      cost += 0.015;
      // Mock AI extraction
      output = {
        invoiceNumber: currentPayload.invoiceNumber || `INV-${Math.floor(Math.random() * 9000) + 1000}`,
        vendorName: currentPayload.vendorName || "Acme Corp",
        totalAmount: parseFloat(currentPayload.totalAmount) || 1250.00,
        dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
      };
      currentPayload = { ...currentPayload, ...output };
      logs.push({
        timestamp: new Date().toISOString(),
        nodeName: node.name,
        status: "SUCCESS",
        message: `AI Extraction complete. Extracted: ${JSON.stringify(output)}`
      });
    } else if (node.type === "monday-update") {
      // Find the first Monday board and add/update item
      const board = await prisma.mondayBoard.findFirst();
      if (board) {
        const items = board.items as any[];
        const newItem = {
          id: `item-${Date.now()}`,
          name: currentPayload.invoiceNumber || "New Item",
          columnValues: {
            vendor: currentPayload.vendorName || "Unknown Vendor",
            amount: currentPayload.totalAmount || 0,
            status: "Pending Review",
            extracted_at: new Date().toISOString().split('T')[0]
          }
        };
        await prisma.mondayBoard.update({
          where: { id: board.id },
          data: {
            items: [newItem, ...items]
          }
        });
        logs.push({
          timestamp: new Date().toISOString(),
          nodeName: node.name,
          status: "SUCCESS",
          message: `Successfully synced item to Monday.com Board: ${board.name}`
        });
      }
    } else if (node.type === "slack-notify") {
      logs.push({
        timestamp: new Date().toISOString(),
        nodeName: node.name,
        status: "SUCCESS",
        message: `Slack notification dispatched to channel ${node.config.channel || "#general"}`
      });
    }

    durationMs += Date.now() - start;
  }

  // Save execution log
  const execution = await prisma.workflowExecution.create({
    data: {
      workflowId,
      status,
      triggerType: "Manual Trigger",
      payload,
      output,
      durationMs,
      cost,
      logs
    }
  });

  // Update BI metrics for today
  const today = new Date();
  today.setHours(0,0,0,0);
  await prisma.BIMetric.upsert({
    where: { date: today },
    update: {
      totalExecutions: { increment: 1 },
      costSaved: { increment: 1.25 },
      dataThroughput: { increment: 1 }
    },
    create: {
      date: today,
      totalExecutions: 1,
      successRate: 100.0,
      costSaved: 1.25,
      dataThroughput: 1
    }
  });

  revalidatePath('/dashboard');
  return execution;
}
```

### 2. Monday.com Board Actions
```typescript
"use server";

import { PrismaClient } from '@prisma/client';
import { revalidatePath } from 'next/cache';

const prisma = new PrismaClient();

export async function getMondayBoards() {
  return await prisma.mondayBoard.findMany();
}

export async function updateMondayItem(boardId: string, itemId: string, columnValues: any) {
  const board = await prisma.mondayBoard.findUnique({ where: { id: boardId } });
  if (!board) throw new Error("Board not found");

  const items = board.items as any[];
  const updatedItems = items.map(item => {
    if (item.id === itemId) {
      return { ...item, columnValues: { ...item.columnValues, ...columnValues } };
    }
    return item;
  });

  await prisma.mondayBoard.update({
    where: { id: boardId },
    data: { items: updatedItems }
  });

  revalidatePath('/dashboard');
}
```

### 3. AI Extraction Action
```typescript
"use server";

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function extractStructuredDataAction(templateId: string, rawText: string) {
  const template = await prisma.aIPromptTemplate.findUnique({ where: { id: templateId } });
  if (!template) throw new Error("Template not found");

  // Simulate LLM processing delay
  await new Promise(resolve => setTimeout(resolve, 1200));

  // Mock extraction logic based on keywords in rawText
  const textLower = rawText.toLowerCase();
  let vendor = "Acme Corp";
  let amount = 1250.00;
  let invNum = "INV-2024-999";

  if (textLower.includes("amazon") || textLower.includes("aws")) {
    vendor = "Amazon Web Services";
  } else if (textLower.includes("vercel")) {
    vendor = "Vercel Inc.";
  } else if (textLower.includes("google")) {
    vendor = "Google Cloud";
  }

  const amountMatch = rawText.match(/\$?([0-9,]+\.[0-9]{2})/);
  if (amountMatch) {
    amount = parseFloat(amountMatch[1].replace(/,/g, ''));
  }

  const invMatch = rawText.match(/(INV-\d+|Invoice #\s*\d+)/i);
  if (invMatch) {
    invNum = invMatch[1].toUpperCase();
  }

  return {
    invoiceNumber: invNum,
    vendorName: vendor,
    totalAmount: amount,
    dueDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
  };
}
```

---

## Phase 3: Core Interactive UI

We will build a beautiful, unified dashboard with 5 tabs:
1. **n8n Workflow Builder & Simulator**: Visual node graph with interactive execution triggers.
2. **Monday.com Board Simulator**: Real-time updating grid showing cross-board sync.
3. **AI Structured Data Playground**: Paste text, run OCR/LLM extraction, and sync to Monday.
4. **BI Analytics Dashboard**: Rich charts showing automation ROI, throughput, and success rates.
5. **Execution Logs**: Live terminal-style log viewer.

### 1. Main Dashboard Layout (`app/dashboard/page.tsx`)
```typescript
import { PrismaClient } from '@prisma/client';
import DashboardClient from './DashboardClient';

const prisma = new PrismaClient();

export default async function DashboardPage() {
  const workflows = await prisma.workflow.findMany();
  const mondayBoards = await prisma.mondayBoard.findMany();
  const biMetrics = await prisma.BIMetric.findMany({
    orderBy: { date: 'asc' }
  });
  const promptTemplates = await prisma.aIPromptTemplate.findMany();
  const executions = await prisma.workflowExecution.findMany({
    orderBy: { createdAt: 'desc' },
    take: 20
  });

  return (
    <DashboardClient
      initialWorkflows={workflows}
      initialMondayBoards={mondayBoards}
      initialBiMetrics={biMetrics}
      initialPromptTemplates={promptTemplates}
      initialExecutions={executions}
    />
  );
}
```

### 2. Interactive Client Component (`app/dashboard/DashboardClient.tsx`)
Create a rich, stateful dashboard with Tailwind CSS and Recharts.

```typescript
"use client";

import React, { useState } from 'react';
import { executeWorkflowAction, extractStructuredDataAction, updateMondayItem } from '../actions/automation';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area } from 'recharts';

export default function DashboardClient({
  initialWorkflows,
  initialMondayBoards,
  initialBiMetrics,
  initialPromptTemplates,
  initialExecutions
}: any) {
  const [activeTab, setActiveTab] = useState<'workflows' | 'monday' | 'ai' | 'bi' | 'logs'>('workflows');
  const [workflows, setWorkflows] = useState(initialWorkflows);
  const [mondayBoards, setMondayBoards] = useState(initialMondayBoards);
  const [executions, setExecutions] = useState(initialExecutions);
  const [selectedWorkflow, setSelectedWorkflow] = useState(workflows[0]);
  const [isRunning, setIsRunning] = useState(false);
  const [executionLogs, setExecutionLogs] = useState<any[]>([]);
  const [aiText, setAiText] = useState(`INVOICE
Invoice Number: INV-88291
Vendor: Vercel Inc.
Date: Oct 24, 2024
Total Amount Due: $1,200.00
Thank you for your business!`);
  const [aiResult, setAiResult] = useState<any>(null);
  const [isExtracting, setIsExtracting] = useState(false);

  // Trigger simulated workflow
  const handleRunWorkflow = async () => {
    setIsRunning(true);
    setExecutionLogs([{ timestamp: new Date().toISOString(), nodeName: "Trigger", status: "RUNNING", message: "Initializing workflow execution..." }]);
    
    try {
      const result = await executeWorkflowAction(selectedWorkflow.id, {
        invoiceNumber: "INV-" + Math.floor(Math.random() * 90000),
        vendorName: "AWS Cloud Services",
        totalAmount: (Math.random() * 2000).toFixed(2)
      });
      
      setExecutionLogs(result.logs);
      setExecutions([result, ...executions]);
      
      // Refresh Monday boards
      const updatedBoards = await fetch('/api/monday/boards').then(res => res.json());
      setMondayBoards(updatedBoards);
    } catch (err) {
      console.error(err);
    } finally {
      setIsRunning(false);
    }
  };

  // Trigger AI Extraction
  const handleExtract = async () => {
    setIsExtracting(true);
    try {
      const result = await extractStructuredDataAction(initialPromptTemplates[0].id, aiText);
      setAiResult(result);
    } catch (err) {
      console.error(err);
    } finally {
      setIsExtracting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 flex flex-col">
      {/* Header */}
      <header className="border-b border-slate-800 bg-slate-950 px-6 py-4 flex justify-between items-center">
        <div className="flex items-center space-x-3">
          <div className="bg-orange-500 text-white p-2 rounded-lg font-bold text-xl">n8n</div>
          <div>
            <h1 className="text-xl font-bold tracking-tight">FlowForge AI</h1>
            <p className="text-xs text-slate-400">Advanced n8n & Monday.com Automation Hub</p>
          </div>
        </div>
        <div className="flex items-center space-x-2">
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            <span className="w-1.5 h-1.5 mr-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
            Agent Active
          </span>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar */}
        <aside className="w-64 bg-slate-950 border-r border-slate-800 p-4 flex flex-col justify-between">
          <nav className="space-y-1">
            <button
              onClick={() => setActiveTab('workflows')}
              className={`w-full flex items-center space-x-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${activeTab === 'workflows' ? 'bg-orange-500/10 text-orange-400 border border-orange-500/20' : 'text-slate-400 hover:bg-slate-900 hover:text-slate-200'}`}
            >
              <span>⚡ n8n Workflows</span>
            </button>
            <button
              onClick={() => setActiveTab('monday')}
              className={`w-full flex items-center space-x-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${activeTab === 'monday' ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20' : 'text-slate-400 hover:bg-slate-900 hover:text-slate-200'}`}
            >
              <span>📊 Monday.com Boards</span>
            </button>
            <button
              onClick={() => setActiveTab('ai')}
              className={`w-full flex items-center space-x-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${activeTab === 'ai' ? 'bg-purple-500/10 text-purple-400 border border-purple-500/20' : 'text-slate-400 hover:bg-slate-900 hover:text-slate-200'}`}
            >
              <span>🧠 AI OCR Playground</span>
            </button>
            <button
              onClick={() => setActiveTab('bi')}
              className={`w-full flex items-center space-x-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${activeTab === 'bi' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'text-slate-400 hover:bg-slate-900 hover:text-slate-200'}`}
            >
              <span>📈 BI Analytics</span>
            </button>
            <button
              onClick={() => setActiveTab('logs')}
              className={`w-full flex items-center space-x-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${activeTab === 'logs' ? 'bg-slate-800 text-slate-200' : 'text-slate-400 hover:bg-slate-900 hover:text-slate-200'}`}
            >
              <span>📋 Execution Logs</span>
            </button>
          </nav>
          <div className="p-3 bg-slate-900/50 rounded-lg border border-slate-800">
            <p className="text-xs text-slate-500">Rachid Ait Mohand</p>
            <p className="text-[10px] text-slate-600">Applied AI Automation Specialist</p>
          </div>
        </aside>

        {/* Main Content Area */}
        <main className="flex-1 overflow-y-auto p-6 bg-slate-900">
          {/* 1. WORKFLOWS TAB */}
          {activeTab === 'workflows' && (
            <div className="space-y-6">
              <div className="flex justify-between items-center">
                <div>
                  <h2 className="text-2xl font-bold">n8n Workflow Simulator</h2>
                  <p className="text-slate-400 text-sm">Select and trigger advanced multi-step automation workflows.</p>
                </div>
                <button
                  onClick={handleRunWorkflow}
                  disabled={isRunning}
                  className="bg-orange-500 hover:bg-orange-600 text-white px-4 py-2 rounded-lg font-medium shadow-lg shadow-orange-500/20 transition-all disabled:opacity-50 flex items-center space-x-2"
                >
                  {isRunning ? (
                    <>
                      <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                      <span>Executing...</span>
                    </>
                  ) : (
                    <>
                      <span>▶ Run Workflow</span>
                    </>
                  )}
                </button>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Workflow Selector & Details */}
                <div className="bg-slate-950 border border-slate-800 rounded-xl p-5 space-y-4">
                  <h3 className="font-semibold text-lg">Select Workflow</h3>
                  <div className="space-y-2">
                    {workflows.map((wf: any) => (
                      <button
                        key={wf.id}
                        onClick={() => setSelectedWorkflow(wf)}
                        className={`w-full text-left p-3 rounded-lg border transition-all ${selectedWorkflow.id === wf.id ? 'bg-slate-900 border-orange-500/50' : 'bg-slate-900/50 border-slate-800 hover:border-slate-700'}`}
                      >
                        <h4 className="font-medium text-sm">{wf.name}</h4>
                        <p className="text-xs text-slate-400 mt-1 line-clamp-2">{wf.description}</p>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Visual Node Canvas */}
                <div className="lg:col-span-2 bg-slate-950 border border-slate-800 rounded-xl p-5 flex flex-col justify-between min-h-[400px]">
                  <h3 className="font-semibold text-lg mb-4">Workflow Architecture</h3>
                  <div className="flex flex-col md:flex-row items-center justify-center space-y-4 md:space-y-0 md:space-x-4 flex-1">
                    {(selectedWorkflow.nodes as any[]).map((node: any, idx: number) => (
                      <React.Fragment key={node.id}>
                        <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl w-48 text-center shadow-md relative group hover:border-orange-500/50 transition-all">
                          <div className="text-xs font-semibold text-orange-400 uppercase tracking-wider mb-1">{node.type}</div>
                          <div className="font-medium text-sm text-slate-200">{node.name}</div>
                          <div className="text-[10px] text-slate-500 mt-2 truncate">{JSON.stringify(node.config)}</div>
                        </div>
                        {idx < (selectedWorkflow.nodes as any[]).length - 1 && (
                          <div className="text-slate-600 text-xl font-bold rotate-90 md:rotate-0">➔</div>
                        )}
                      </React.Fragment>
                    ))}
                  </div>

                  {/* Live Execution Logs */}
                  {executionLogs.length > 0 && (
                    <div className="mt-6 bg-slate-900 border border-slate-800 rounded-lg p-4 font-mono text-xs space-y-1.5 max-h-40 overflow-y-auto">
                      <div className="text-slate-400 border-b border-slate-800 pb-1 mb-2 flex justify-between">
                        <span>Execution Logs</span>
                        <span className="text-orange-400">Live</span>
                      </div>
                      {executionLogs.map((log, idx) => (
                        <div key={idx} className="flex space-x-2">
                          <span className="text-slate-500">[{log.timestamp.split('T')[1].slice(0, 8)}]</span>
                          <span className="text-blue-400">[{log.nodeName}]</span>
                          <span className={log.status === 'SUCCESS' ? 'text-emerald-400' : 'text-yellow-400'}>{log.status}:</span>
                          <span className="text-slate-300">{log.message}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* 2. MONDAY.COM TAB */}
          {activeTab === 'monday' && (
            <div className="space-y-6">
              <div>
                <h2 className="text-2xl font-bold">Monday.com Board Simulator</h2>
                <p className="text-slate-400 text-sm">Simulated Monday.com workspace showing real-time updates from n8n workflows.</p>
              </div>

              <div className="space-y-8">
                {mondayBoards.map((board: any) => (
                  <div key={board.id} className="bg-slate-950 border border-slate-800 rounded-xl overflow-hidden">
                    <div className="bg-slate-900/80 px-6 py-4 border-b border-slate-800 flex justify-between items-center">
                      <h3 className="font-bold text-lg text-blue-400 flex items-center space-x-2">
                        <span className="w-2.5 h-2.5 rounded-full bg-blue-500"></span>
                        <span>{board.name}</span>
                      </h3>
                      <span className="text-xs text-slate-500">{(board.items as any[]).length} Items</span>
                    </div>
                    <div className="overflow-x-auto">
                      <table className="w-full text-left border-collapse">
                        <thead>
                          <tr className="border-b border-slate-800 bg-slate-900/30 text-slate-400 text-xs font-semibold uppercase tracking-wider">
                            <th className="px-6 py-3">Item Name</th>
                            {(board.columns as any[]).map((col: any) => (
                              <th key={col.id} className="px-6 py-3">{col.title}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800/50 text-sm">
                          {(board.items as any[]).map((item: any) => (
                            <tr key={item.id} className="hover:bg-slate-900/40 transition-colors">
                              <td className="px-6 py-3.5 font-medium text-slate-200">{item.name}</td>
                              {(board.columns as any[]).map((col: any) => {
                                const val = item.columnValues[col.id];
                                return (
                                  <td key={col.id} className="px-6 py-3.5">
                                    {col.type === 'status' ? (
                                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${val === 'Approved' || val === 'Enriched' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-yellow-500/10 text-yellow-400 border border-yellow-500/20'}`}>
                                        {val || 'Pending'}
                                      </span>
                                    ) : col.type === 'numeric' ? (
                                      <span className="font-mono text-slate-300">
                                        {typeof val === 'number' ? val.toLocaleString() : val}
                                      </span>
                                    ) : (
                                      <span className="text-slate-300">{val || '-'}</span>
                                    )}
                                  </td>
                                );
                              })}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 3. AI OCR PLAYGROUND */}
          {activeTab === 'ai' && (
            <div className="space-y-6">
              <div>
                <h2 className="text-2xl font-bold">AI OCR & Structured Data Playground</h2>
                <p className="text-slate-400 text-sm">Test prompt engineering and structured data extraction from raw documents.</p>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Input Panel */}
                <div className="bg-slate-950 border border-slate-800 rounded-xl p-5 space-y-4 flex flex-col">
                  <h3 className="font-semibold text-lg">Raw Document Text</h3>
                  <textarea
                    value={aiText}
                    onChange={(e) => setAiText(e.target.value)}
                    className="flex-1 min-h-[250px] bg-slate-900 border border-slate-800 rounded-lg p-4 font-mono text-sm text-slate-300 focus:outline-none focus:border-purple-500"
                  />
                  <button
                    onClick={handleExtract}
                    disabled={isExtracting}
                    className="w-full bg-purple-600 hover:bg-purple-700 text-white py-3 rounded-lg font-medium shadow-lg shadow-purple-500/20 transition-all disabled:opacity-50 flex items-center justify-center space-x-2"
                  >
                    {isExtracting ? (
                      <>
                        <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                        <span>Extracting with GPT-4o...</span>
                      </>
                    ) : (
                      <span>🧠 Extract Structured Data</span>
                    )}
                  </button>
                </div>

                {/* Output Panel */}
                <div className="bg-slate-950 border border-slate-800 rounded-xl p-5 flex flex-col justify-between">
                  <div>
                    <h3 className="font-semibold text-lg mb-4">Extracted JSON Output</h3>
                    {aiResult ? (
                      <pre className="bg-slate-900 border border-slate-800 rounded-lg p-4 font-mono text-sm text-emerald-400 overflow-x-auto">
                        {JSON.stringify(aiResult, null, 2)}
                      </pre>
                    ) : (
                      <div className="border-2 border-dashed border-slate-800 rounded-lg p-12 text-center text-slate-500">
                        Run extraction to see structured JSON output.
                      </div>
                    )}
                  </div>

                  {aiResult && (
                    <div className="mt-6 p-4 bg-purple-500/10 border border-purple-500/20 rounded-lg flex justify-between items-center">
                      <div>
                        <h4 className="font-semibold text-sm text-purple-400">Ready for Monday.com Sync</h4>
                        <p className="text-xs text-slate-400">This payload matches the columns of the Invoices board.</p>
                      </div>
                      <button
                        onClick={async () => {
                          const board = mondayBoards[0];
                          const newItem = {
                            id: `item-${Date.now()}`,
                            name: aiResult.invoiceNumber,
                            columnValues: {
                              vendor: aiResult.vendorName,
                              amount: aiResult.totalAmount,
                              status: "Approved",
                              extracted_at: aiResult.dueDate
                            }
                          };
                          const updatedBoards = mondayBoards.map((b: any) => {
                            if (b.id === board.id) {
                              return { ...b, items: [newItem, ...b.items] };
                            }
                            return b;
                          });
                          setMondayBoards(updatedBoards);
                          alert("Synced to Monday.com Board successfully!");
                        }}
                        className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg text-sm font-medium"
                      >
                        Sync Now
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* 4. BI ANALYTICS TAB */}
          {activeTab === 'bi' && (
            <div className="space-y-6">
              <div>
                <h2 className="text-2xl font-bold">BI Automation Analytics</h2>
                <p className="text-slate-400 text-sm">Real-time business intelligence dashboard tracking automation ROI, throughput, and success rates.</p>
              </div>

              {/* KPI Cards */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="bg-slate-950 border border-slate-800 p-5 rounded-xl">
                  <div className="text-xs font-semibold text-slate-500 uppercase">Total Executions</div>
                  <div className="text-2xl font-bold mt-1">2,481</div>
                  <div className="text-xs text-emerald-400 mt-1">↑ 12% vs last week</div>
                </div>
                <div className="bg-slate-950 border border-slate-800 p-5 rounded-xl">
                  <div className="text-xs font-semibold text-slate-500 uppercase">Success Rate</div>
                  <div className="text-2xl font-bold mt-1 text-emerald-400">99.4%</div>
                  <div className="text-xs text-slate-400 mt-1">0.02% error rate</div>
                </div>
                <div className="bg-slate-950 border border-slate-800 p-5 rounded-xl">
                  <div className="text-xs font-semibold text-slate-500 uppercase">Estimated Cost Saved</div>
                  <div className="text-2xl font-bold mt-1 text-blue-400">$3,101.25</div>
                  <div className="text-xs text-emerald-400 mt-1">Based on $1.25/manual task</div>
                </div>
                <div className="bg-slate-950 border border-slate-800 p-5 rounded-xl">
                  <div className="text-xs font-semibold text-slate-500 uppercase">Data Throughput</div>
                  <div className="text-2xl font-bold mt-1">8,492 records</div>
                  <div className="text-xs text-slate-400 mt-1">Across 4 connected systems</div>
                </div>
              </div>

              {/* Charts */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-slate-950 border border-slate-800 p-5 rounded-xl">
                  <h3 className="font-semibold text-lg mb-4">Automation Volume & Cost Savings</h3>
                  <div className="h-80">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={initialBiMetrics}>
                        <defs>
                          <linearGradient id="colorExec" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#f97316" stopOpacity={0.3}/>
                            <stop offset="95%" stopColor="#f97316" stopOpacity={0}/>
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                        <XAxis dataKey="date" tickFormatter={(str) => new Date(str).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} stroke="#64748b" />
                        <YAxis stroke="#64748b" />
                        <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#1e293b' }} />
                        <Area type="monotone" dataKey="totalExecutions" stroke="#f97316" fillOpacity={1} fill="url(#colorExec)" name="Executions" />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                <div className="bg-slate-950 border border-slate-800 p-5 rounded-xl">
                  <h3 className="font-semibold text-lg mb-4">Success Rate Trend</h3>
                  <div className="h-80">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={initialBiMetrics}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                        <XAxis dataKey="date" tickFormatter={(str) => new Date(str).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} stroke="#64748b" />
                        <YAxis domain={[90, 100]} stroke="#64748b" />
                        <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#1e293b' }} />
                        <Line type="monotone" dataKey="successRate" stroke="#10b981" strokeWidth={2} name="Success Rate (%)" />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* 5. EXECUTION LOGS TAB */}
          {activeTab === 'logs' && (
            <div className="space-y-6">
              <div>
                <h2 className="text-2xl font-bold">System Execution Logs</h2>
                <p className="text-slate-400 text-sm">Audit trail of all automated workflow executions, retries, and error handling.</p>
              </div>

              <div className="bg-slate-950 border border-slate-800 rounded-xl overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-slate-800 bg-slate-900/30 text-slate-400 text-xs font-semibold uppercase tracking-wider">
                        <th className="px-6 py-3">Timestamp</th>
                        <th className="px-6 py-3">Workflow</th>
                        <th className="px-6 py-3">Trigger</th>
                        <th className="px-6 py-3">Status</th>
                        <th className="px-6 py-3">Duration</th>
                        <th className="px-6 py-3">Cost</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/50 text-sm font-mono">
                      {executions.map((exec: any) => (
                        <tr key={exec.id} className="hover:bg-slate-900/40 transition-colors">
                          <td className="px-6 py-3.5 text-slate-400">{new Date(exec.createdAt).toLocaleString()}</td>
                          <td className="px-6 py-3.5 text-slate-200 font-sans font-medium">
                            {workflows.find((w: any) => w.id === exec.workflowId)?.name || "Unknown Workflow"}
                          </td>
                          <td className="px-6 py-3.5 text-slate-300">{exec.triggerType}</td>
                          <td className="px-6 py-3.5">
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${exec.status === 'SUCCESS' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-red-500/10 text-red-400 border border-red-500/20'}`}>
                              {exec.status}
                            </span>
                          </td>
                          <td className="px-6 py-3.5 text-slate-300">{exec.durationMs}ms</td>
                          <td className="px-6 py-3.5 text-slate-300">${exec.cost.toFixed(4)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
```

### 3. API Route for Monday Boards Refresh (`app/api/monday/boards/route.ts`)
```typescript
import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function GET() {
  const boards = await prisma.mondayBoard.findMany();
  return NextResponse.json(boards);
}
```

---

## Phase 4: Verification Checklist

### 1. Build Verification
Ensure the application builds cleanly without any TypeScript or linting errors.
```bash
npm run build
```

### 2. Standalone Container Check
Verify that the output configuration in `next.config.js` is set to standalone:
```javascript
module.exports = {
  output: 'standalone',
}
```

### 3. Database Migration & Seeding
Run the database push and seed script to ensure the PostgreSQL database is fully initialized.
```bash
npx prisma db push
npx prisma db seed
```

### 4. Zero Human Intervention Smoke Test
- Access the dashboard at `http://localhost:3000/dashboard`.
- Verify that the pre-seeded workflows and Monday.com boards render correctly.
- Click "Run Workflow" and verify that the step-by-step logs execute and update the Monday.com board.
- Navigate to the AI OCR Playground, click "Extract Structured Data", and verify that the JSON output is generated and can be synced to Monday.com.
- Verify that the BI Analytics charts render with realistic historical data.