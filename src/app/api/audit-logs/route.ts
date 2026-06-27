import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

// GET /api/audit-logs — List audit logs with optional filters
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const action = searchParams.get("action") ?? undefined;
    const resource = searchParams.get("resource") ?? undefined;
    const limit = Math.min(Number(searchParams.get("limit")) || 50, 200);
    const offset = Number(searchParams.get("offset")) || 0;

    const where: Record<string, unknown> = {};
    if (action) where.action = action;
    if (resource) where.resource = resource;

    const logs = await db.auditLog.findMany({
      where,
      include: {
        user: {
          select: { id: true, name: true, email: true },
        },
      },
      orderBy: { createdAt: "desc" },
      take: limit,
      skip: offset,
    });

    const total = await db.auditLog.count({ where });

    return NextResponse.json({
      data: logs,
      pagination: {
        total,
        limit,
        offset,
      },
    });
  } catch (error) {
    console.error("Failed to list audit logs:", error);
    return NextResponse.json(
      { error: "Failed to list audit logs" },
      { status: 500 },
    );
  }
}
