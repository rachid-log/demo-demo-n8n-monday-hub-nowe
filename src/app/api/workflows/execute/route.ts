import { NextResponse } from "next/server";
import { executeWorkflowAction } from "@/app/actions/automation";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { workflowId, payload } = body;

    if (!workflowId) {
      return NextResponse.json(
        { error: "workflowId is required" },
        { status: 400 }
      );
    }

    const execution = await executeWorkflowAction(workflowId, payload);
    return NextResponse.json(execution, { status: 200 });
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || "Failed to execute workflow" },
      { status: 500 }
    );
  }
}
