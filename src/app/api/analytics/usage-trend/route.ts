import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const days = parseInt(searchParams.get("days") || "30", 10);
    const since = new Date();
    since.setDate(since.getDate() - days);

    const usage = await db.lLMUsage.findMany({ where: { createdAt: { gte: since } } });

    const dailyMap: Record<string, { date: string; tokens: number; cost: number; requests: number }> = {};
    for (const u of usage) {
      const day = u.date || u.createdAt.toISOString().split("T")[0];
      if (!dailyMap[day]) dailyMap[day] = { date: day, tokens: 0, cost: 0, requests: 0 };
      dailyMap[day].tokens += u.tokens;
      dailyMap[day].cost += u.cost;
      dailyMap[day].requests += u.requests;
    }

    return NextResponse.json({
      trend: Object.values(dailyMap).sort((a, b) => a.date.localeCompare(b.date)),
    });
  } catch (error) {
    console.error("Usage trend error:", error);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
