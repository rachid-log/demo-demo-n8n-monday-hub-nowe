import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    if (!process.env.DATABASE_URL) {
      return NextResponse.json({
        data: [],
        message: "Database not configured. Set DATABASE_URL in .env to enable persistence.",
      });
    }

    const projects = await db.project.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        user: {
          select: { name: true, email: true },
        },
      },
    });

    return NextResponse.json({ success: true, count: projects.length, data: projects });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Failed to fetch projects",
      },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    if (!process.env.DATABASE_URL) {
      return NextResponse.json(
        { error: "Database not configured. Set DATABASE_URL to enable persistence." },
        { status: 400 }
      );
    }

    const body = await request.json();
    const { name, description, status = "active" } = body;

    if (!name) {
      return NextResponse.json({ error: "Field 'name' is required" }, { status: 400 });
    }

    const project = await db.project.create({
      data: {
        name,
        description,
        status,
      },
    });

    return NextResponse.json({ success: true, data: project }, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Failed to create project",
      },
      { status: 500 }
    );
  }
}
