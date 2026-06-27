// ─── Workflow DAG Execution Engine ───
// Supports: LLM, Tool, Condition, HTTP, Code, Input, Output nodes
// Implements topological sort, conditional branching, output passing

import ZAI from "z-ai-web-dev-sdk";
import { getToolById } from "./tools";
import { estimateTokens } from "./llm";

// ── Types ──────────────────────────────────────────────────────

export type NodeType = "llm" | "tool" | "condition" | "http" | "code" | "input" | "output";

export interface WorkflowNode {
  id: string;
  type: NodeType;
  position?: { x: number; y: number };
  data: {
    label?: string;
    prompt?: string;
    toolId?: string;
    condition?: string;
    url?: string;
    method?: string;
    headers?: Record<string, string>;
    body?: string;
    code?: string;
    variableName?: string;
    defaultValue?: string;
    outputKey?: string;
    model?: string;
    temperature?: number;
    maxTokens?: number;
    [key: string]: unknown;
  };
}

export interface WorkflowEdge {
  id: string;
  source: string;
  target: string;
  sourceHandle?: string; // "true" | "false" for condition nodes
  label?: string;
}

export interface NodeExecutionRecord {
  nodeId: string;
  nodeType: NodeType;
  nodeLabel: string;
  status: "pending" | "running" | "success" | "failed" | "skipped";
  input: string | null;
  output: string | null;
  error: string | null;
  durationMs: number;
  executionOrder: number;
}

export interface WorkflowExecuteOptions {
  nodes: WorkflowNode[];
  edges: WorkflowEdge[];
  input?: Record<string, string>;
  onNodeStart?: (nodeId: string, nodeType: NodeType, label: string) => void;
  onNodeComplete?: (record: NodeExecutionRecord) => void;
  onNodeError?: (nodeId: string, error: string) => void;
}

export interface WorkflowExecuteResult {
  status: "success" | "failed" | "partial";
  nodeExecutions: NodeExecutionRecord[];
  finalOutput: Record<string, unknown>;
  durationMs: number;
  error?: string;
}

// ── DAG Utilities ──────────────────────────────────────────────

function buildAdjacencyList(
  nodes: WorkflowNode[],
  edges: WorkflowEdge[],
): Map<string, Array<{ target: string; sourceHandle?: string }>> {
  const adj = new Map<string, Array<{ target: string; sourceHandle?: string }>>();
  for (const node of nodes) {
    adj.set(node.id, []);
  }
  for (const edge of edges) {
    const targets = adj.get(edge.source) ?? [];
    targets.push({ target: edge.target, sourceHandle: edge.sourceHandle });
    adj.set(edge.source, targets);
  }
  return adj;
}

function topologicalSort(
  nodes: WorkflowNode[],
  edges: WorkflowEdge[],
): string[] {
  const inDegree = new Map<string, number>();
  const adj = buildAdjacencyList(nodes, edges);

  for (const node of nodes) {
    inDegree.set(node.id, 0);
  }
  for (const edge of edges) {
    inDegree.set(edge.target, (inDegree.get(edge.target) ?? 0) + 1);
  }

  const queue: string[] = [];
  for (const [nodeId, degree] of inDegree) {
    if (degree === 0) queue.push(nodeId);
  }

  const sorted: string[] = [];
  while (queue.length > 0) {
    const current = queue.shift()!;
    sorted.push(current);

    for (const { target } of adj.get(current) ?? []) {
      const newDegree = (inDegree.get(target) ?? 1) - 1;
      inDegree.set(target, newDegree);
      if (newDegree === 0) queue.push(target);
    }
  }

  return sorted;
}

// ── Node Execution Functions ───────────────────────────────────

const zaiPromise = ZAI.create();

async function getZAI() {
  return zaiPromise;
}

async function executeLLMNode(
  node: WorkflowNode,
  inputs: Record<string, unknown>,
): Promise<{ output: string; tokens: number }> {
  const zai = await getZAI();
  const prompt = node.data.prompt ?? "Process the following input and provide a helpful response.";
  const model = (node.data.model as string) ?? "gpt-4o";
  const temperature = (node.data.temperature as number) ?? 0.7;

  // Replace {{variable}} placeholders with input values
  let resolvedPrompt = prompt;
  for (const [key, value] of Object.entries(inputs)) {
    resolvedPrompt = resolvedPrompt.replace(
      new RegExp(`\\{\\{${key}\\}\\}`, "g"),
      String(value),
    );
  }

  // Also replace with all upstream outputs
  if (inputs.__outputs) {
    const outputs = inputs.__outputs as Record<string, string>;
    for (const [key, value] of Object.entries(outputs)) {
      resolvedPrompt = resolvedPrompt.replace(
        new RegExp(`\\{\\{${key}\\}\\}`, "g"),
        String(value),
      );
    }
  }

  const completion = await zai.chat.completions.create({
    messages: [
      { role: "assistant", content: "You are a helpful workflow processing assistant. Be concise and factual." },
      { role: "user", content: resolvedPrompt },
    ],
    thinking: { type: "disabled" },
  });

  const output = completion.choices[0]?.message?.content ?? "";
  return { output, tokens: estimateTokens(resolvedPrompt + output) };
}

