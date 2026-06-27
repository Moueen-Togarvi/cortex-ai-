import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

interface RouteParams {
  params: Promise<{ id: string }>;
}

// GET /api/agents/[id] — Get agent by ID
export async function GET(_request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const agent = await db.agent.findUnique({
      where: { id },
      include: {
        _count: {
          select: { executions: true },
        },
      },
    });

    if (!agent) {
      return NextResponse.json({ error: "Agent not found" }, { status: 404 });
    }

    return NextResponse.json(agent);
  } catch (error) {
    console.error("Failed to get agent:", error);
    return NextResponse.json(
      { error: "Failed to get agent" },
      { status: 500 },
    );
  }
}

// PUT /api/agents/[id] — Update agent (partial update)
export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
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
      description?: string | null;
      model?: string;
      systemPrompt?: string;
      tools?: string[];
      temperature?: number;
      maxTokens?: number;
      status?: string;
    };

    // Verify the agent exists
    const existing = await db.agent.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: "Agent not found" }, { status: 404 });
    }

    const updateData: Record<string, unknown> = {};
    if (name !== undefined) updateData.name = name;
    if (description !== undefined) updateData.description = description;
    if (model !== undefined) updateData.model = model;
    if (systemPrompt !== undefined) updateData.systemPrompt = systemPrompt;
    if (tools !== undefined) updateData.tools = JSON.stringify(tools);
    if (temperature !== undefined) updateData.temperature = temperature;
    if (maxTokens !== undefined) updateData.maxTokens = maxTokens;
    if (status !== undefined) updateData.status = status;

    const agent = await db.agent.update({
      where: { id },
      data: updateData,
    });

    return NextResponse.json(agent);
  } catch (error) {
    console.error("Failed to update agent:", error);
    return NextResponse.json(
      { error: "Failed to update agent" },
      { status: 500 },
    );
  }
}

// DELETE /api/agents/[id] — Delete agent (cascades to executions)
export async function DELETE(_request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;

    const existing = await db.agent.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: "Agent not found" }, { status: 404 });
    }

    await db.agent.delete({ where: { id } });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to delete agent:", error);
    return NextResponse.json(
      { error: "Failed to delete agent" },
      { status: 500 },
    );
  }
}