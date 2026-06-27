import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

interface RouteParams {
  params: Promise<{ id: string }>;
}

// GET /api/workflows/[id] — Get workflow by ID
export async function GET(_request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const workflow = await db.workflow.findUnique({
      where: { id },
      include: {
        _count: {
          select: { executions: true },
        },
      },
    });

    if (!workflow) {
      return NextResponse.json(
        { error: "Workflow not found" },
        { status: 404 },
      );
    }

    return NextResponse.json(workflow);
  } catch (error) {
    console.error("Failed to get workflow:", error);
    return NextResponse.json(
      { error: "Failed to get workflow" },
      { status: 500 },
    );
  }
}

// PUT /api/workflows/[id] — Update workflow (partial update)
export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const body = await request.json();

    const { name, description, status, nodes, edges } = body as {
      name?: string;
      description?: string | null;
      status?: string;
      nodes?: unknown;
      edges?: unknown;
    };

    // Verify the workflow exists
    const existing = await db.workflow.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json(
        { error: "Workflow not found" },
        { status: 404 },
      );
    }

    const updateData: Record<string, unknown> = {};
    if (name !== undefined) updateData.name = name;
    if (description !== undefined) updateData.description = description;
    if (status !== undefined) updateData.status = status;
    if (nodes !== undefined)
      updateData.nodes = typeof nodes === "string" ? nodes : JSON.stringify(nodes);
    if (edges !== undefined)
      updateData.edges = typeof edges === "string" ? edges : JSON.stringify(edges);

    const workflow = await db.workflow.update({
      where: { id },
      data: updateData,
    });

    return NextResponse.json(workflow);
  } catch (error) {
    console.error("Failed to update workflow:", error);
    return NextResponse.json(
      { error: "Failed to update workflow" },
      { status: 500 },
    );
  }
}

// DELETE /api/workflows/[id] — Delete workflow (cascades to executions)
export async function DELETE(
  _request: NextRequest,
  { params }: RouteParams,
) {
  try {
    const { id } = await params;

    const existing = await db.workflow.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json(
        { error: "Workflow not found" },
        { status: 404 },
      );
    }

    await db.workflow.delete({ where: { id } });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to delete workflow:", error);
    return NextResponse.json(
      { error: "Failed to delete workflow" },
      { status: 500 },
    );
  }
}