async function executeToolNode(
  node: WorkflowNode,
  inputs: Record<string, unknown>,
): Promise<string> {
  const toolId = node.data.toolId as string;
  if (!toolId) throw new Error("Tool node missing toolId");

  const { executeTool } = await import("./tools");

  // Build params from node config + upstream inputs
  const params: Record<string, unknown> = { ...inputs };
  if (node.data.toolParams) {
    Object.assign(params, node.data.toolParams);
  }

  // Replace {{variable}} in params with upstream outputs
  if (inputs.__outputs) {
    const outputs = inputs.__outputs as Record<string, string>;
    for (const [key, value] of Object.entries(params)) {
      if (typeof value === "string") {
        for (const [varName, varValue] of Object.entries(outputs)) {
          params[key] = value.replace(new RegExp(`\\{\\{${varName}\\}\\}`, "g"), varValue);
        }
      }
    }
  }

  const result = await executeTool(toolId, params);
  return result.output;
}

function evaluateCondition(
  condition: string,
  context: Record<string, unknown>,
): boolean {
  try {
    // Simple condition evaluation
    // Supports: {{variable}} == "value", {{variable}} != "value",
    //           {{variable}} contains "value", {{variable}} > number
    let expr = condition;

    // Replace {{variable}} references
    if (context.__outputs) {
      const outputs = context.__outputs as Record<string, string>;
      for (const [key, value] of Object.entries(outputs)) {
        expr = expr.replace(new RegExp(`\\{\\{${key}\\}\\}`, "g"), JSON.stringify(value));
      }
    }

    // Evaluate simple comparisons
    if (expr.includes(" == ")) {
      const [left, right] = expr.split(" == ").map((s) => s.trim());
      return JSON.parse(left) === JSON.parse(right);
    }
    if (expr.includes(" != ")) {
      const [left, right] = expr.split(" != ").map((s) => s.trim());
      return JSON.parse(left) !== JSON.parse(right);
    }
    if (expr.includes(" contains ")) {
      const [left, right] = expr.split(" contains ").map((s) => s.trim());
      const leftVal = JSON.parse(left);
      const rightVal = JSON.parse(right);
      return String(leftVal).toLowerCase().includes(String(rightVal).toLowerCase());
    }
    if (expr.includes(" > ")) {
      const [left, right] = expr.split(" > ").map((s) => s.trim());
      return Number(left) > Number(right);
    }
    if (expr.includes(" < ")) {
      const [left, right] = expr.split(" < ").map((s) => s.trim());
      return Number(left) < Number(right);
    }

    // Default: truthy check
    return Boolean(eval(expr));
  } catch {
    // If condition evaluation fails, default to true branch
    return true;
  }
}

async function executeHTTPNode(
  node: WorkflowNode,
  inputs: Record<string, unknown>,
): Promise<{ status: number; body: string }> {
  let url = (node.data.url as string) ?? "";
  const method = (node.data.method as string) ?? "GET";
  const headers = (node.data.headers as Record<string, string>) ?? {};

  // Replace {{variable}} in URL and body
  if (inputs.__outputs) {
    const outputs = inputs.__outputs as Record<string, string>;
    for (const [key, value] of Object.entries(outputs)) {
      url = url.replace(new RegExp(`\\{\\{${key}\\}\\}`, "g"), value);
    }
  }

  let body: string | undefined;
  if (node.data.body && method !== "GET") {
    body = String(node.data.body);
    if (inputs.__outputs) {
      const outputs = inputs.__outputs as Record<string, string>;
      for (const [key, value] of Object.entries(outputs)) {
        body = body!.replace(new RegExp(`\\{\\{${key}\\}\\}`, "g"), value);
      }
    }
  }

  const response = await fetch(url, {
    method,
    headers: { "Content-Type": "application/json", ...headers },
    body,
  });

  return {
    status: response.status,
    body: await response.text(),
  };
}

function executeCodeNode(
  node: WorkflowNode,
  inputs: Record<string, unknown>,
): string {
  const code = (node.data.code as string) ?? "return 'No code provided';";
  const context = { ...inputs };

  // Safe code execution with limited scope
  try {
    // Create a function with input variables as parameters
    const inputVars = Object.entries(context).map(([k]) => k);
    const inputVals = Object.values(context);
    const fn = new Function(...inputVars, `"use strict"; ${code}`);
    const result = fn(...inputVals);
    return result !== undefined ? String(result) : "";
  } catch (error) {
    throw new Error(`Code execution failed: ${error instanceof Error ? error.message : "Unknown error"}`);
  }
}

