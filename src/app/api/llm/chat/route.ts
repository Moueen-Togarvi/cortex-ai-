import { NextRequest, NextResponse } from "next/server";
import { getDemoResponse, estimateTokens, estimateCost } from "@/lib/llm";

// POST /api/llm/chat — Direct LLM chat (used by agents, not conversations)
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { model, messages, temperature, maxTokens } = body;

    if (!model || !messages || !Array.isArray(messages)) {
      return NextResponse.json(
        { error: "model and messages are required" },
        { status: 400 }
      );
    }

    // Combine all messages for token estimation
    const combinedContent = messages
      .map((m: { role: string; content: string }) => m.content)
      .join(" ");

    const inputTokens = estimateTokens(combinedContent);

    // Call getDemoResponse() for a demo AI response
    const content = getDemoResponse();

    const outputTokens = estimateTokens(content);
    const cost = estimateCost(model, inputTokens, outputTokens);
    const totalTokens = inputTokens + outputTokens;

    return NextResponse.json({
      content,
      model,
      tokens: totalTokens,
      cost: Math.round(cost * 10000) / 10000, // round to 4 decimal places
    });
  } catch (error) {
    console.error("Failed to process chat request:", error);
    return NextResponse.json(
      { error: "Failed to process chat request" },
      { status: 500 }
    );
  }
}
