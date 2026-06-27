import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

// GET /api/llm/usage — Get usage history with summary
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const days = parseInt(searchParams.get("days") || "7", 10);

    if (isNaN(days) || days < 1 || days > 365) {
      return NextResponse.json(
        { error: "days must be a number between 1 and 365" },
        { status: 400 }
      );
    }

    // Calculate the cutoff date
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);

    // Fetch usage records ordered by date desc
    const usageRecords = await db.lLMUsage.findMany({
      where: {
        createdAt: { gte: cutoffDate },
      },
      orderBy: { createdAt: "desc" },
    });

    // Calculate summary totals
    const summary = {
      totalTokens: 0,
      totalCost: 0,
      totalRequests: 0,
    };

    for (const record of usageRecords) {
      summary.totalTokens += record.tokens;
      summary.totalCost += record.cost;
      summary.totalRequests += record.requests;
    }

    return NextResponse.json({
      usage: usageRecords,
      summary: {
        totalTokens: summary.totalTokens,
        totalCost: Math.round(summary.totalCost * 10000) / 10000, // round to 4 decimals
        totalRequests: summary.totalRequests,
      },
    });
  } catch (error) {
    console.error("Failed to fetch usage history:", error);
    return NextResponse.json(
      { error: "Failed to fetch usage history" },
      { status: 500 }
    );
  }
}
