import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  const startTime = Date.now();
  let dbStatus = "not_configured";

  if (process.env.DATABASE_URL) {
    try {
      await db.$queryRaw`SELECT 1`;
      dbStatus = "connected";
    } catch {
      dbStatus = "disconnected";
    }
  }

  return NextResponse.json(
    {
      status: "ok",
      service: "prototype-boilerplate",
      subdomain: process.env.SUBDOMAIN || "demo",
      timestamp: new Date().toISOString(),
      uptimeSeconds: Math.floor(process.uptime()),
      database: dbStatus,
      latencyMs: Date.now() - startTime,
    },
    { status: 200 }
  );
}