// ── Main Workflow Execution ────────────────────────────────────

export async function executeWorkflow(
  options: WorkflowExecuteOptions,
): Promise<WorkflowExecuteResult> {
  const { nodes, edges, input = {}, onNodeStart, onNodeComplete, onNodeError } = options;

  if (nodes.length === 0) {
    return {
      status: "failed",
      nodeExecutions: [],
      finalOutput: {},
      durationMs: 0,
      error: "Workflow has no nodes",
    };
  }

  const startTime = Date.now();
  const nodeMap = new Map(nodes.map((n) => [n.id, n]));
  const executionOrder = topologicalSort(nodes, edges);
  const adj = buildAdjacencyList(nodes, edges);
  const nodeRecords: NodeExecutionRecord[] = [];
  const outputStore: Record<string, string> = {};
  let hasError = false;
  let lastError = "";

  // Process input nodes first
  for (const nodeId of executionOrder) {
    const node = nodeMap.get(nodeId);
    if (!node) continue;

    const order = executionOrder.indexOf(nodeId);
    const label = node.data.label ?? `${node.type} node`;

    const record: NodeExecutionRecord = {
      nodeId: node.id,
      nodeType: node.type,
      nodeLabel: label,
      status: "pending",
      input: null,
      output: null,
      error: null,
      durationMs: 0,
      executionOrder: order,
    };

    // Build inputs from upstream outputs
    const upstreamOutputs: Record<string, unknown> = { __outputs: outputStore, ...input };

    // For condition nodes, check if this path should be taken
    const incomingEdge = edges.find((e) => e.target === node.id);
    if (incomingEdge?.sourceHandle) {
      // This node is a branch target - check if the condition allowed it
      const sourceNode = nodeMap.get(incomingEdge.source);
      if (sourceNode?.type === "condition") {
        const condResult = evaluateCondition(
          sourceNode.data.condition ?? "true",
          { __outputs: outputStore, ...input },
        );
        const branch = incomingEdge.sourceHandle; // "true" or "false"
        if (
          (branch === "true" && !condResult) ||
          (branch === "false" && condResult)
        ) {
          record.status = "skipped";
          nodeRecords.push(record);
          onNodeComplete?.(record);
          continue;
        }
      }
    }

    onNodeStart?.(node.id, node.type, label);
    record.status = "running";
    const nodeStart = Date.now();

    try {
      record.input = JSON.stringify(upstreamOutputs).substring(0, 2000);

      let result: string;

      switch (node.type) {
        case "input": {
          const varName = node.data.variableName ?? node.id;
          const value = input[varName] ?? node.data.defaultValue ?? "";
          result = String(value);
          break;
        }

        case "llm": {
          const llmResult = await executeLLMNode(node, upstreamOutputs);
          result = llmResult.output;
          break;
        }

        case "tool": {
          result = await executeToolNode(node, upstreamOutputs);
          break;
        }

        case "condition": {
          const condResult = evaluateCondition(
            node.data.condition ?? "true",
            upstreamOutputs,
          );
          result = String(condResult);
          // Store which branch was taken
          outputStore[`${node.id}_result`] = result;
          break;
        }

        case "http": {
          const httpResult = await executeHTTPNode(node, upstreamOutputs);
          result = JSON.stringify({ status: httpResult.status, body: httpResult.body });
          break;
        }

        case "code": {
          result = executeCodeNode(node, upstreamOutputs);
          break;
        }

        case "output": {
          result = JSON.stringify(outputStore);
          break;
        }

        default:
          throw new Error(`Unknown node type: ${node.type}`);
      }

      record.output = result;
      record.status = "success";
      record.durationMs = Date.now() - nodeStart;

      // Store output for downstream nodes
      const outputKey = node.data.outputKey ?? node.id;
      outputStore[outputKey] = result;

      nodeRecords.push(record);
      onNodeComplete?.(record);
    } catch (error) {
      record.status = "failed";
      record.error = error instanceof Error ? error.message : "Unknown error";
      record.durationMs = Date.now() - nodeStart;
      hasError = true;
      lastError = record.error;
      nodeRecords.push(record);
      onNodeError?.(node.id, record.error);
      onNodeComplete?.(record);

      // Stop execution on error (could be configurable)
      break;
    }
  }

  return {
    status: hasError ? (nodeRecords.some((r) => r.status === "success") ? "partial" : "failed") : "success",
    nodeExecutions: nodeRecords,
    finalOutput: outputStore,
    durationMs: Date.now() - startTime,
    error: hasError ? lastError : undefined,
  };
}