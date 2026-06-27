import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import {
  executeWorkflow,
  type WorkflowNode,
  type WorkflowEdge,
  type NodeExecutionRecord,
} from "@/lib/workflow-engine";

interface RouteParams {
  params: Promise<{ id: string }>;
}

// POST /api/workflows/[id]/run/stream — SSE streaming endpoint for workflow execution
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;

    // Optionally parse input from request body
    let input: Record<string, string> = {};
    try {
      const body = await request.json();
      if (body?.input && typeof body.input === "object") {
        input = body.input;
      }
    } catch {
      // No body or invalid JSON — use empty input
    }

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

    // Create WorkflowExecution record
    const execution = await db.workflowExecution.create({
      data: {
        workflowId: id,
        userId,
        status: "running",
        triggeredBy: "manual",
      },
    });

    const executionId = execution.id;

    // SSE helper: formats an event string
    function sseEvent(event: string, data: unknown): string {
      return `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
    }

    // Create a ReadableStream for the SSE response
    const stream = new ReadableStream({
      async start(controller) {
        const encoder = new TextEncoder();

        function send(event: string, data: unknown) {
          controller.enqueue(encoder.encode(sseEvent(event, data)));
        }

        // Collect node execution records for DB persistence after stream ends
        const nodeRecords: NodeExecutionRecord[] = [];

        try {
          const result = await executeWorkflow({
            nodes,
            edges,
            input,
            onNodeStart(nodeId: string, nodeType: string, label: string) {
              send("node_start", { nodeId, nodeType, label });
            },
            onNodeComplete(record: NodeExecutionRecord) {
              nodeRecords.push(record);
              send("node_complete", {
                nodeId: record.nodeId,
                status: record.status,
                output: record.output,
                durationMs: record.durationMs,
              });
            },
            onNodeError(nodeId: string, error: string) {
              send("node_error", { nodeId, error });
            },
          });

          // Persist all WorkflowNodeExecution records to DB
          for (const record of nodeRecords) {
            await db.workflowNodeExecution.create({
              data: {
                workflowExecId: executionId,
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

          // Update WorkflowExecution with final status
          const finalStatus =
            result.status === "partial" ? "failed" : result.status;
          await db.workflowExecution.update({
            where: { id: executionId },
            data: {
              status: finalStatus,
              durationMs: result.durationMs,
              result: JSON.stringify(result.finalOutput),
              error: result.error ?? null,
            },
          });

          // Send the final done event
          send("done", {
            executionId,
            status: finalStatus,
            durationMs: result.durationMs,
          });
        } catch (error) {
          const message =
            error instanceof Error ? error.message : "Unknown execution error";

          // Update WorkflowExecution with error
          await db.workflowExecution.update({
            where: { id: executionId },
            data: {
              status: "failed",
              error: message,
            },
          });

          send("error", { error: message });
        }

        controller.close();
      },
    });

    // Return the SSE streaming response with proper headers
    return new NextResponse(stream, {
      status: 200,
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache, no-transform",
        Connection: "keep-alive",
        "X-Accel-Buffering": "no",
      },
    });
  } catch (error) {
    console.error("Failed to stream workflow execution:", error);
    return NextResponse.json(
      { error: "Failed to stream workflow execution" },
      { status: 500 },
    );
  }
}
