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
  ArrowRight,
  RefreshCw,
  Coins,
  Send,
  Sparkles,
  ChevronRight,
  Database,
  Sun,
  Moon,
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
  const [theme, setTheme] = useState<"white" | "dark">("white");
  const isWhite = theme === "white";

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
    try {
      const savedTheme = localStorage.getItem("flowforge_theme");
      const active =
        savedTheme === "dark" || savedTheme === "white" ? savedTheme : "white";
      setTheme(active);
      if (active === "dark") {
        document.documentElement.classList.add("dark");
      } else {
        document.documentElement.classList.remove("dark");
      }
    } catch (e) {
      console.error(e);
    }
  }, []);

  const toggleTheme = () => {
    const nextTheme = theme === "white" ? "dark" : "white";
    setTheme(nextTheme);
    try {
      localStorage.setItem("flowforge_theme", nextTheme);
      if (nextTheme === "dark") {
        document.documentElement.classList.add("dark");
      } else {
        document.documentElement.classList.remove("dark");
      }
    } catch (e) {
      console.error(e);
    }
  };

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
        prev.map((b) =>
          b.id === board.id ? (updated as unknown as MondayBoardItem) : b
        )
      );
      setSyncFeedback(
        `Successfully synced ${newItem.name} to "${board.name}"!`
      );
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
    <div
      className={`min-h-screen flex flex-col font-sans transition-colors duration-200 ${
        isWhite ? "bg-slate-50 text-slate-900" : "bg-slate-900 text-slate-100"
      }`}
    >
      {/* Header */}
      <header
        className={`border-b px-6 py-3.5 flex justify-between items-center sticky top-0 z-30 transition-colors duration-200 ${
          isWhite
            ? "bg-white border-slate-200 shadow-sm"
            : "border-slate-800 bg-slate-950 shadow-md"
        }`}
      >
        <div className="flex items-center space-x-3.5">
          <div className="bg-gradient-to-br from-orange-500 to-amber-600 text-white p-2 rounded-xl font-black text-lg shadow-lg shadow-orange-500/20 flex items-center justify-center w-10 h-10 shrink-0">
            ⚡
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h1
                className={`text-xl font-bold tracking-tight ${
                  isWhite ? "text-slate-900" : "text-white"
                }`}
              >
                FlowForge AI
              </h1>
              <span className="text-[10px] uppercase font-semibold bg-orange-500/15 text-orange-500 border border-orange-500/30 px-2 py-0.5 rounded-full">
                n8n + Monday Hub
              </span>
            </div>
            <p
              className={`text-xs ${
                isWhite ? "text-slate-500" : "text-slate-400"
              }`}
            >
              Autonomous Workflow Builder, Monday.com Sync & BI Engine
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-3">
          {/* Database Connected Badge */}
          <div
            className={`hidden sm:flex items-center space-x-2 border px-3 py-1.5 rounded-lg text-xs ${
              isWhite
                ? "bg-slate-100 border-slate-200 text-slate-700"
                : "bg-slate-900 border-slate-800 text-slate-300"
            }`}
          >
            <Database className="w-3.5 h-3.5 text-emerald-500" />
            <span>PostgreSQL: Connected</span>
          </div>

          {/* Theme Toggle Button */}
          <button
            onClick={toggleTheme}
            className={`flex items-center space-x-2 px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all cursor-pointer shadow-sm ${
              isWhite
                ? "bg-slate-100 hover:bg-slate-200 border-slate-300 text-slate-800"
                : "bg-slate-900 hover:bg-slate-800 border-slate-700 text-slate-200"
            }`}
            title={isWhite ? "Switch to Dark Mode" : "Switch to White Mode"}
          >
            {isWhite ? (
              <>
                <Moon className="w-3.5 h-3.5 text-indigo-600" />
                <span>Dark Mode</span>
              </>
            ) : (
              <>
                <Sun className="w-3.5 h-3.5 text-amber-400" />
                <span>White Mode</span>
              </>
            )}
          </button>

          {/* Agent Status Badge */}
          <span
            className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium border shadow-sm ${
              isWhite
                ? "bg-emerald-50 text-emerald-700 border-emerald-200 shadow-emerald-500/10"
                : "bg-emerald-500/10 text-emerald-400 border-emerald-500/20 shadow-emerald-500/5"
            }`}
          >
            <span className="w-2 h-2 mr-2 rounded-full bg-emerald-500 animate-pulse"></span>
            Agent Active
          </span>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar */}
        <aside
          className={`w-64 border-r p-4 flex flex-col justify-between shrink-0 transition-colors duration-200 ${
            isWhite ? "bg-white border-slate-200" : "bg-slate-950 border-slate-800"
          }`}
        >
          <nav className="space-y-1.5">
            <div
              className={`px-3 py-1 text-[11px] font-semibold uppercase tracking-wider ${
                isWhite ? "text-slate-400" : "text-slate-500"
              }`}
            >
              Modules
            </div>

            <button
              onClick={() => setActiveTab("workflows")}
              className={`w-full flex items-center space-x-3 px-3.5 py-2.5 rounded-xl text-sm transition-all cursor-pointer ${
                activeTab === "workflows"
                  ? isWhite
                    ? "bg-orange-50 text-orange-700 border border-orange-200 font-semibold shadow-sm"
                    : "bg-orange-500/15 text-orange-400 border border-orange-500/30 font-medium"
                  : isWhite
                  ? "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                  : "text-slate-400 hover:bg-slate-900/80 hover:text-slate-200"
              }`}
            >
              <Zap className="w-4 h-4 text-orange-500 shrink-0" />
              <span>n8n Workflows</span>
            </button>

            <button
              onClick={() => setActiveTab("monday")}
              className={`w-full flex items-center space-x-3 px-3.5 py-2.5 rounded-xl text-sm transition-all cursor-pointer ${
                activeTab === "monday"
                  ? isWhite
                    ? "bg-blue-50 text-blue-700 border border-blue-200 font-semibold shadow-sm"
                    : "bg-blue-500/15 text-blue-400 border border-blue-500/30 font-medium"
                  : isWhite
                  ? "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                  : "text-slate-400 hover:bg-slate-900/80 hover:text-slate-200"
              }`}
            >
              <LayoutGrid className="w-4 h-4 text-blue-500 shrink-0" />
              <span>Monday.com Boards</span>
            </button>

            <button
              onClick={() => setActiveTab("ai")}
              className={`w-full flex items-center space-x-3 px-3.5 py-2.5 rounded-xl text-sm transition-all cursor-pointer ${
                activeTab === "ai"
                  ? isWhite
                    ? "bg-purple-50 text-purple-700 border border-purple-200 font-semibold shadow-sm"
                    : "bg-purple-500/15 text-purple-400 border border-purple-500/30 font-medium"
                  : isWhite
                  ? "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                  : "text-slate-400 hover:bg-slate-900/80 hover:text-slate-200"
              }`}
            >
              <BrainCircuit className="w-4 h-4 text-purple-500 shrink-0" />
              <span>AI OCR Playground</span>
            </button>

            <button
              onClick={() => setActiveTab("bi")}
              className={`w-full flex items-center space-x-3 px-3.5 py-2.5 rounded-xl text-sm transition-all cursor-pointer ${
                activeTab === "bi"
                  ? isWhite
                    ? "bg-emerald-50 text-emerald-700 border border-emerald-200 font-semibold shadow-sm"
                    : "bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 font-medium"
                  : isWhite
                  ? "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                  : "text-slate-400 hover:bg-slate-900/80 hover:text-slate-200"
              }`}
            >
              <BarChart3 className="w-4 h-4 text-emerald-500 shrink-0" />
              <span>BI Analytics</span>
            </button>

            <button
              onClick={() => setActiveTab("logs")}
              className={`w-full flex items-center space-x-3 px-3.5 py-2.5 rounded-xl text-sm transition-all cursor-pointer ${
                activeTab === "logs"
                  ? isWhite
                    ? "bg-slate-100 text-slate-900 border border-slate-300 font-semibold shadow-sm"
                    : "bg-slate-800 text-slate-100 border border-slate-700 font-medium"
                  : isWhite
                  ? "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                  : "text-slate-400 hover:bg-slate-900/80 hover:text-slate-200"
              }`}
            >
              <Terminal
                className={`w-4 h-4 shrink-0 ${
                  isWhite ? "text-slate-700" : "text-slate-300"
                }`}
              />
              <span>Execution Logs</span>
            </button>
          </nav>

          {/* User Info / Profile card */}
          <div
            className={`p-3.5 rounded-xl border transition-colors ${
              isWhite
                ? "bg-slate-50/90 border-slate-200 shadow-sm"
                : "bg-slate-900/70 border-slate-800"
            }`}
          >
            <div className="flex items-center space-x-2.5 mb-1.5">
              <div className="w-7 h-7 rounded-full bg-gradient-to-tr from-orange-500 to-purple-600 flex items-center justify-center text-white text-xs font-bold shadow-sm">
                RL
              </div>
              <div>
                <p
                  className={`text-xs font-semibold ${
                    isWhite ? "text-slate-800" : "text-slate-200"
                  }`}
                >
                  Rachid Ait Mohand
                </p>
                <p
                  className={`text-[10px] ${
                    isWhite ? "text-slate-500" : "text-slate-400"
                  }`}
                >
                  Applied AI Automation Specialist
                </p>
              </div>
            </div>
            <div
              className={`text-[10px] flex items-center justify-between pt-2 border-t ${
                isWhite
                  ? "text-slate-400 border-slate-200"
                  : "text-slate-500 border-slate-800/80"
              }`}
            >
              <span>Next.js + PostgreSQL</span>
              <span className="text-emerald-500 font-semibold">v0.1.0</span>
            </div>
          </div>
        </aside>

        {/* Main Content Area */}
        <main
          className={`flex-1 overflow-y-auto p-6 md:p-8 transition-colors duration-200 ${
            isWhite ? "bg-slate-100/70" : "bg-slate-900/95"
          }`}
        >
          {/* 1. WORKFLOWS TAB */}
          {activeTab === "workflows" && (
            <div className="space-y-6 max-w-7xl mx-auto">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h2
                    className={`text-2xl font-bold tracking-tight flex items-center space-x-2 ${
                      isWhite ? "text-slate-900" : "text-white"
                    }`}
                  >
                    <Zap className="w-6 h-6 text-orange-500" />
                    <span>n8n Workflow Simulator</span>
                  </h2>
                  <p
                    className={`text-sm mt-0.5 ${
                      isWhite ? "text-slate-600" : "text-slate-400"
                    }`}
                  >
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
                <div
                  className={`border rounded-2xl p-5 space-y-4 shadow-sm transition-colors ${
                    isWhite
                      ? "bg-white border-slate-200"
                      : "bg-slate-950 border-slate-800 shadow-xl"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <h3
                      className={`font-semibold text-base ${
                        isWhite ? "text-slate-900" : "text-slate-200"
                      }`}
                    >
                      Available Workflows
                    </h3>
                    <span
                      className={`text-xs border px-2 py-0.5 rounded-md ${
                        isWhite
                          ? "bg-slate-100 border-slate-200 text-slate-600"
                          : "bg-slate-900 border-slate-800 text-slate-400"
                      }`}
                    >
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
                        className={`w-full text-left p-4 rounded-xl border transition-all cursor-pointer ${
                          selectedWorkflow?.id === wf.id
                            ? isWhite
                              ? "bg-orange-50/80 border-orange-300 ring-1 ring-orange-200 shadow-sm"
                              : "bg-slate-900 border-orange-500/60 shadow-lg shadow-orange-500/5 ring-1 ring-orange-500/20"
                            : isWhite
                            ? "bg-slate-50/60 border-slate-200 hover:border-slate-300 hover:bg-slate-100/60"
                            : "bg-slate-900/40 border-slate-800 hover:border-slate-700 hover:bg-slate-900/70"
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <h4
                            className={`font-semibold text-sm ${
                              isWhite ? "text-slate-900" : "text-slate-100"
                            }`}
                          >
                            {wf.name}
                          </h4>
                          {selectedWorkflow?.id === wf.id && (
                            <ChevronRight className="w-4 h-4 text-orange-500" />
                          )}
                        </div>
                        <p
                          className={`text-xs mt-1.5 line-clamp-2 leading-relaxed ${
                            isWhite ? "text-slate-500" : "text-slate-400"
                          }`}
                        >
                          {wf.description}
                        </p>
                        <div
                          className={`mt-3 flex items-center space-x-2 text-[11px] ${
                            isWhite ? "text-slate-400" : "text-slate-500"
                          }`}
                        >
                          <span>{(wf.nodes as any[])?.length || 0} nodes</span>
                          <span>•</span>
                          <span className="text-emerald-500 font-medium">Ready</span>
                        </div>
                      </button>
                    ))}
                  </div>

                  {selectedWorkflow && (
                    <div
                      className={`mt-4 pt-4 border-t text-xs space-y-2 ${
                        isWhite
                          ? "border-slate-200 text-slate-600"
                          : "border-slate-800 text-slate-400"
                      }`}
                    >
                      <div className="flex justify-between">
                        <span
                          className={isWhite ? "text-slate-400" : "text-slate-500"}
                        >
                          Status:
                        </span>
                        <span className="text-emerald-500 font-medium">
                          Active & Listening
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span
                          className={isWhite ? "text-slate-400" : "text-slate-500"}
                        >
                          Target Integration:
                        </span>
                        <span className="text-blue-500 font-mono font-medium">
                          Monday.com API v2
                        </span>
                      </div>
                    </div>
                  )}
                </div>

                {/* Visual Node Canvas & Step Logs */}
                <div
                  className={`border rounded-2xl p-6 flex flex-col justify-between min-h-[460px] shadow-sm transition-colors ${
                    isWhite
                      ? "bg-white border-slate-200"
                      : "bg-slate-950 border-slate-800 shadow-xl"
                  }`}
                >
                  <div>
                    <div className="flex items-center justify-between mb-5">
                      <div>
                        <h3
                          className={`font-semibold text-lg ${
                            isWhite ? "text-slate-900" : "text-slate-200"
                          }`}
                        >
                          Workflow Architecture Graph
                        </h3>
                        <p
                          className={`text-xs ${
                            isWhite ? "text-slate-500" : "text-slate-400"
                          }`}
                        >
                          {selectedWorkflow?.name}
                        </p>
                      </div>
                      <span
                        className={`text-xs font-mono px-2.5 py-1 rounded-lg font-semibold ${
                          isWhite
                            ? "bg-orange-50 text-orange-700 border border-orange-200"
                            : "bg-orange-500/10 text-orange-400 border border-orange-500/20"
                        }`}
                      >
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
                                <div
                                  className={`p-4 rounded-xl w-48 text-center shadow-sm relative group border transition-all ${
                                    isWhite
                                      ? "bg-slate-50 border-slate-200 hover:border-orange-400 hover:shadow-md"
                                      : "bg-slate-900 border-slate-800 hover:border-orange-500/50 hover:shadow-orange-500/10"
                                  }`}
                                >
                                  <div className="text-[10px] font-bold text-orange-500 uppercase tracking-widest mb-1.5 flex items-center justify-center space-x-1">
                                    <span>{node.type}</span>
                                  </div>
                                  <div
                                    className={`font-semibold text-sm line-clamp-1 ${
                                      isWhite
                                        ? "text-slate-900"
                                        : "text-slate-200"
                                    }`}
                                  >
                                    {node.name}
                                  </div>
                                  <div
                                    className={`text-[10px] font-mono mt-2 truncate py-1 px-1.5 rounded border ${
                                      isWhite
                                        ? "bg-white text-slate-600 border-slate-200"
                                        : "bg-slate-950/60 text-slate-500 border-slate-800/60"
                                    }`}
                                  >
                                    {JSON.stringify(node.config)}
                                  </div>
                                </div>
                                {idx < arr.length - 1 && (
                                  <div className="text-orange-500 text-lg font-bold flex items-center justify-center px-1">
                                    <ArrowRight className="w-5 h-5 text-orange-500/80 animate-pulse" />
                                  </div>
                                )}
                              </React.Fragment>
                            )
                          )}
                      </div>
                    </div>
                  </div>

                  {/* Live Execution Logs */}
                  <div
                    className={`mt-6 rounded-xl p-4 font-mono text-xs border shadow-inner ${
                      isWhite
                        ? "bg-slate-900 text-slate-100 border-slate-800"
                        : "bg-slate-900/90 text-slate-100 border-slate-800"
                    }`}
                  >
                    <div className="border-b border-slate-800 pb-2 mb-2.5 flex justify-between items-center">
                      <div className="flex items-center space-x-2">
                        <Terminal className="w-3.5 h-3.5 text-orange-400" />
                        <span className="font-semibold text-slate-200">
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
                        <div className="text-slate-400 text-center py-4 italic">
                          No active execution. Click &quot;Run Workflow&quot; to
                          start simulation.
                        </div>
                      ) : (
                        executionLogs.map((log, idx) => (
                          <div
                            key={idx}
                            className="flex items-start space-x-2.5 text-[11px] leading-relaxed"
                          >
                            <span className="text-slate-400 shrink-0">
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
                            <span className="text-slate-200 break-all">
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
                  <h2
                    className={`text-2xl font-bold tracking-tight flex items-center space-x-2 ${
                      isWhite ? "text-slate-900" : "text-white"
                    }`}
                  >
                    <LayoutGrid className="w-6 h-6 text-blue-500" />
                    <span>Monday.com Workspace Simulator</span>
                  </h2>
                  <p
                    className={`text-sm mt-0.5 ${
                      isWhite ? "text-slate-600" : "text-slate-400"
                    }`}
                  >
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
                    className={`px-3.5 py-2 rounded-xl text-xs font-medium border flex items-center space-x-2 transition-all cursor-pointer shadow-sm ${
                      isWhite
                        ? "bg-white hover:bg-slate-50 text-slate-700 border-slate-300"
                        : "bg-slate-800 hover:bg-slate-700 text-slate-200 border-slate-700"
                    }`}
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
                    className={`border rounded-2xl overflow-hidden shadow-sm transition-colors ${
                      isWhite
                        ? "bg-white border-slate-200"
                        : "bg-slate-950 border-slate-800 shadow-xl"
                    }`}
                  >
                    <div
                      className={`px-6 py-4 border-b flex justify-between items-center ${
                        isWhite
                          ? "bg-slate-50/80 border-slate-200"
                          : "bg-slate-900/90 border-slate-800"
                      }`}
                    >
                      <div className="flex items-center space-x-3">
                        <span className="w-3 h-3 rounded-full bg-blue-500 shadow-sm shadow-blue-500/50"></span>
                        <h3
                          className={`font-bold text-lg ${
                            isWhite ? "text-slate-900" : "text-slate-100"
                          }`}
                        >
                          {board.name}
                        </h3>
                        <span
                          className={`text-xs px-2 py-0.5 rounded-md font-semibold ${
                            isWhite
                              ? "bg-blue-50 text-blue-700 border border-blue-200"
                              : "bg-blue-500/10 text-blue-400 border border-blue-500/20"
                          }`}
                        >
                          Live Sync
                        </span>
                      </div>
                      <span
                        className={`text-xs font-mono px-2.5 py-1 rounded-lg border ${
                          isWhite
                            ? "bg-white border-slate-200 text-slate-600"
                            : "bg-slate-900 border-slate-800 text-slate-400"
                        }`}
                      >
                        {(board.items as any[])?.length || 0} Items
                      </span>
                    </div>

                    <div className="overflow-x-auto">
                      <table className="w-full text-left border-collapse">
                        <thead>
                          <tr
                            className={`border-b text-xs font-semibold uppercase tracking-wider ${
                              isWhite
                                ? "border-slate-200 bg-slate-100/70 text-slate-600"
                                : "border-slate-800 bg-slate-900/40 text-slate-400"
                            }`}
                          >
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
                        <tbody
                          className={`divide-y text-sm ${
                            isWhite ? "divide-slate-200" : "divide-slate-800/60"
                          }`}
                        >
                          {((board.items as MondayItem[]) || []).map((item) => (
                            <tr
                              key={item.id}
                              className={`transition-colors ${
                                isWhite
                                  ? "hover:bg-slate-50/80"
                                  : "hover:bg-slate-900/50"
                              }`}
                            >
                              <td
                                className={`px-6 py-3.5 font-semibold ${
                                  isWhite ? "text-slate-900" : "text-slate-200"
                                }`}
                              >
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
                                              ? isWhite
                                                ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                                                : "bg-emerald-500/15 text-emerald-400 border border-emerald-500/30"
                                              : val === "Pending Review" ||
                                                val === "Pending"
                                              ? isWhite
                                                ? "bg-amber-50 text-amber-700 border border-amber-200"
                                                : "bg-amber-500/15 text-amber-400 border border-amber-500/30"
                                              : isWhite
                                              ? "bg-blue-50 text-blue-700 border border-blue-200"
                                              : "bg-blue-500/15 text-blue-400 border border-blue-500/30"
                                          }`}
                                        >
                                          {val}
                                        </span>
                                      ) : col.type === "numeric" ? (
                                        <span
                                          className={`font-mono font-medium ${
                                            isWhite
                                              ? "text-slate-800"
                                              : "text-slate-300"
                                          }`}
                                        >
                                          {typeof val === "number"
                                            ? `$${val.toLocaleString(undefined, {
                                                minimumFractionDigits: 2,
                                              })}`
                                            : val}
                                        </span>
                                      ) : (
                                        <span
                                          className={
                                            isWhite
                                              ? "text-slate-700"
                                              : "text-slate-300"
                                          }
                                        >
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
                <h2
                  className={`text-2xl font-bold tracking-tight flex items-center space-x-2 ${
                    isWhite ? "text-slate-900" : "text-white"
                  }`}
                >
                  <BrainCircuit className="w-6 h-6 text-purple-500" />
                  <span>AI OCR & Structured Data Extraction</span>
                </h2>
                <p
                  className={`text-sm mt-0.5 ${
                    isWhite ? "text-slate-600" : "text-slate-400"
                  }`}
                >
                  Test prompt engineering and extract verified JSON schemas from
                  unstructured invoices, contracts, and emails.
                </p>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Input Panel */}
                <div
                  className={`border rounded-2xl p-6 space-y-4 flex flex-col shadow-sm transition-colors ${
                    isWhite
                      ? "bg-white border-slate-200"
                      : "bg-slate-950 border-slate-800 shadow-xl"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <h3
                      className={`font-semibold text-base ${
                        isWhite ? "text-slate-900" : "text-slate-200"
                      }`}
                    >
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
                      className="text-xs text-purple-500 hover:text-purple-600 font-medium flex items-center space-x-1 cursor-pointer"
                    >
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>Load Sample Invoice</span>
                    </button>
                  </div>

                  <textarea
                    value={aiText}
                    onChange={(e) => setAiText(e.target.value)}
                    rows={10}
                    className={`w-full flex-1 rounded-xl p-4 font-mono text-xs sm:text-sm focus:outline-none focus:ring-1 focus:ring-purple-500 leading-relaxed transition-all border ${
                      isWhite
                        ? "bg-slate-50 border-slate-300 text-slate-900 focus:bg-white focus:border-purple-600"
                        : "bg-slate-900 border-slate-800 text-slate-200 focus:border-purple-500"
                    }`}
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
                <div
                  className={`border rounded-2xl p-6 flex flex-col justify-between shadow-sm transition-colors ${
                    isWhite
                      ? "bg-white border-slate-200"
                      : "bg-slate-950 border-slate-800 shadow-xl"
                  }`}
                >
                  <div>
                    <div className="flex items-center justify-between mb-4">
                      <h3
                        className={`font-semibold text-base ${
                          isWhite ? "text-slate-900" : "text-slate-200"
                        }`}
                      >
                        Structured Output (JSON Mode)
                      </h3>
                      {aiResult && (
                        <span
                          className={`text-xs px-2 py-0.5 rounded-md font-mono font-semibold ${
                            isWhite
                              ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                              : "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                          }`}
                        >
                          Schema Validated
                        </span>
                      )}
                    </div>

                    {aiResult ? (
                      <pre className="bg-slate-950 border border-slate-800 rounded-xl p-5 font-mono text-xs sm:text-sm text-emerald-400 overflow-x-auto shadow-inner">
                        {JSON.stringify(aiResult, null, 2)}
                      </pre>
                    ) : (
                      <div
                        className={`border-2 border-dashed rounded-xl p-16 text-center flex flex-col items-center justify-center space-y-2 ${
                          isWhite
                            ? "border-slate-300 text-slate-400"
                            : "border-slate-800 text-slate-500"
                        }`}
                      >
                        <BrainCircuit className="w-8 h-8 text-slate-400" />
                        <p className="text-sm">
                          Run extraction to see structured JSON output.
                        </p>
                      </div>
                    )}
                  </div>

                  {aiResult && (
                    <div
                      className={`mt-6 p-4 border rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-sm ${
                        isWhite
                          ? "bg-purple-50/90 border-purple-200 text-purple-900"
                          : "bg-purple-500/10 border-purple-500/25 shadow-md"
                      }`}
                    >
                      <div>
                        <h4
                          className={`font-semibold text-sm flex items-center space-x-1.5 ${
                            isWhite ? "text-purple-900" : "text-purple-300"
                          }`}
                        >
                          <CheckCircle2 className="w-4 h-4 text-purple-500" />
                          <span>Ready for Monday.com Sync</span>
                        </h4>
                        <p
                          className={`text-xs mt-0.5 ${
                            isWhite ? "text-slate-600" : "text-slate-400"
                          }`}
                        >
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
                    <div
                      className={`mt-3 p-3 rounded-lg border text-xs font-medium flex items-center space-x-2 ${
                        isWhite
                          ? "bg-emerald-50 border-emerald-200 text-emerald-800"
                          : "bg-emerald-500/15 border-emerald-500/30 text-emerald-300"
                      }`}
                    >
                      <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
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
                <h2
                  className={`text-2xl font-bold tracking-tight flex items-center space-x-2 ${
                    isWhite ? "text-slate-900" : "text-white"
                  }`}
                >
                  <BarChart3 className="w-6 h-6 text-emerald-500" />
                  <span>BI Automation Analytics & ROI</span>
                </h2>
                <p
                  className={`text-sm mt-0.5 ${
                    isWhite ? "text-slate-600" : "text-slate-400"
                  }`}
                >
                  Business intelligence dashboard tracking automation volume,
                  cost savings, and SLA performance.
                </p>
              </div>

              {/* KPI Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div
                  className={`border p-5 rounded-2xl shadow-sm transition-colors ${
                    isWhite
                      ? "bg-white border-slate-200"
                      : "bg-slate-950 border-slate-800 shadow-xl"
                  }`}
                >
                  <div
                    className={`text-[11px] font-bold uppercase tracking-wider flex items-center justify-between ${
                      isWhite ? "text-slate-500" : "text-slate-400"
                    }`}
                  >
                    <span>Total Executions</span>
                    <Zap className="w-4 h-4 text-orange-500" />
                  </div>
                  <div
                    className={`text-2xl font-black mt-2 font-mono ${
                      isWhite ? "text-slate-900" : "text-white"
                    }`}
                  >
                    {totalExecutionsCount.toLocaleString()}
                  </div>
                  <div className="text-xs text-emerald-500 mt-1 flex items-center space-x-1 font-medium">
                    <span>↑ 14.8%</span>
                    <span
                      className={isWhite ? "text-slate-400" : "text-slate-500"}
                    >
                      vs previous period
                    </span>
                  </div>
                </div>

                <div
                  className={`border p-5 rounded-2xl shadow-sm transition-colors ${
                    isWhite
                      ? "bg-white border-slate-200"
                      : "bg-slate-950 border-slate-800 shadow-xl"
                  }`}
                >
                  <div
                    className={`text-[11px] font-bold uppercase tracking-wider flex items-center justify-between ${
                      isWhite ? "text-slate-500" : "text-slate-400"
                    }`}
                  >
                    <span>Success Rate</span>
                    <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                  </div>
                  <div className="text-2xl font-black mt-2 text-emerald-500 font-mono">
                    99.4%
                  </div>
                  <div
                    className={`text-xs mt-1 ${
                      isWhite ? "text-slate-500" : "text-slate-400"
                    }`}
                  >
                    Zero fatal exceptions
                  </div>
                </div>

                <div
                  className={`border p-5 rounded-2xl shadow-sm transition-colors ${
                    isWhite
                      ? "bg-white border-slate-200"
                      : "bg-slate-950 border-slate-800 shadow-xl"
                  }`}
                >
                  <div
                    className={`text-[11px] font-bold uppercase tracking-wider flex items-center justify-between ${
                      isWhite ? "text-slate-500" : "text-slate-400"
                    }`}
                  >
                    <span>Cost Saved</span>
                    <Coins className="w-4 h-4 text-blue-500" />
                  </div>
                  <div
                    className={`text-2xl font-black mt-2 font-mono ${
                      isWhite ? "text-blue-600" : "text-blue-400"
                    }`}
                  >
                    ${parseFloat(totalCostSavedCalc).toLocaleString()}
                  </div>
                  <div
                    className={`text-xs mt-1 ${
                      isWhite ? "text-slate-500" : "text-slate-400"
                    }`}
                  >
                    Calculated @ $1.25 / manual op
                  </div>
                </div>

                <div
                  className={`border p-5 rounded-2xl shadow-sm transition-colors ${
                    isWhite
                      ? "bg-white border-slate-200"
                      : "bg-slate-950 border-slate-800 shadow-xl"
                  }`}
                >
                  <div
                    className={`text-[11px] font-bold uppercase tracking-wider flex items-center justify-between ${
                      isWhite ? "text-slate-500" : "text-slate-400"
                    }`}
                  >
                    <span>Data Throughput</span>
                    <Database className="w-4 h-4 text-purple-500" />
                  </div>
                  <div
                    className={`text-2xl font-black mt-2 font-mono ${
                      isWhite ? "text-purple-700" : "text-purple-300"
                    }`}
                  >
                    8,492 records
                  </div>
                  <div
                    className={`text-xs mt-1 ${
                      isWhite ? "text-slate-500" : "text-slate-400"
                    }`}
                  >
                    Across 4 integrated endpoints
                  </div>
                </div>
              </div>

              {/* Charts Grid */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Volume & Cost Chart */}
                <div
                  className={`border p-6 rounded-2xl shadow-sm flex flex-col justify-between transition-colors ${
                    isWhite
                      ? "bg-white border-slate-200"
                      : "bg-slate-950 border-slate-800 shadow-xl"
                  }`}
                >
                  <div className="mb-4 flex items-center justify-between">
                    <div>
                      <h3
                        className={`font-semibold text-base ${
                          isWhite ? "text-slate-900" : "text-slate-200"
                        }`}
                      >
                        Automation Volume & Throughput
                      </h3>
                      <p
                        className={`text-xs ${
                          isWhite ? "text-slate-500" : "text-slate-400"
                        }`}
                      >
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
                            stroke={isWhite ? "#e2e8f0" : "#1e293b"}
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
                            stroke={isWhite ? "#94a3b8" : "#64748b"}
                            tick={{ fontSize: 11 }}
                          />
                          <YAxis
                            stroke={isWhite ? "#94a3b8" : "#64748b"}
                            tick={{ fontSize: 11 }}
                          />
                          <Tooltip
                            contentStyle={
                              isWhite
                                ? {
                                    backgroundColor: "#ffffff",
                                    borderColor: "#cbd5e1",
                                    color: "#0f172a",
                                    borderRadius: "0.75rem",
                                    fontSize: "12px",
                                    boxShadow:
                                      "0 10px 15px -3px rgba(0, 0, 0, 0.1)",
                                  }
                                : {
                                    backgroundColor: "#0f172a",
                                    borderColor: "#334155",
                                    color: "#f8fafc",
                                    borderRadius: "0.75rem",
                                    fontSize: "12px",
                                  }
                            }
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
                      <div className="h-full flex items-center justify-center text-slate-400">
                        Loading charts...
                      </div>
                    )}
                  </div>
                </div>

                {/* Success Rate Chart */}
                <div
                  className={`border p-6 rounded-2xl shadow-sm flex flex-col justify-between transition-colors ${
                    isWhite
                      ? "bg-white border-slate-200"
                      : "bg-slate-950 border-slate-800 shadow-xl"
                  }`}
                >
                  <div className="mb-4 flex items-center justify-between">
                    <div>
                      <h3
                        className={`font-semibold text-base ${
                          isWhite ? "text-slate-900" : "text-slate-200"
                        }`}
                      >
                        SLA & Success Rate Trend
                      </h3>
                      <p
                        className={`text-xs ${
                          isWhite ? "text-slate-500" : "text-slate-400"
                        }`}
                      >
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
                            stroke={isWhite ? "#e2e8f0" : "#1e293b"}
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
                            stroke={isWhite ? "#94a3b8" : "#64748b"}
                            tick={{ fontSize: 11 }}
                          />
                          <YAxis
                            domain={[90, 100]}
                            stroke={isWhite ? "#94a3b8" : "#64748b"}
                            tick={{ fontSize: 11 }}
                          />
                          <Tooltip
                            contentStyle={
                              isWhite
                                ? {
                                    backgroundColor: "#ffffff",
                                    borderColor: "#cbd5e1",
                                    color: "#0f172a",
                                    borderRadius: "0.75rem",
                                    fontSize: "12px",
                                    boxShadow:
                                      "0 10px 15px -3px rgba(0, 0, 0, 0.1)",
                                  }
                                : {
                                    backgroundColor: "#0f172a",
                                    borderColor: "#334155",
                                    color: "#f8fafc",
                                    borderRadius: "0.75rem",
                                    fontSize: "12px",
                                  }
                            }
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
                      <div className="h-full flex items-center justify-center text-slate-400">
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
                  <h2
                    className={`text-2xl font-bold tracking-tight flex items-center space-x-2 ${
                      isWhite ? "text-slate-900" : "text-white"
                    }`}
                  >
                    <Terminal
                      className={`w-6 h-6 ${
                        isWhite ? "text-slate-700" : "text-slate-300"
                      }`}
                    />
                    <span>System Execution Logs & Audit Trail</span>
                  </h2>
                  <p
                    className={`text-sm mt-0.5 ${
                      isWhite ? "text-slate-600" : "text-slate-400"
                    }`}
                  >
                    Immutable audit log of all automated workflow executions,
                    triggers, and AI model costs.
                  </p>
                </div>
              </div>

              <div
                className={`border rounded-2xl overflow-hidden shadow-sm transition-colors ${
                  isWhite
                    ? "bg-white border-slate-200"
                    : "bg-slate-950 border-slate-800 shadow-xl"
                }`}
              >
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr
                        className={`border-b text-xs font-semibold uppercase tracking-wider ${
                          isWhite
                            ? "border-slate-200 bg-slate-100/70 text-slate-600"
                            : "border-slate-800 bg-slate-900/40 text-slate-400"
                        }`}
                      >
                        <th className="px-6 py-3.5">Timestamp</th>
                        <th className="px-6 py-3.5">Workflow</th>
                        <th className="px-6 py-3.5">Trigger</th>
                        <th className="px-6 py-3.5">Status</th>
                        <th className="px-6 py-3.5">Duration</th>
                        <th className="px-6 py-3.5">Simulated Cost</th>
                        <th className="px-6 py-3.5 text-right">Details</th>
                      </tr>
                    </thead>
                    <tbody
                      className={`divide-y text-sm font-mono ${
                        isWhite ? "divide-slate-200" : "divide-slate-800/60"
                      }`}
                    >
                      {executions.map((exec) => (
                        <tr
                          key={exec.id}
                          className={`transition-colors ${
                            isWhite
                              ? "hover:bg-slate-50/80"
                              : "hover:bg-slate-900/40"
                          }`}
                        >
                          <td
                            className={`px-6 py-3.5 text-xs ${
                              isWhite ? "text-slate-500" : "text-slate-400"
                            }`}
                          >
                            {exec.createdAt
                              ? new Date(exec.createdAt).toLocaleString()
                              : "Recent"}
                          </td>
                          <td
                            className={`px-6 py-3.5 font-sans font-semibold text-sm ${
                              isWhite ? "text-slate-900" : "text-slate-200"
                            }`}
                          >
                            {workflows.find((w) => w.id === exec.workflowId)
                              ?.name || "Workflow Pipeline"}
                          </td>
                          <td
                            className={`px-6 py-3.5 text-xs ${
                              isWhite ? "text-slate-700" : "text-slate-300"
                            }`}
                          >
                            {exec.triggerType}
                          </td>
                          <td className="px-6 py-3.5">
                            <span
                              className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                                exec.status === "SUCCESS"
                                  ? isWhite
                                    ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                                    : "bg-emerald-500/15 text-emerald-400 border border-emerald-500/30"
                                  : isWhite
                                  ? "bg-red-50 text-red-700 border border-red-200"
                                  : "bg-red-500/15 text-red-400 border border-red-500/30"
                              }`}
                            >
                              {exec.status}
                            </span>
                          </td>
                          <td
                            className={`px-6 py-3.5 text-xs ${
                              isWhite ? "text-slate-700" : "text-slate-300"
                            }`}
                          >
                            {exec.durationMs}ms
                          </td>
                          <td
                            className={`px-6 py-3.5 text-xs font-semibold ${
                              isWhite ? "text-slate-700" : "text-slate-300"
                            }`}
                          >
                            ${(exec.cost || 0).toFixed(4)}
                          </td>
                          <td className="px-6 py-3.5 text-right font-sans">
                            <button
                              onClick={() => setSelectedLogExecution(exec)}
                              className="text-xs text-orange-500 hover:text-orange-600 font-semibold underline underline-offset-4 cursor-pointer"
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
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                  <div
                    className={`border rounded-2xl max-w-2xl w-full p-6 space-y-4 shadow-2xl transition-colors ${
                      isWhite
                        ? "bg-white border-slate-200 text-slate-900"
                        : "bg-slate-950 border-slate-800 text-white"
                    }`}
                  >
                    <div
                      className={`flex items-center justify-between border-b pb-3 ${
                        isWhite ? "border-slate-200" : "border-slate-800"
                      }`}
                    >
                      <div>
                        <h3
                          className={`font-bold text-lg ${
                            isWhite ? "text-slate-900" : "text-white"
                          }`}
                        >
                          Execution Log Details
                        </h3>
                        <p
                          className={`text-xs font-mono ${
                            isWhite ? "text-slate-500" : "text-slate-400"
                          }`}
                        >
                          ID: {selectedLogExecution.id}
                        </p>
                      </div>
                      <button
                        onClick={() => setSelectedLogExecution(null)}
                        className={`text-lg font-bold px-2 cursor-pointer ${
                          isWhite
                            ? "text-slate-400 hover:text-slate-700"
                            : "text-slate-400 hover:text-white"
                        }`}
                      >
                        ✕
                      </button>
                    </div>

                    <div className="space-y-3 font-mono text-xs max-h-96 overflow-y-auto pr-1">
                      <div
                        className={`p-3 rounded-lg border ${
                          isWhite
                            ? "bg-slate-950 border-slate-800"
                            : "bg-slate-900 border-slate-800"
                        }`}
                      >
                        <span className="text-slate-400 block mb-1">
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
                        <span
                          className={`block font-semibold ${
                            isWhite ? "text-slate-700" : "text-slate-400"
                          }`}
                        >
                          Node Trace:
                        </span>
                        {((selectedLogExecution.logs as ExecutionLogItem[]) || []).map(
                          (log, idx) => (
                            <div
                              key={idx}
                              className={`p-2.5 rounded-lg border text-[11px] ${
                                isWhite
                                  ? "bg-slate-50 border-slate-200"
                                  : "bg-slate-900/60 border-slate-800/80"
                              }`}
                            >
                              <div className="flex justify-between items-center mb-1">
                                <span className="text-blue-500 font-bold">
                                  [{log.nodeName}]
                                </span>
                                <span
                                  className={
                                    log.status === "SUCCESS"
                                      ? "text-emerald-500 font-semibold"
                                      : "text-amber-500 font-semibold"
                                  }
                                >
                                  {log.status}
                                </span>
                              </div>
                              <p
                                className={
                                  isWhite ? "text-slate-700" : "text-slate-300"
                                }
                              >
                                {log.message}
                              </p>
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
