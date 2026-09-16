import { NextResponse } from "next/server";
import { db as prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const boards = await prisma.mondayBoard.findMany({
      orderBy: { createdAt: "asc" },
    });
    return NextResponse.json(boards);
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || "Failed to fetch Monday boards" },
      { status: 500 }
    );
  }
}
