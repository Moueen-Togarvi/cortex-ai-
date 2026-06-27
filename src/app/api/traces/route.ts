import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { seedDemoTraces } from "@/lib/tracing";

let seeded = false;

export async function GET(request: NextRequest) {
  try {
    // Lazy seed on first request (fire-and-forget)
    if (!seeded) {
      seeded = true;
      seedDemoTraces().catch(() => {});
    }

    const { searchParams } = new URL(request.url);

    // Filters
    const source = searchParams.get("source");
    const status = searchParams.get("status");
    const model = searchParams.get("model");
    const hours = parseInt(searchParams.get("hours") || "24", 10);
    const limit = parseInt(searchParams.get("limit") || "50", 10);
    const offset = parseInt(searchParams.get("offset") || "0", 10);

    // Build where clause
    const since = new Date();
    since.setHours(since.getHours() - hours);

    const where: Record<string, unknown> = {
      createdAt: { gte: since },
    };

    if (source) where.source = source;
    if (status) where.status = status;
    if (model) where.model = model;

    const [traces, total] = await Promise.all([
      db.trace.findMany({
        where,
        orderBy: { createdAt: "desc" },
        take: limit,
        skip: offset,
        select: {
          id: true,
          traceId: true,
          spanId: true,
          parentId: true,
          source: true,
          sourceId: true,
          model: true,
          input: true,
          output: true,
          inputTokens: true,
          outputTokens: true,
          totalTokens: true,
          latencyMs: true,
          cost: true,
          status: true,
          errorMessage: true,
          metadata: true,
          userId: true,
          createdAt: true,
        },
      }),
      db.trace.count({ where }),
    ]);

    // Truncate input and output for list response
    const truncated = traces.map((t) => ({
      ...t,
      input: t.input.length > 200 ? t.input.slice(0, 200) + "..." : t.input,
      output: t.output && t.output.length > 200 ? t.output.slice(0, 200) + "..." : t.output,
    }));

    return NextResponse.json({
      data: truncated,
      pagination: { total, limit, offset },
    });
  } catch (error) {
    console.error("Traces list error:", error);
    return NextResponse.json({ error: "Failed to fetch traces" }, { status: 500 });
  }
}