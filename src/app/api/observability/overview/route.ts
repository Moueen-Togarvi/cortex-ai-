import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const hours = parseInt(searchParams.get("hours") || "24", 10);

    const since = new Date();
    since.setHours(since.getHours() - hours);

    const where: Prisma.TraceWhereInput = {
      createdAt: { gte: since },
    };

    // ── Basic aggregates ──
    const [
      totalCount,
      successCount,
      errorCount,
      timeoutCount,
      totalTokensAgg,
      totalCostAgg,
      avgLatencyAgg,
    ] = await Promise.all([
      db.trace.count({ where }),
      db.trace.count({ where: { ...where, status: "success" } }),
      db.trace.count({ where: { ...where, status: "error" } }),
      db.trace.count({ where: { ...where, status: "timeout" } }),
      db.trace.aggregate({
        where,
        _sum: { totalTokens: true },
      }),
      db.trace.aggregate({
        where,
        _sum: { cost: true },
      }),
      db.trace.aggregate({
        where,
        _avg: { latencyMs: true },
      }),
    ]);

    // ── Percentile calculation ──
    const allTraces = await db.trace.findMany({
      where,
      select: { latencyMs: true },
      orderBy: { latencyMs: "asc" },
    });

    const latencies = allTraces.map((t) => t.latencyMs);
    const percentile = (arr: number[], p: number) => {
      if (arr.length === 0) return 0;
      const idx = Math.ceil((p / 100) * arr.length) - 1;
      return arr[Math.max(0, idx)];
    };

    // ── By source ──
    const bySourceRaw = await db.trace.groupBy({
      by: ["source"],
      where,
      _count: { source: true },
    });
    const bySource: Record<string, number> = {};
    for (const row of bySourceRaw) {
      bySource[row.source] = row._count.source;
    }

    // ── By model ──
    const byModelRaw = await db.trace.groupBy({
      by: ["model"],
      where,
      _count: { model: true },
    });
    const byModel: Record<string, number> = {};
    for (const row of byModelRaw) {
      byModel[row.model] = row._count.model;
    }

    // ── By status ──
    const byStatusRaw = await db.trace.groupBy({
      by: ["status"],
      where,
      _count: { status: true },
    });
    const byStatus: Record<string, number> = {};
    for (const row of byStatusRaw) {
      byStatus[row.status] = row._count.status;
    }

    // ── By hour (SQLite strftime) ──
    const byHourRaw: Array<{
      hour: string;
      count: number;
      avgLatency: number;
      errors: number;
    }> = await db.$queryRawUnsafe(`
      SELECT
        strftime('%Y-%m-%dT%H:00', "createdAt") AS hour,
        COUNT(*) AS count,
        AVG("latencyMs") AS avgLatency,
        SUM(CASE WHEN "status" IN ('error', 'timeout') THEN 1 ELSE 0 END) AS errors
      FROM "Trace"
      WHERE "createdAt" >= ${since.toISOString()}
      GROUP BY strftime('%Y-%m-%dT%H:00', "createdAt")
      ORDER BY hour ASC
    `);

    return NextResponse.json({
      totalTraces: totalCount,
      successRate:
        totalCount > 0 ? +((successCount / totalCount) * 100).toFixed(1) : 0,
      avgLatency: Math.round(avgLatencyAgg._avg?.latencyMs ?? 0),
      p50Latency: percentile(latencies, 50),
      p95Latency: percentile(latencies, 95),
      p99Latency: percentile(latencies, 99),
      totalTokens: totalTokensAgg._sum.totalTokens ?? 0,
      totalCost: +(totalCostAgg._sum.cost ?? 0).toFixed(2),
      errorCount,
      timeoutCount,
      bySource,
      byModel,
      byHour: byHourRaw.map((row) => ({
        hour: row.hour,
        count: row.count,
        avgLatency: Math.round(row.avgLatency),
        errors: row.errors,
      })),
      byStatus,
    });
  } catch (error) {
    console.error("Observability overview error:", error);
    return NextResponse.json(
      { error: "Failed to fetch observability overview" },
      { status: 500 },
    );
  }
}