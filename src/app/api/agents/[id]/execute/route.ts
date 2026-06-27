import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { executeAgent } from "@/lib/agent-engine";

interface RouteParams {
  params: Promise<{ id: string }>;
}

// POST /api/agents/[id]/execute — Execute agent with real LLM orchestration
export async function POST(
  request: NextRequest,
  { params }: RouteParams,
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { message, history } = body as {
      message?: string;
      history?: Array<{ role: string; content: string }>;
    };

    if (!message) {
      return NextResponse.json(
        { error: "Message is required" },
        { status: 400 },
      );
    }

    // 1. Fetch the agent from DB
    const agent = await db.agent.findUnique({ where: { id } });
    if (!agent) {
      return NextResponse.json(
        { error: "Agent not found" },
        { status: 404 },
      );
    }

    // 2. Parse agent tools configuration
    const toolIds: string[] = JSON.parse(agent.tools ?? "[]");

    // 3. Execute agent with real LLM orchestration
    const result = await executeAgent({
      agentId: agent.id,
      agentName: agent.name,
      model: agent.model,
      systemPrompt: agent.systemPrompt,
      toolIds,
      temperature: agent.temperature,
      maxTokens: agent.maxTokens,
      input: message,
      conversationHistory: history ?? [],
    });

    // 4. Get default userId (first user in DB)
    const firstUser = await db.user.findFirst({ select: { id: true } });
    const userId = agent.userId || firstUser?.id || "default-user";

    // 5. Save AgentExecution record with steps and toolCalls
    const execution = await db.agentExecution.create({
      data: {
        agentId: id,
        userId,
        input: message,
        output: result.output,
        toolsUsed: JSON.stringify(result.toolCalls.map((tc) => tc.toolId)),
        steps: JSON.stringify(result.steps),
        tokens: result.totalTokens,
        latencyMs: result.latencyMs,
        status: result.status,
      },
    });

    // 6. Save ToolCall records for each tool used
    if (result.toolCalls.length > 0) {
      await db.toolCall.createMany({
        data: result.toolCalls.map((tc) => ({
          agentExecutionId: execution.id,
          toolId: tc.toolId,
          toolName: tc.toolName,
          input: JSON.stringify(tc.input),
          output: tc.output,
          status: tc.status,
          latencyMs: tc.latencyMs,
          stepIndex: tc.stepIndex,
        })),
      });
    }

    // 7. Return structured response
    return NextResponse.json({
      response: result.output,
      toolsUsed: result.toolCalls.map((tc) => ({
        toolId: tc.toolId,
        toolName: tc.toolName,
        status: tc.status,
      })),
      tokens: result.totalTokens,
      latencyMs: result.latencyMs,
      steps: result.steps,
      executionId: execution.id,
    });
  } catch (error) {
    console.error("Failed to execute agent:", error);
    return NextResponse.json(
      { error: "Failed to execute agent" },
      { status: 500 },
    );
  }
}
