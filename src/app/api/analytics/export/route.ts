import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const days = parseInt(searchParams.get("days") || "30", 10);
    const format = searchParams.get("format") || "csv";
    const since = new Date();
    since.setDate(since.getDate() - days);

    const usage = await db.lLMUsage.findMany({ where: { createdAt: { gte: since } }, orderBy: { date: "asc" } });

    if (format === "csv") {
      const lines = ["Date,Model,Tokens,Cost,Requests"];
      for (const u of usage) {
        lines.push(`${u.date},${u.model || "unknown"},${u.tokens},${u.cost.toFixed(4)},${u.requests}`);
      }
      return new NextResponse(lines.join("\n"), {
        headers: { "Content-Type": "text/csv", "Content-Disposition": `attachment; filename="analytics-${days}d.csv"` },
      });
    }

    return NextResponse.json({ usage });
  } catch (error) {
    console.error("Export error:", error);
    return NextResponse.json({ error: "Export failed" }, { status: 500 });
  }
}
