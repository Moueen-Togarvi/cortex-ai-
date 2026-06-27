import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

// GET /api/workflows — List all workflows with execution count and last run
export async function GET() {
  try {
    const workflows = await db.workflow.findMany({
      include: {
        _count: {
          select: { executions: true },
        },
        executions: {
          take: 1,
          orderBy: { createdAt: "desc" },
          select: {
            id: true,
            status: true,
            createdAt: true,
            durationMs: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    const mapped = workflows.map((wf) => ({
      ...wf,
      lastRun: wf.executions[0] ?? null,
      executions: wf._count.executions,
    }));

    return NextResponse.json(mapped);
  } catch (error) {
    console.error("Failed to list workflows:", error);
    return NextResponse.json(
      { error: "Failed to list workflows" },
      { status: 500 },
    );
  }
}

// POST /api/workflows — Create a new workflow
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const { name, description, status, nodes, edges } = body as {
      name?: string;
      description?: string;
      status?: string;
      nodes?: unknown;
      edges?: unknown;
    };

    if (!name) {
      return NextResponse.json(
        { error: "Name is required" },
        { status: 400 },
      );
    }

    // Use the first user as a default userId for creation
    const firstUser = await db.user.findFirst({ select: { id: true } });
    const userId = firstUser?.id ?? "default-user";

    const workflow = await db.workflow.create({
      data: {
        name,
        description: description ?? null,
        status: status ?? "draft",
        nodes: typeof nodes === "string" ? nodes : JSON.stringify(nodes ?? []),
        edges: typeof edges === "string" ? edges : JSON.stringify(edges ?? []),
        userId,
      },
    });

    return NextResponse.json(workflow, { status: 201 });
  } catch (error) {
    console.error("Failed to create workflow:", error);
    return NextResponse.json(
      { error: "Failed to create workflow" },
      { status: 500 },
    );
  }
}