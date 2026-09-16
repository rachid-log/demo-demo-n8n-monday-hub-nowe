# SYSTEM DESIGN - FlowForge AI (n8n & Monday.com Automation Hub)

This document outlines the production-grade system architecture for **FlowForge AI**, an interactive n8n workflow builder, Monday.com integration simulator, AI structured data extraction playground, and BI analytics dashboard.

---

## Architectural Overview & Component Topology

The system is designed as a self-contained, high-performance Next.js application deployed on an Ubuntu VPS using Docker and Traefik. It utilizes PostgreSQL for persistent storage and Prisma as the ORM.

```
+-----------------------------------------------------------------------------+
|                               Client Browser                                |
+-----------------------------------------------------------------------------+
                                       |
                                       | HTTPS (Port 443)
                                       v
+-----------------------------------------------------------------------------+
|                            Traefik Reverse Proxy                            |
|                     (SSL Termination via Let's Encrypt)                     |
+-----------------------------------------------------------------------------+
                                       |
                                       | HTTP (Port 3000)
                                       v
+-----------------------------------------------------------------------------+
|                         Next.js Standalone Container                        |
|                                                                             |
|  +----------------------------------+  +---------------------------------+  |
|  |           App Router             |  |         Server Actions          |  |
|  |  (Interactive Tailwind UI,       |  |  (Workflow Execution Engine,    |  |
|  |   Recharts BI Dashboards)        |  |   Monday.com Board Simulator,   |  |
|  +----------------------------------+  |   AI Structured Extraction)     |  |
|                                        +---------------------------------+  |
+-----------------------------------------------------------------------------+
                                       |
                                       | Prisma ORM
                                       v
+-----------------------------------------------------------------------------+
|                             PostgreSQL Database                             |
|  (Workflows, Executions, Monday Boards, BI Metrics, AI Prompt Templates)    |
+-----------------------------------------------------------------------------+
```

---

## Data Models & Complete Prisma Schema

The database schema is designed to support complex workflow configurations, execution logs, simulated Monday.com boards, historical BI metrics, and AI prompt templates.

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

---

## API Contracts

### 1. Workflow Execution
* **Endpoint**: `POST /api/workflows/execute`
* **Description**: Triggers a simulated workflow execution.
* **Request Payload**:
  ```json
  {
    "workflowId": "uuid-string",
    "payload": {
      "invoiceNumber": "INV-1002",
      "vendorName": "AWS Cloud Services",
      "totalAmount": 1420.50
    }
  }
  ```
* **Response Payload (200 OK)**:
  ```json
  {
    "id": "execution-uuid",
    "status": "SUCCESS",
    "durationMs": 1420,
    "cost": 0.015,
    "logs": [
      { "timestamp": "2024-10-24T12:00:00Z", "nodeName": "On Email Received", "status": "SUCCESS", "message": "Webhook triggered successfully." }
    ]
  }
  ```

### 2. Monday.com Board Sync
* **Endpoint**: `GET /api/monday/boards`
* **Description**: Fetches all mock Monday.com boards.
* **Response Payload (200 OK)**:
  ```json
  [
    {
      "id": "board-uuid",
      "name": "Invoices & Billing",
      "columns": [
        { "id": "name", "title": "Invoice Name", "type": "text" }
      ],
      "items": [
        { "id": "item-1", "name": "INV-2024-001", "columnValues": { "vendor": "AWS" } }
      ]
    }
  ]
  ```

### 3. AI Structured Data Extraction
* **Endpoint**: `POST /api/ai/extract`
* **Description**: Extracts structured JSON from raw text using simulated LLM/OCR.
* **Request Payload**:
  ```json
  {
    "templateId": "template-uuid",
    "rawText": "Invoice INV-88291 from Vercel Inc. Total: $1,200.00"
  }
  ```
* **Response Payload (200 OK)**:
  ```json
  {
    "invoiceNumber": "INV-88291",
    "vendorName": "Vercel Inc.",
    "totalAmount": 1200.00,
    "dueDate": "2024-11-07"
  }
  ```

---

## External Integrations & 3rd-Party Services

1. **n8n Webhook Simulation**: Fully simulates n8n's webhook trigger node, accepting arbitrary JSON payloads and initiating downstream node executions.
2. **Monday.com API Simulation**: Replicates Monday.com's column types (status, text, numeric, date) and item creation/update logic, allowing users to see how n8n interacts with Monday.com boards.
3. **OpenAI Chat Completion Simulation**: Simulates structured data extraction (JSON Mode) with realistic latency, token usage, and cost calculations.

---

## Security, Auth & Data Protection

1. **Input Validation**: All API payloads and Server Actions are strictly validated using TypeScript interfaces and Zod schemas.
2. **Data Sanitization**: JSON payloads are sanitized to prevent injection attacks.
3. **Environment Isolation**: Database credentials and API keys are managed securely via environment variables.

---

## Scalability, Caching & Performance

1. **Database Indexing**: Unique index on `BIMetric.date` ensures fast lookups for BI dashboards.
2. **Optimistic UI Updates**: Monday.com board simulator updates the UI instantly before the server action completes, ensuring a snappy user experience.
3. **Recharts Optimization**: Chart components are rendered client-side with responsive containers to prevent layout shifts and ensure smooth animations.