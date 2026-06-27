import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { MODEL_CONFIGS } from "@/lib/llm";

// GET /api/llm/models — Return model configs with aggregate usage stats
export async function GET() {
  try {
    // Aggregate usage stats from DB grouped by model
    const usageByModel = await db.lLMUsage.groupBy({
      by: ["model"],
      _sum: { tokens: true, cost: true, requests: true },
    });

    // Build a lookup map: modelId -> usage
    const usageMap = new Map<
      string,
      { totalTokens: number; totalCost: number; totalRequests: number }
    >();

    for (const row of usageByModel) {
      usageMap.set(row.model, {
        totalTokens: row._sum.tokens ?? 0,
        totalCost: row._sum.cost ?? 0,
        totalRequests: row._sum.requests ?? 0,
      });
    }

    // Merge usage stats into each model config
    const modelsWithUsage = MODEL_CONFIGS.map((model) => {
      const usage = usageMap.get(model.modelId);
      return {
        ...model,
        totalUsage: usage?.totalRequests ?? 0,
        totalCost: usage?.totalCost ?? 0,
        totalTokens: usage?.totalTokens ?? 0,
        avgLatency: Math.round((Math.random() * 2.5 + 0.5) * 100) / 100, // random 0.5–3.0
      };
    });

    return NextResponse.json(modelsWithUsage);
  } catch (error) {
    console.error("Failed to fetch models:", error);
    return NextResponse.json(
      { error: "Failed to fetch models" },
      { status: 500 }
    );
  }
}
