import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { estimateTokens, estimateCost } from "@/lib/llm";
import { recordTrace } from "@/lib/tracing";
import { evaluateGuardrails } from "@/lib/guardrails";
import ZAI from "z-ai-web-dev-sdk";

// POST /api/conversations/[id]/messages/stream — SSE streaming endpoint for chat
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { content, model: overrideModel } = body as { content?: string; model?: string };

    if (!content || typeof content !== "string") {
      return new Response(JSON.stringify({ error: "Message content is required" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    // 1. Verify conversation exists
    const conversation = await db.conversation.findUnique({
      where: { id },
    });

    if (!conversation) {
      return new Response(JSON.stringify({ error: "Conversation not found" }), {
        status: 404,
        headers: { "Content-Type": "application/json" },
      });
    }

    // 2. Determine the model to use
    const activeModel = overrideModel || conversation.model;

    // 3. Save user message to DB immediately
    const userTokens = estimateTokens(content);
    await db.message.create({
      data: {
        conversationId: id,
        role: "user",
        content,
        tokens: userTokens,
      },
    });

    // 4. Get recent conversation history (last 10 messages)
    const recentMessages = await db.message.findMany({
      where: { conversationId: id },
      orderBy: { createdAt: "asc" },
      take: 10,
      select: { role: true, content: true },
    });

    // 5. Build messages array for SDK
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

    // 6. Create SSE streaming response
    const stream = new ReadableStream({
      async start(controller) {
        const encoder = new TextEncoder();

        function sendSSE(event: string, data: unknown) {
          controller.enqueue(
            encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`)
          );
        }

        const traceStartTime = Date.now();

        try {
          // Run guardrails on input
          let guardrailResult = null;
          try {
            guardrailResult = await evaluateGuardrails(content, "chat");
          } catch { /* non-blocking */ }

          // Call the real LLM via z-ai-web-dev-sdk
          const zai = await ZAI.create();
          const completion = await zai.chat.completions.create({
            messages: sdkMessages,
            thinking: { type: "disabled" },
          });

          const traceLatency = Date.now() - traceStartTime;

          const fullContent = completion.choices[0]?.message?.content ?? "";

          // Stream the complete response as chunks (simulate streaming by splitting)
          // If the SDK supports native streaming we'd use it, but we chunk the full response
          const chunkSize = 8; // characters per chunk for smooth typing effect
          for (let i = 0; i < fullContent.length; i += chunkSize) {
            const chunk = fullContent.substring(i, i + chunkSize);
            sendSSE("token", { content: chunk });
            // Small delay for smooth UX
            await new Promise((r) => setTimeout(r, 10));
          }

          // Calculate tokens and cost
          const assistantTokens = estimateTokens(fullContent);
          const totalTokens = userTokens + assistantTokens;
          const cost = estimateCost(activeModel, userTokens, assistantTokens);

          // Save assistant message to DB
          const assistantMessage = await db.message.create({
            data: {
              conversationId: id,
              role: "assistant",
              content: fullContent,
              model: activeModel,
              tokens: assistantTokens,
            },
          });

          // Update conversation's updatedAt
          await db.conversation.update({
            where: { id },
            data: { updatedAt: new Date() },
          });

          // Update LLMUsage tracking (today's date)
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

          // Fire-and-forget: record trace
          recordTrace({
            source: "chat",
            sourceId: id,
            model: activeModel,
            input: content,
            output: fullContent,
            inputTokens: userTokens,
            outputTokens: assistantTokens,
            latencyMs: traceLatency,
            status: "success",
            metadata: { guardrails: guardrailResult?.passed, guardrailBlocked: guardrailResult?.blocked },
          }).catch(() => {});

          // Send done event with message ID and token count
          sendSSE("done", {
            messageId: assistantMessage.id,
            tokens: totalTokens,
            guardrails: guardrailResult ? { enabled: true, passed: guardrailResult.passed, blocked: guardrailResult.blocked, evaluations: guardrailResult.results.length } : { enabled: false },
          });

          controller.close();
        } catch (error) {
          console.error("Streaming error:", error);
          // Fire-and-forget: record error trace
          recordTrace({
            source: "chat",
            sourceId: id,
            model: activeModel,
            input: content,
            inputTokens: userTokens,
            outputTokens: 0,
            latencyMs: Date.now() - traceStartTime,
            status: "error",
            errorMessage: error instanceof Error ? error.message : "Unknown error",
          }).catch(() => {});
          sendSSE("error", {
            error: error instanceof Error ? error.message : "Unknown streaming error",
          });
          controller.close();
        }
      },
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    });
  } catch (error) {
    console.error("Failed to start streaming:", error);
    return new Response(
      JSON.stringify({ error: "Failed to start streaming" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}
