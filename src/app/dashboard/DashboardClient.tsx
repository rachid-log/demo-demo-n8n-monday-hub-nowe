"use client";

import React, { useState, useEffect } from "react";
import {
  executeWorkflowAction,
  extractStructuredDataAction,
  addMondayItem,
} from "../actions/automation";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  AreaChart,
  Area,
} from "recharts";
import {
  Zap,
  LayoutGrid,
  BrainCircuit,
  BarChart3,
  Terminal,
  Play,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  RefreshCw,
  Clock,
  Coins,
  Send,
  Sparkles,
  ChevronRight,
  Database,
} from "lucide-react";

interface NodeItem {
  id: string;
  type: string;
  name: string;
  config: Record<string, any>;
}

interface WorkflowItem {
  id: string;
  name: string;
  description: string;
  isActive: boolean;
  nodes: NodeItem[];
  edges: { source: string; target: string }[];
}

interface MondayColumn {
  id: string;
  title: string;
  type: string;
}

interface MondayItem {
  id: string;
  name: string;
  columnValues: Record<string, any>;
}

interface MondayBoardItem {
  id: string;
  name: string;
  columns: MondayColumn[];
  items: MondayItem[];
}

interface BIMetricItem {
  id: string;
  date: string | Date;
  totalExecutions: number;
  successRate: number;
  costSaved: number;
  dataThroughput: number;
}

interface ExecutionLogItem {
  timestamp: string;
  nodeName: string;
  status: string;
  message: string;
}

interface ExecutionItem {
  id: string;
  workflowId: string;
  status: "SUCCESS" | "FAILED" | "RETRYING";
  triggerType: string;
  payload: any;
  output: any;
  durationMs: number;
  cost: number;
  logs: ExecutionLogItem[];
  createdAt: string | Date;
}

