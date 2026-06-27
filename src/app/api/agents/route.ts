import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

// GET /api/agents — List all agents with execution count
export async function GET() {
  try {
    const agents = await db.agent.findMany({
      include: {
        _count: {
          select: { executions: true },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(agents);
  } catch (error) {
    console.error("Failed to list agents:", error);
    return NextResponse.json(
      { error: "Failed to list agents" },
      { status: 500 },
    );
  }
}

// POST /api/agents — Create a new agent
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const {
      name,
      description,
      model,
      systemPrompt,
      tools,
      temperature,
      maxTokens,
      status,
    } = body as {
      name?: string;
      description?: string;
      model?: string;
      systemPrompt?: string;
      tools?: string[];
      temperature?: number;
      maxTokens?: number;
      status?: string;
    };

    if (!name) {
      return NextResponse.json({ error: "Name is required" }, { status: 400 });
    }

    // Use the first user as a default userId for creation
    const firstUser = await db.user.findFirst({ select: { id: true } });
    const userId = firstUser?.id ?? "default-user";

    const agent = await db.agent.create({
      data: {
        name,
        description: description ?? null,
        model: model ?? "gpt-4o",
        systemPrompt: systemPrompt ?? "",
        tools: tools ? JSON.stringify(tools) : "[]",
        temperature: temperature ?? 0.7,
        maxTokens: maxTokens ?? 4096,
        status: status ?? "draft",
        userId,
      },
    });

    return NextResponse.json(agent, { status: 201 });
  } catch (error) {
    console.error("Failed to create agent:", error);
    return NextResponse.json(
      { error: "Failed to create agent" },
      { status: 500 },
    );
  }
}