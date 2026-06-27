import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { estimateTokens, estimateCost, getModelById } from "@/lib/llm";
import ZAI from "z-ai-web-dev-sdk";

// POST /api/conversations/[id]/messages — Send a message and get AI response
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { content, model: overrideModel } = body as { content?: string; model?: string };

    if (!content || typeof content !== "string") {
      return NextResponse.json(
        { error: "Message content is required" },
        { status: 400 }
      );
    }

    // 1. Verify conversation exists
    const conversation = await db.conversation.findUnique({
      where: { id },
    });

    if (!conversation) {
      return NextResponse.json(
        { error: "Conversation not found" },
        { status: 404 }
      );
    }

    // 2. Determine the model to use (override or conversation default)
    const activeModel = overrideModel || conversation.model;
    const modelDef = getModelById(activeModel);

    // 3. Create user message in DB
    const userTokens = estimateTokens(content);
    const userMessage = await db.message.create({
      data: {
        conversationId: id,
        role: "user",
        content,
        tokens: userTokens,
      },
    });

    // 4. Get recent conversation history (last 10 messages) for context
    const recentMessages = await db.message.findMany({
      where: { conversationId: id },
      orderBy: { createdAt: "asc" },
      take: 10,
      select: { role: true, content: true },
    });

    // 5. Build messages array for the SDK
    // System prompt role must be "assistant" per SDK requirement
    const systemPrompt =
      "You are a helpful AI assistant. Be concise, accurate, and well-organized. Use markdown formatting when appropriate.";

    const sdkMessages: Array<{ role: "user" | "assistant"; content: string }> = [
      { role: "assistant", content: systemPrompt },
      ...recentMessages
        .filter((m) => m.role === "user" || m.role === "assistant")
        .map((m) => ({
          role: m.role as "user" | "assistant",
          content: m.content,
        })),
    ];

    // 6. Call the real LLM via z-ai-web-dev-sdk
    const zai = await ZAI.create();
    const completion = await zai.chat.completions.create({
      messages: sdkMessages,
      thinking: { type: "disabled" },
    });
    const responseContent = completion.choices[0]?.message?.content ?? "";

    // 7. Estimate tokens and cost
    const assistantTokens = estimateTokens(responseContent);
    const totalTokens = userTokens + assistantTokens;
    const cost = estimateCost(activeModel, userTokens, assistantTokens);

    // 8. Create assistant message in DB
    const assistantMessage = await db.message.create({
      data: {
        conversationId: id,
        role: "assistant",
        content: responseContent,
        model: activeModel,
        tokens: assistantTokens,
      },
    });

    // 9. Update conversation's updatedAt
    await db.conversation.update({
      where: { id },
      data: { updatedAt: new Date() },
    });

    // 10. Update LLMUsage tracking (today's date)
    const today = new Date().toISOString().split("T")[0];
    const existingUsage = await db.lLMUsage.findFirst({
      where: { date: today, model: activeModel },
    });

    if (existingUsage) {
      await db.lLMUsage.update({
        where: { id: existingUsage.id },
        data: {
          tokens: existingUsage.tokens + totalTokens,
          cost: Math.round((existingUsage.cost + cost) * 10000) / 10000,
          requests: existingUsage.requests + 1,
        },
      });
    } else {
      await db.lLMUsage.create({
        data: {
          date: today,
          tokens: totalTokens,
          cost: Math.round(cost * 10000) / 10000,
          requests: 1,
          model: activeModel,
        },
      });
    }

    return NextResponse.json(
      { userMessage, assistantMessage },
      { status: 201 }
    );
  } catch (error) {
    console.error("Failed to send message:", error);
    return NextResponse.json(
      { error: "Failed to send message" },
      { status: 500 }
    );
  }
}
