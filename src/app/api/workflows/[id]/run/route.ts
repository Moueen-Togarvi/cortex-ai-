import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import {
  executeWorkflow,
  type WorkflowNode,
  type WorkflowEdge,
} from "@/lib/workflow-engine";

interface RouteParams {
  params: Promise<{ id: string }>;
}

// POST /api/workflows/[id]/run — Execute a workflow
export async function POST(_request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;

    // Fetch the workflow (include user relation)
    const workflow = await db.workflow.findUnique({
      where: { id },
      include: { user: true },
    });
    if (!workflow) {
      return NextResponse.json(
        { error: "Workflow not found" },
        { status: 404 },
      );
    }

    // Use first user as default userId
    const firstUser = await db.user.findFirst({ select: { id: true } });
    const userId = workflow.userId ?? firstUser?.id ?? "default-user";

    // Parse nodes and edges from JSON strings
    const nodes: WorkflowNode[] = JSON.parse(workflow.nodes ?? "[]");
    const edges: WorkflowEdge[] = JSON.parse(workflow.edges ?? "[]");

    // Create WorkflowExecution record with status "running"
    const execution = await db.workflowExecution.create({
      data: {
        workflowId: id,
        userId,
        status: "running",
        triggeredBy: "manual",
      },
    });

    // Execute the workflow using the workflow engine
    const result = await executeWorkflow({ nodes, edges });

    // Create WorkflowNodeExecution records for each node execution
    for (const record of result.nodeExecutions) {
      await db.workflowNodeExecution.create({
        data: {
          workflowExecId: execution.id,
          nodeId: record.nodeId,
          nodeType: record.nodeType,
          nodeLabel: record.nodeLabel,
          status: record.status,
          input: record.input,
          output: record.output,
          error: record.error,
          durationMs: record.durationMs,
          executionOrder: record.executionOrder,
        },
      });
    }

    // Update the WorkflowExecution with final status, durationMs, result, error
    const updatedExecution = await db.workflowExecution.update({
      where: { id: execution.id },
      data: {
        status: result.status === "partial" ? "failed" : result.status,
        durationMs: result.durationMs,
        result: JSON.stringify(result.finalOutput),
        error: result.error ?? null,
      },
    });

    // Return the execution result
    return NextResponse.json({
      executionId: updatedExecution.id,
      status: updatedExecution.status,
      durationMs: updatedExecution.durationMs,
      result: result.finalOutput,
      nodeExecutions: result.nodeExecutions.map((r) => ({
        nodeId: r.nodeId,
        nodeType: r.nodeType,
        nodeLabel: r.nodeLabel,
        status: r.status,
        output: r.output,
        durationMs: r.durationMs,
      })),
    });
  } catch (error) {
    console.error("Failed to run workflow:", error);
    return NextResponse.json(
      { error: "Failed to run workflow" },
      { status: 500 },
    );
  }
}
