import { db as prisma } from "@/lib/db";
import DashboardClient from "./DashboardClient";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const workflows = await prisma.workflow.findMany({
    orderBy: { createdAt: "asc" },
  });
  const mondayBoards = await prisma.mondayBoard.findMany({
    orderBy: { createdAt: "asc" },
  });
  const biMetrics = await (prisma as any).bIMetric.findMany({
    orderBy: { date: "asc" },
  });
  const promptTemplates = await prisma.aIPromptTemplate.findMany({
    orderBy: { createdAt: "asc" },
  });
  const executions = await prisma.workflowExecution.findMany({
    orderBy: { createdAt: "desc" },
    take: 25,
  });

  return (
    <DashboardClient
      initialWorkflows={workflows as any}
      initialMondayBoards={mondayBoards as any}
      initialBiMetrics={biMetrics as any}
      initialPromptTemplates={promptTemplates as any}
      initialExecutions={executions as any}
    />
  );
}