export default function DashboardClient({
  initialWorkflows,
  initialMondayBoards,
  initialBiMetrics,
  initialPromptTemplates,
  initialExecutions,
}: {
  initialWorkflows: WorkflowItem[];
  initialMondayBoards: MondayBoardItem[];
  initialBiMetrics: BIMetricItem[];
  initialPromptTemplates: any[];
  initialExecutions: ExecutionItem[];
}) {
  const [mounted, setMounted] = useState(false);
  const [activeTab, setActiveTab] = useState<
    "workflows" | "monday" | "ai" | "bi" | "logs"
  >("workflows");
  const [workflows] = useState<WorkflowItem[]>(initialWorkflows || []);
  const [mondayBoards, setMondayBoards] =
    useState<MondayBoardItem[]>(initialMondayBoards || []);
  const [executions, setExecutions] =
    useState<ExecutionItem[]>(initialExecutions || []);
  const [selectedWorkflow, setSelectedWorkflow] = useState<WorkflowItem>(
    initialWorkflows?.[0] || null
  );
  const [isRunning, setIsRunning] = useState(false);
  const [executionLogs, setExecutionLogs] = useState<ExecutionLogItem[]>(
    (initialExecutions?.[0]?.logs as ExecutionLogItem[]) || []
  );

  const [aiText, setAiText] = useState(`INVOICE
Invoice Number: INV-88291
Vendor: Vercel Inc.
Date: Oct 24, 2024
Total Amount Due: $1,200.00
Payment Terms: Net 30
Billing Contact: billing@vercel.com
Thank you for your business!`);
  const [aiResult, setAiResult] = useState<any>(null);
  const [isExtracting, setIsExtracting] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncFeedback, setSyncFeedback] = useState<string | null>(null);

  const [selectedLogExecution, setSelectedLogExecution] =
    useState<ExecutionItem | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Trigger simulated workflow
  const handleRunWorkflow = async () => {
    if (!selectedWorkflow) return;
    setIsRunning(true);
    setExecutionLogs([
      {
        timestamp: new Date().toISOString(),
        nodeName: "Trigger",
        status: "RUNNING",
        message: `Initializing execution for "${selectedWorkflow.name}"...`,
      },
    ]);

    try {
      const isLeadFlow = selectedWorkflow.name.toLowerCase().includes("lead");
      const samplePayload = isLeadFlow
        ? {
            triggerType: "Monday.com Event",
            leadName: ["Sophia Carter", "Marcus Vance", "Elena Rostova"][
              Math.floor(Math.random() * 3)
            ],
            company: ["CloudScale Inc", "DataVentures", "Apex AI"][
              Math.floor(Math.random() * 3)
            ],
            employees: Math.floor(Math.random() * 1200) + 100,
          }
        : {
            triggerType: "Email Webhook",
            invoiceNumber: "INV-" + Math.floor(Math.random() * 90000 + 10000),
            vendorName: ["AWS Cloud", "Stripe Inc", "Datadog", "OpenAI"][
              Math.floor(Math.random() * 4)
            ],
            totalAmount: parseFloat((Math.random() * 2500 + 300).toFixed(2)),
          };

      const result = await executeWorkflowAction(
        selectedWorkflow.id,
        samplePayload
      );

      setExecutionLogs((result.logs as unknown as ExecutionLogItem[]) || []);
      setExecutions((prev) => [result as unknown as ExecutionItem, ...prev]);

      // Refresh Monday boards from API
      try {
        const res = await fetch("/api/monday/boards");
        if (res.ok) {
          const updatedBoards = await res.json();
          setMondayBoards(updatedBoards);
        }
      } catch (e) {
        console.error("Failed to refresh Monday boards", e);
      }
    } catch (err) {
      console.error(err);
      setExecutionLogs((prev) => [
        ...prev,
        {
          timestamp: new Date().toISOString(),
          nodeName: "Engine",
          status: "FAILED",
          message:
            err instanceof Error ? err.message : "Execution failed with error",
        },
      ]);
    } finally {
      setIsRunning(false);
    }
  };

  // Trigger AI Extraction
  const handleExtract = async () => {
    setIsExtracting(true);
    setSyncFeedback(null);
    try {
      const templateId = initialPromptTemplates?.[0]?.id || "";
      const result = await extractStructuredDataAction(templateId, aiText);
      setAiResult(result);
    } catch (err) {
      console.error(err);
    } finally {
      setIsExtracting(false);
    }
  };

  // Sync extracted result to Monday board
  const handleSyncToMonday = async () => {
    if (!aiResult || !mondayBoards.length) return;
    setIsSyncing(true);
    try {
      const board =
        mondayBoards.find((b) =>
          b.name.toLowerCase().includes("invoice")
        ) || mondayBoards[0];

      const newItem = {
        name: aiResult.invoiceNumber || "INV-NEW",
        columnValues: {
          vendor: aiResult.vendorName || "Unknown Vendor",
          amount: aiResult.totalAmount || 0,
          status: "Approved",
          extracted_at:
            aiResult.dueDate || new Date().toISOString().split("T")[0],
        },
      };

      const updated = await addMondayItem(board.id, newItem);
      setMondayBoards((prev) =>
        prev.map((b) => (b.id === board.id ? (updated as unknown as MondayBoardItem) : b))
      );
      setSyncFeedback(`Successfully synced ${newItem.name} to "${board.name}"!`);
      setTimeout(() => setSyncFeedback(null), 4500);
    } catch (err) {
      console.error(err);
      setSyncFeedback("Sync failed. Please try again.");
    } finally {
      setIsSyncing(false);
    }
  };

  // Calculate totals for BI cards
  const totalExecutionsCount =
    executions.length +
    initialBiMetrics.reduce((acc, curr) => acc + (curr.totalExecutions || 0), 0);
  const totalCostSavedCalc = (
    totalExecutionsCount * 1.25 +
    executions.reduce((acc, curr) => acc + (curr.cost || 0), 0)
  ).toFixed(2);

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 flex flex-col font-sans">
      {/* Header */}
      <header className="border-b border-slate-800 bg-slate-950 px-6 py-3.5 flex justify-between items-center sticky top-0 z-30 shadow-md">
        <div className="flex items-center space-x-3.5">
          <div className="bg-gradient-to-br from-orange-500 to-amber-600 text-white p-2 rounded-xl font-black text-lg shadow-lg shadow-orange-500/20 flex items-center justify-center w-10 h-10">
            ⚡
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h1 className="text-xl font-bold tracking-tight text-white">
                FlowForge AI
              </h1>
              <span className="text-[10px] uppercase font-semibold bg-orange-500/20 text-orange-400 border border-orange-500/30 px-2 py-0.5 rounded-full">
                n8n + Monday Hub
              </span>
            </div>
            <p className="text-xs text-slate-400">
              Autonomous Workflow Builder, Monday.com Sync & BI Engine
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-3">
          <div className="hidden sm:flex items-center space-x-2 bg-slate-900 border border-slate-800 px-3 py-1.5 rounded-lg text-xs text-slate-300">
            <Database className="w-3.5 h-3.5 text-emerald-400" />
            <span>PostgreSQL: Connected</span>
          </div>

          <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 shadow-sm shadow-emerald-500/5">
            <span className="w-2 h-2 mr-2 rounded-full bg-emerald-400 animate-pulse"></span>
            Agent Active
          </span>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar */}
        <aside className="w-64 bg-slate-950 border-r border-slate-800 p-4 flex flex-col justify-between shrink-0">
          <nav className="space-y-1.5">
            <div className="px-3 py-1 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
              Modules
            </div>

            <button
              onClick={() => setActiveTab("workflows")}
              className={`w-full flex items-center space-x-3 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all ${
                activeTab === "workflows"
                  ? "bg-orange-500/15 text-orange-400 border border-orange-500/30 shadow-sm"
                  : "text-slate-400 hover:bg-slate-900/80 hover:text-slate-200"
              }`}
            >
              <Zap className="w-4 h-4 text-orange-400 shrink-0" />
              <span>n8n Workflows</span>
            </button>

            <button
              onClick={() => setActiveTab("monday")}
              className={`w-full flex items-center space-x-3 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all ${
                activeTab === "monday"
                  ? "bg-blue-500/15 text-blue-400 border border-blue-500/30 shadow-sm"
                  : "text-slate-400 hover:bg-slate-900/80 hover:text-slate-200"
              }`}
            >
              <LayoutGrid className="w-4 h-4 text-blue-400 shrink-0" />
              <span>Monday.com Boards</span>
            </button>

            <button
              onClick={() => setActiveTab("ai")}
              className={`w-full flex items-center space-x-3 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all ${
                activeTab === "ai"
                  ? "bg-purple-500/15 text-purple-400 border border-purple-500/30 shadow-sm"
                  : "text-slate-400 hover:bg-slate-900/80 hover:text-slate-200"
              }`}
            >
              <BrainCircuit className="w-4 h-4 text-purple-400 shrink-0" />
              <span>AI OCR Playground</span>
            </button>

            <button
              onClick={() => setActiveTab("bi")}
              className={`w-full flex items-center space-x-3 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all ${
                activeTab === "bi"
                  ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 shadow-sm"
                  : "text-slate-400 hover:bg-slate-900/80 hover:text-slate-200"
              }`}
            >
              <BarChart3 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>BI Analytics</span>
            </button>

            <button
              onClick={() => setActiveTab("logs")}
              className={`w-full flex items-center space-x-3 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all ${
                activeTab === "logs"
                  ? "bg-slate-800 text-slate-100 border border-slate-700"
                  : "text-slate-400 hover:bg-slate-900/80 hover:text-slate-200"
              }`}
            >
              <Terminal className="w-4 h-4 text-slate-300 shrink-0" />
              <span>Execution Logs</span>
            </button>
          </nav>

          {/* User Info / Profile card */}
          <div className="p-3.5 bg-slate-900/70 rounded-xl border border-slate-800">
            <div className="flex items-center space-x-2.5 mb-1.5">
              <div className="w-7 h-7 rounded-full bg-gradient-to-tr from-orange-500 to-purple-600 flex items-center justify-center text-white text-xs font-bold">
                RL
              </div>
              <div>
                <p className="text-xs font-semibold text-slate-200">
                  Rachid Ait Mohand
                </p>
                <p className="text-[10px] text-slate-400">
                  Applied AI Automation Specialist
                </p>
              </div>
            </div>
            <div className="text-[10px] text-slate-500 flex items-center justify-between pt-2 border-t border-slate-800/80">
              <span>Stack: Next.js + Postgres</span>
              <span className="text-emerald-400">v0.1.0</span>
            </div>
          </div>
        </aside>

        {/* Main Content Area */}
        <main className="flex-1 overflow-y-auto p-6 md:p-8 bg-slate-900/95">
          {/* 1. WORKFLOWS TAB */}
          {activeTab === "workflows" && (
            <div className="space-y-6 max-w-7xl mx-auto">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h2 className="text-2xl font-bold tracking-tight text-white flex items-center space-x-2">
                    <Zap className="w-6 h-6 text-orange-500" />
                    <span>n8n Workflow Simulator</span>
                  </h2>
                  <p className="text-slate-400 text-sm mt-0.5">
                    Select and trigger advanced multi-step automation workflows
                    with real-time state synchronization.
                  </p>
                </div>

                <button
                  onClick={handleRunWorkflow}
                  disabled={isRunning || !selectedWorkflow}
                  className="bg-gradient-to-r from-orange-500 to-amber-600 hover:from-orange-600 hover:to-amber-700 text-white px-5 py-2.5 rounded-xl font-medium shadow-lg shadow-orange-500/25 transition-all disabled:opacity-50 flex items-center space-x-2.5 cursor-pointer shrink-0"
                >
                  {isRunning ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin text-white" />
                      <span>Executing Workflow...</span>
                    </>
                  ) : (
                    <>
                      <Play className="w-4 h-4 fill-white text-white" />
                      <span>Run Workflow</span>
                    </>
                  )}
                </button>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Workflow Selector & Details */}
                <div className="bg-slate-950 border border-slate-800 rounded-2xl p-5 space-y-4 shadow-xl">
                  <div className="flex items-center justify-between">
                    <h3 className="font-semibold text-base text-slate-200">
                      Available Workflows
                    </h3>
                    <span className="text-xs bg-slate-900 border border-slate-800 px-2 py-0.5 rounded-md text-slate-400">
                      {workflows.length} Active
                    </span>
                  </div>

                  <div className="space-y-2.5">
                    {workflows.map((wf) => (
                      <button
                        key={wf.id}
                        onClick={() => {
                          setSelectedWorkflow(wf);
                          setExecutionLogs([]);
                        }}
                        className={`w-full text-left p-4 rounded-xl border transition-all text-left cursor-pointer ${
                          selectedWorkflow?.id === wf.id
                            ? "bg-slate-900 border-orange-500/60 shadow-lg shadow-orange-500/5 ring-1 ring-orange-500/20"
                            : "bg-slate-900/40 border-slate-800 hover:border-slate-700 hover:bg-slate-900/70"
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <h4 className="font-semibold text-sm text-slate-100">
                            {wf.name}
                          </h4>
                          {selectedWorkflow?.id === wf.id && (
                            <ChevronRight className="w-4 h-4 text-orange-400" />
                          )}
                        </div>
                        <p className="text-xs text-slate-400 mt-1.5 line-clamp-2 leading-relaxed">
                          {wf.description}
                        </p>
                        <div className="mt-3 flex items-center space-x-2 text-[11px] text-slate-500">
                          <span>{(wf.nodes as any[])?.length || 0} nodes</span>
                          <span>•</span>
                          <span className="text-emerald-400">Ready</span>
                        </div>
                      </button>
                    ))}
                  </div>

                  {selectedWorkflow && (
                    <div className="mt-4 pt-4 border-t border-slate-800 text-xs text-slate-400 space-y-2">
                      <div className="flex justify-between">
                        <span className="text-slate-500">Status:</span>
                        <span className="text-emerald-400 font-medium">
                          Active & Listening
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500">Target Integration:</span>
                        <span className="text-blue-400 font-mono">
                          Monday.com API v2
                        </span>
                      </div>
                    </div>
                  )}
                </div>

                {/* Visual Node Canvas & Step Logs */}
                <div className="lg:col-span-2 bg-slate-950 border border-slate-800 rounded-2xl p-6 flex flex-col justify-between min-h-[460px] shadow-xl">
                  <div>
                    <div className="flex items-center justify-between mb-5">
                      <div>
                        <h3 className="font-semibold text-lg text-slate-200">
                          Workflow Architecture Graph
                        </h3>
                        <p className="text-xs text-slate-400">
                          {selectedWorkflow?.name}
                        </p>
                      </div>
                      <span className="text-xs font-mono bg-orange-500/10 text-orange-400 border border-orange-500/20 px-2.5 py-1 rounded-lg">
                        Auto-executing
                      </span>
                    </div>

                    {/* Nodes flow */}
                    <div className="py-6 overflow-x-auto">
                      <div className="flex items-center min-w-max space-x-3 justify-start p-2">
                        {selectedWorkflow &&
                          ((selectedWorkflow.nodes as NodeItem[]) || []).map(
                            (node, idx, arr) => (
                              <React.Fragment key={node.id}>
                                <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl w-48 text-center shadow-lg relative group hover:border-orange-500/50 hover:shadow-orange-500/10 transition-all">
                                  <div className="text-[10px] font-bold text-orange-400 uppercase tracking-widest mb-1.5 flex items-center justify-center space-x-1">
                                    <span>{node.type}</span>
                                  </div>
                                  <div className="font-semibold text-sm text-slate-200 line-clamp-1">
                                    {node.name}
                                  </div>
                                  <div className="text-[10px] font-mono text-slate-500 mt-2 truncate bg-slate-950/60 py-1 px-1.5 rounded border border-slate-800/60">
                                    {JSON.stringify(node.config)}
                                  </div>
                                </div>
                                {idx < arr.length - 1 && (
                                  <div className="text-orange-500/60 text-lg font-bold flex items-center justify-center px-1">
                                    <ArrowRight className="w-5 h-5 text-orange-400/80 animate-pulse" />
                                  </div>
                                )}
                              </React.Fragment>
                            )
                          )}
                      </div>
                    </div>
                  </div>

                  {/* Live Execution Logs */}
                  <div className="mt-6 bg-slate-900/90 border border-slate-800 rounded-xl p-4 font-mono text-xs shadow-inner">
                    <div className="text-slate-400 border-b border-slate-800 pb-2 mb-2.5 flex justify-between items-center">
                      <div className="flex items-center space-x-2">
                        <Terminal className="w-3.5 h-3.5 text-orange-400" />
                        <span className="font-semibold text-slate-300">
                          Step-by-Step Execution Logs
                        </span>
                      </div>
                      <span className="inline-flex items-center text-[10px] text-orange-400 bg-orange-500/10 px-2 py-0.5 rounded border border-orange-500/20">
                        <span className="w-1.5 h-1.5 mr-1.5 rounded-full bg-orange-400 animate-ping"></span>
                        Live
                      </span>
                    </div>

                    <div className="max-h-48 overflow-y-auto space-y-2 pr-1">
                      {executionLogs.length === 0 ? (
                        <div className="text-slate-500 text-center py-4 italic">
                          No active execution. Click &quot;Run Workflow&quot; to
                          start simulation.
                        </div>
                      ) : (
                        executionLogs.map((log, idx) => (
                          <div
                            key={idx}
                            className="flex items-start space-x-2.5 text-[11px] leading-relaxed"
                          >
                            <span className="text-slate-500 shrink-0">
                              [
                              {log.timestamp?.includes("T")
                                ? log.timestamp.split("T")[1].slice(0, 8)
                                : "00:00:00"}
                              ]
                            </span>
                            <span className="text-blue-400 font-semibold shrink-0">
                              [{log.nodeName}]
                            </span>
                            <span
                              className={`shrink-0 font-bold ${
                                log.status === "SUCCESS"
                                  ? "text-emerald-400"
                                  : log.status === "RUNNING"
                                  ? "text-amber-400"
                                  : "text-red-400"
                              }`}
                            >
                              {log.status}:
                            </span>
                            <span className="text-slate-300 break-all">
                              {log.message}
                            </span>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* 2. MONDAY.COM BOARDS TAB */}
          {activeTab === "monday" && (
            <div className="space-y-6 max-w-7xl mx-auto">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h2 className="text-2xl font-bold tracking-tight text-white flex items-center space-x-2">
                    <LayoutGrid className="w-6 h-6 text-blue-400" />
                    <span>Monday.com Workspace Simulator</span>
                  </h2>
                  <p className="text-slate-400 text-sm mt-0.5">
                    Real-time replica of Monday.com boards automatically updated
                    via n8n workflows and AI extractions.
                  </p>
                </div>

                <div className="flex items-center space-x-3">
                  <button
                    onClick={async () => {
                      const res = await fetch("/api/monday/boards");
                      if (res.ok) {
                        setMondayBoards(await res.json());
                      }
                    }}
                    className="bg-slate-800 hover:bg-slate-700 text-slate-200 px-3.5 py-2 rounded-xl text-xs font-medium border border-slate-700 flex items-center space-x-2 transition-all cursor-pointer"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    <span>Refresh Boards</span>
                  </button>
                </div>
              </div>

              <div className="space-y-8">
                {mondayBoards.map((board) => (
                  <div
                    key={board.id}
                    className="bg-slate-950 border border-slate-800 rounded-2xl overflow-hidden shadow-xl"
                  >
                    <div className="bg-slate-900/90 px-6 py-4 border-b border-slate-800 flex justify-between items-center">
                      <div className="flex items-center space-x-3">
                        <span className="w-3 h-3 rounded-full bg-blue-500 shadow-sm shadow-blue-500/50"></span>
                        <h3 className="font-bold text-lg text-slate-100">
                          {board.name}
                        </h3>
                        <span className="text-xs text-blue-400 bg-blue-500/10 border border-blue-500/20 px-2 py-0.5 rounded-md">
                          Live Sync
                        </span>
                      </div>
                      <span className="text-xs font-mono text-slate-400 bg-slate-900 border border-slate-800 px-2.5 py-1 rounded-lg">
                        {(board.items as any[])?.length || 0} Items
                      </span>
                    </div>

                    <div className="overflow-x-auto">
                      <table className="w-full text-left border-collapse">
                        <thead>
                          <tr className="border-b border-slate-800 bg-slate-900/40 text-slate-400 text-xs font-semibold uppercase tracking-wider">
                            <th className="px-6 py-3.5">Item Name</th>
                            {((board.columns as MondayColumn[]) || []).map(
                              (col) => (
                                <th key={col.id} className="px-6 py-3.5">
                                  {col.title}
                                </th>
                              )
                            )}
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800/60 text-sm">
                          {((board.items as MondayItem[]) || []).map((item) => (
                            <tr
                              key={item.id}
                              className="hover:bg-slate-900/50 transition-colors"
                            >
                              <td className="px-6 py-3.5 font-medium text-slate-200">
                                {item.name}
                              </td>
                              {((board.columns as MondayColumn[]) || []).map(
                                (col) => {
                                  const val =
                                    item.columnValues?.[col.id] ??
                                    item.columnValues?.[col.title.toLowerCase()] ??
                                    "-";
                                  return (
                                    <td key={col.id} className="px-6 py-3.5">
                                      {col.type === "status" ? (
                                        <span
                                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                                            val === "Approved" ||
                                            val === "Enriched"
                                              ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/30"
                                              : val === "Pending Review" ||
                                                val === "Pending"
                                              ? "bg-amber-500/15 text-amber-400 border border-amber-500/30"
                                              : "bg-blue-500/15 text-blue-400 border border-blue-500/30"
                                          }`}
                                        >
                                          {val}
                                        </span>
                                      ) : col.type === "numeric" ? (
                                        <span className="font-mono text-slate-300">
                                          {typeof val === "number"
                                            ? `$${val.toLocaleString(undefined, {
                                                minimumFractionDigits: 2,
                                              })}`
                                            : val}
                                        </span>
                                      ) : (
                                        <span className="text-slate-300">
                                          {String(val)}
                                        </span>
                                      )}
                                    </td>
                                  );
                                }
                              )}
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

          {/* 3. AI OCR PLAYGROUND TAB */}
          {activeTab === "ai" && (
            <div className="space-y-6 max-w-7xl mx-auto">
              <div>
                <h2 className="text-2xl font-bold tracking-tight text-white flex items-center space-x-2">
                  <BrainCircuit className="w-6 h-6 text-purple-400" />
                  <span>AI OCR & Structured Data Extraction</span>
                </h2>
                <p className="text-slate-400 text-sm mt-0.5">
                  Test prompt engineering and extract verified JSON schemas from
                  unstructured invoices, contracts, and emails.
                </p>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Input Panel */}
                <div className="bg-slate-950 border border-slate-800 rounded-2xl p-6 space-y-4 flex flex-col shadow-xl">
                  <div className="flex items-center justify-between">
                    <h3 className="font-semibold text-base text-slate-200">
                      Raw Document Input
                    </h3>
                    <button
                      onClick={() =>
                        setAiText(`INVOICE #INV-${Math.floor(
                          Math.random() * 90000 + 10000
                        )}
Vendor: Amazon Web Services (AWS)
Date: ${new Date().toISOString().split("T")[0]}
Total Amount Due: $${(Math.random() * 1500 + 350).toFixed(2)}
Terms: Due on receipt
Support: support@amazon.com`)
                      }
                      className="text-xs text-purple-400 hover:text-purple-300 flex items-center space-x-1 cursor-pointer"
                    >
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>Load Sample Invoice</span>
                    </button>
                  </div>

                  <textarea
                    value={aiText}
                    onChange={(e) => setAiText(e.target.value)}
                    rows={10}
                    className="w-full flex-1 bg-slate-900 border border-slate-800 rounded-xl p-4 font-mono text-xs sm:text-sm text-slate-200 focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 leading-relaxed transition-all"
                    placeholder="Paste unformatted invoice, email body, or receipt text..."
                  />

                  <button
                    onClick={handleExtract}
                    disabled={isExtracting || !aiText.trim()}
                    className="w-full bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white py-3.5 rounded-xl font-medium shadow-lg shadow-purple-600/25 transition-all disabled:opacity-50 flex items-center justify-center space-x-2.5 cursor-pointer"
                  >
                    {isExtracting ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin text-white" />
                        <span>Running LLM Extraction (GPT-4o Mode)...</span>
                      </>
                    ) : (
                      <>
                        <BrainCircuit className="w-4 h-4" />
                        <span>Extract Structured JSON</span>
                      </>
                    )}
                  </button>
                </div>

                {/* Output Panel */}
                <div className="bg-slate-950 border border-slate-800 rounded-2xl p-6 flex flex-col justify-between shadow-xl">
                  <div>
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="font-semibold text-base text-slate-200">
                        Structured Output (JSON Mode)
                      </h3>
                      {aiResult && (
                        <span className="text-xs bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2 py-0.5 rounded-md font-mono">
                          Schema Validated
                        </span>
                      )}
                    </div>

                    {aiResult ? (
                      <pre className="bg-slate-900 border border-slate-800 rounded-xl p-5 font-mono text-xs sm:text-sm text-emerald-400 overflow-x-auto shadow-inner">
                        {JSON.stringify(aiResult, null, 2)}
                      </pre>
                    ) : (
                      <div className="border-2 border-dashed border-slate-800 rounded-xl p-16 text-center text-slate-500 flex flex-col items-center justify-center space-y-2">
                        <BrainCircuit className="w-8 h-8 text-slate-600" />
                        <p className="text-sm">
                          Run extraction to see structured JSON output.
                        </p>
                      </div>
                    )}
                  </div>

                  {aiResult && (
                    <div className="mt-6 p-4 bg-purple-500/10 border border-purple-500/25 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-md">
                      <div>
                        <h4 className="font-semibold text-sm text-purple-300 flex items-center space-x-1.5">
                          <CheckCircle2 className="w-4 h-4 text-purple-400" />
                          <span>Ready for Monday.com Sync</span>
                        </h4>
                        <p className="text-xs text-slate-400 mt-0.5">
                          Directly dispatch this structured payload to your
                          Billing Board.
                        </p>
                      </div>
                      <button
                        onClick={handleSyncToMonday}
                        disabled={isSyncing}
                        className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2.5 rounded-xl text-xs font-semibold shadow-md shadow-purple-600/30 transition-all flex items-center justify-center space-x-2 cursor-pointer shrink-0 disabled:opacity-50"
                      >
                        {isSyncing ? (
                          <>
                            <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                            <span>Syncing...</span>
                          </>
                        ) : (
                          <>
                            <Send className="w-3.5 h-3.5" />
                            <span>Sync to Monday.com</span>
                          </>
                        )}
                      </button>
                    </div>
                  )}

                  {syncFeedback && (
                    <div className="mt-3 p-3 rounded-lg bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-xs font-medium flex items-center space-x-2">
                      <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                      <span>{syncFeedback}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* 4. BI ANALYTICS TAB */}
          {activeTab === "bi" && (
            <div className="space-y-6 max-w-7xl mx-auto">
              <div>
                <h2 className="text-2xl font-bold tracking-tight text-white flex items-center space-x-2">
                  <BarChart3 className="w-6 h-6 text-emerald-400" />
                  <span>BI Automation Analytics & ROI</span>
                </h2>
                <p className="text-slate-400 text-sm mt-0.5">
                  Business intelligence dashboard tracking automation volume,
                  cost savings, and SLA performance.
                </p>
              </div>

              {/* KPI Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-slate-950 border border-slate-800 p-5 rounded-2xl shadow-xl">
                  <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center justify-between">
                    <span>Total Executions</span>
                    <Zap className="w-4 h-4 text-orange-400" />
                  </div>
                  <div className="text-2xl font-black mt-2 text-white font-mono">
                    {totalExecutionsCount.toLocaleString()}
                  </div>
                  <div className="text-xs text-emerald-400 mt-1 flex items-center space-x-1">
                    <span>↑ 14.8%</span>
                    <span className="text-slate-500">vs previous period</span>
                  </div>
                </div>

                <div className="bg-slate-950 border border-slate-800 p-5 rounded-2xl shadow-xl">
                  <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center justify-between">
                    <span>Success Rate</span>
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  </div>
                  <div className="text-2xl font-black mt-2 text-emerald-400 font-mono">
                    99.4%
                  </div>
                  <div className="text-xs text-slate-400 mt-1">
                    Zero fatal exceptions
                  </div>
                </div>

                <div className="bg-slate-950 border border-slate-800 p-5 rounded-2xl shadow-xl">
                  <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center justify-between">
                    <span>Cost Saved</span>
                    <Coins className="w-4 h-4 text-blue-400" />
                  </div>
                  <div className="text-2xl font-black mt-2 text-blue-400 font-mono">
                    ${parseFloat(totalCostSavedCalc).toLocaleString()}
                  </div>
                  <div className="text-xs text-slate-400 mt-1">
                    Calculated @ $1.25 / manual op
                  </div>
                </div>

                <div className="bg-slate-950 border border-slate-800 p-5 rounded-2xl shadow-xl">
                  <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center justify-between">
                    <span>Data Throughput</span>
                    <Database className="w-4 h-4 text-purple-400" />
                  </div>
                  <div className="text-2xl font-black mt-2 text-purple-300 font-mono">
                    8,492 records
                  </div>
                  <div className="text-xs text-slate-400 mt-1">
                    Across 4 integrated endpoints
                  </div>
                </div>
              </div>

              {/* Charts Grid */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Volume & Cost Chart */}
                <div className="bg-slate-950 border border-slate-800 p-6 rounded-2xl shadow-xl flex flex-col justify-between">
                  <div className="mb-4 flex items-center justify-between">
                    <div>
                      <h3 className="font-semibold text-base text-slate-200">
                        Automation Volume & Throughput
                      </h3>
                      <p className="text-xs text-slate-400">
                        Daily executions over the last 15 days
                      </p>
                    </div>
                  </div>

                  <div className="h-72 w-full">
                    {mounted ? (
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart
                          data={initialBiMetrics}
                          margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
                        >
                          <defs>
                            <linearGradient
                              id="colorExec"
                              x1="0"
                              y1="0"
                              x2="0"
                              y2="1"
                            >
                              <stop
                                offset="5%"
                                stopColor="#f97316"
                                stopOpacity={0.4}
                              />
                              <stop
                                offset="95%"
                                stopColor="#f97316"
                                stopOpacity={0}
                              />
                            </linearGradient>
                          </defs>
                          <CartesianGrid
                            strokeDasharray="3 3"
                            stroke="#1e293b"
                          />
                          <XAxis
                            dataKey="date"
                            tickFormatter={(str) => {
                              try {
                                return new Date(str).toLocaleDateString(
                                  "en-US",
                                  { month: "short", day: "numeric" }
                                );
                              } catch {
                                return "";
                              }
                            }}
                            stroke="#64748b"
                            tick={{ fontSize: 11 }}
                          />
                          <YAxis stroke="#64748b" tick={{ fontSize: 11 }} />
                          <Tooltip
                            contentStyle={{
                              backgroundColor: "#0f172a",
                              borderColor: "#334155",
                              borderRadius: "0.75rem",
                              fontSize: "12px",
                            }}
                          />
                          <Area
                            type="monotone"
                            dataKey="totalExecutions"
                            stroke="#f97316"
                            strokeWidth={2}
                            fillOpacity={1}
                            fill="url(#colorExec)"
                            name="Executions"
                          />
                        </AreaChart>
                      </ResponsiveContainer>
                    ) : (
                      <div className="h-full flex items-center justify-center text-slate-600">
                        Loading charts...
                      </div>
                    )}
                  </div>
                </div>

                {/* Success Rate Chart */}
                <div className="bg-slate-950 border border-slate-800 p-6 rounded-2xl shadow-xl flex flex-col justify-between">
                  <div className="mb-4 flex items-center justify-between">
                    <div>
                      <h3 className="font-semibold text-base text-slate-200">
                        SLA & Success Rate Trend
                      </h3>
                      <p className="text-xs text-slate-400">
                        Reliability index across all triggers
                      </p>
                    </div>
                  </div>

                  <div className="h-72 w-full">
                    {mounted ? (
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart
                          data={initialBiMetrics}
                          margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
                        >
                          <CartesianGrid
                            strokeDasharray="3 3"
                            stroke="#1e293b"
                          />
                          <XAxis
                            dataKey="date"
                            tickFormatter={(str) => {
                              try {
                                return new Date(str).toLocaleDateString(
                                  "en-US",
                                  { month: "short", day: "numeric" }
                                );
                              } catch {
                                return "";
                              }
                            }}
                            stroke="#64748b"
                            tick={{ fontSize: 11 }}
                          />
                          <YAxis
                            domain={[90, 100]}
                            stroke="#64748b"
                            tick={{ fontSize: 11 }}
                          />
                          <Tooltip
                            contentStyle={{
                              backgroundColor: "#0f172a",
                              borderColor: "#334155",
                              borderRadius: "0.75rem",
                              fontSize: "12px",
                            }}
                          />
                          <Line
                            type="monotone"
                            dataKey="successRate"
                            stroke="#10b981"
                            strokeWidth={2.5}
                            dot={{ fill: "#10b981", r: 3 }}
                            name="Success Rate (%)"
                          />
                        </LineChart>
                      </ResponsiveContainer>
                    ) : (
                      <div className="h-full flex items-center justify-center text-slate-600">
                        Loading charts...
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* 5. EXECUTION LOGS TAB */}
          {activeTab === "logs" && (
            <div className="space-y-6 max-w-7xl mx-auto">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h2 className="text-2xl font-bold tracking-tight text-white flex items-center space-x-2">
                    <Terminal className="w-6 h-6 text-slate-300" />
                    <span>System Execution Logs & Audit Trail</span>
                  </h2>
                  <p className="text-slate-400 text-sm mt-0.5">
                    Immutable audit log of all automated workflow executions,
                    triggers, and AI model costs.
                  </p>
                </div>
              </div>

              <div className="bg-slate-950 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-slate-800 bg-slate-900/40 text-slate-400 text-xs font-semibold uppercase tracking-wider">
                        <th className="px-6 py-3.5">Timestamp</th>
                        <th className="px-6 py-3.5">Workflow</th>
                        <th className="px-6 py-3.5">Trigger</th>
                        <th className="px-6 py-3.5">Status</th>
                        <th className="px-6 py-3.5">Duration</th>
                        <th className="px-6 py-3.5">Simulated Cost</th>
                        <th className="px-6 py-3.5 text-right">Details</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60 text-sm font-mono">
                      {executions.map((exec) => (
                        <tr
                          key={exec.id}
                          className="hover:bg-slate-900/40 transition-colors"
                        >
                          <td className="px-6 py-3.5 text-slate-400 text-xs">
                            {exec.createdAt
                              ? new Date(exec.createdAt).toLocaleString()
                              : "Recent"}
                          </td>
                          <td className="px-6 py-3.5 text-slate-200 font-sans font-medium text-sm">
                            {workflows.find((w) => w.id === exec.workflowId)
                              ?.name || "Workflow Pipeline"}
                          </td>
                          <td className="px-6 py-3.5 text-slate-300 text-xs">
                            {exec.triggerType}
                          </td>
                          <td className="px-6 py-3.5">
                            <span
                              className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                                exec.status === "SUCCESS"
                                  ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/30"
                                  : "bg-red-500/15 text-red-400 border border-red-500/30"
                              }`}
                            >
                              {exec.status}
                            </span>
                          </td>
                          <td className="px-6 py-3.5 text-slate-300 text-xs">
                            {exec.durationMs}ms
                          </td>
                          <td className="px-6 py-3.5 text-slate-300 text-xs">
                            ${(exec.cost || 0).toFixed(4)}
                          </td>
                          <td className="px-6 py-3.5 text-right font-sans">
                            <button
                              onClick={() => setSelectedLogExecution(exec)}
                              className="text-xs text-orange-400 hover:text-orange-300 font-medium underline underline-offset-4 cursor-pointer"
                            >
                              View Steps
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Log Details Modal */}
              {selectedLogExecution && (
                <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                  <div className="bg-slate-950 border border-slate-800 rounded-2xl max-w-2xl w-full p-6 space-y-4 shadow-2xl">
                    <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                      <div>
                        <h3 className="font-bold text-lg text-white">
                          Execution Log Details
                        </h3>
                        <p className="text-xs font-mono text-slate-400">
                          ID: {selectedLogExecution.id}
                        </p>
                      </div>
                      <button
                        onClick={() => setSelectedLogExecution(null)}
                        className="text-slate-400 hover:text-white text-lg font-bold px-2 cursor-pointer"
                      >
                        ✕
                      </button>
                    </div>

                    <div className="space-y-3 font-mono text-xs max-h-96 overflow-y-auto pr-1">
                      <div className="bg-slate-900 p-3 rounded-lg border border-slate-800">
                        <span className="text-slate-500 block mb-1">
                          Output Payload:
                        </span>
                        <pre className="text-emerald-400 text-[11px] overflow-x-auto">
                          {JSON.stringify(
                            selectedLogExecution.output ||
                              selectedLogExecution.payload,
                            null,
                            2
                          )}
                        </pre>
                      </div>

                      <div className="space-y-1.5">
                        <span className="text-slate-400 block font-semibold">
                          Node Trace:
                        </span>
                        {((selectedLogExecution.logs as ExecutionLogItem[]) || []).map(
                          (log, idx) => (
                            <div
                              key={idx}
                              className="bg-slate-900/60 p-2.5 rounded-lg border border-slate-800/80 text-[11px]"
                            >
                              <div className="flex justify-between items-center text-slate-400 mb-1">
                                <span className="text-blue-400 font-bold">
                                  [{log.nodeName}]
                                </span>
                                <span
                                  className={
                                    log.status === "SUCCESS"
                                      ? "text-emerald-400 font-semibold"
                                      : "text-amber-400 font-semibold"
                                  }
                                >
                                  {log.status}
                                </span>
                              </div>
                              <p className="text-slate-300">{log.message}</p>
                            </div>
                          )
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
