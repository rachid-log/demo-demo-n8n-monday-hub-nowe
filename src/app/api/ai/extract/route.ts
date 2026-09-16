import { NextResponse } from "next/server";
import { extractStructuredDataAction } from "@/app/actions/automation";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { templateId, rawText } = body;

    if (!rawText) {
      return NextResponse.json(
        { error: "rawText is required" },
        { status: 400 }
      );
    }

    const extraction = await extractStructuredDataAction(templateId, rawText);
    return NextResponse.json(extraction, { status: 200 });
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || "Failed to extract structured data" },
      { status: 500 }
    );
  }
}
