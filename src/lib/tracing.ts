// ─── LLM Call Tracing Library ───
// Records every LLM call with full context for observability

import { db } from "./db";
import { estimateCost } from "./llm";

export interface TraceRecord {
  source: "chat" | "agent" | "workflow" | "rag";
  sourceId?: string;
  model: string;
  input: string;
  output?: string;
  inputTokens: number;
  outputTokens: number;
  latencyMs: number;
  status: "success" | "error" | "timeout" | "filtered";
  errorMessage?: string;
  userId?: string;
  parentId?: string;
  metadata?: Record<string, unknown>;
}

interface RecordedTrace {
  id: string;
  traceId: string;
  spanId: string;
}

// Generate a trace ID (simulating OpenTelemetry format)
function generateTraceId(): string {
  const chars = "0123456789abcdef";
  let id = "";
  for (let i = 0; i < 32; i++) {
    id += chars[Math.floor(Math.random() * 16)];
  }
  return id;
}

// Generate a span ID
function generateSpanId(): string {
  const chars = "0123456789abcdef";
  let id = "";
  for (let i = 0; i < 16; i++) {
    id += chars[Math.floor(Math.random() * 16)];
  }
  return id;
}

// Record a trace to the database (fire-and-forget)
export async function recordTrace(data: TraceRecord): Promise<RecordedTrace> {
  const traceId = data.parentId ? await getTraceIdForSpan(data.parentId) : generateTraceId();
  const spanId = generateSpanId();
  const cost = estimateCost(data.model, data.inputTokens, data.outputTokens);

  try {
    await db.trace.create({
      data: {
        traceId,
        spanId,
        parentId: data.parentId,
        source: data.source,
        sourceId: data.sourceId,
        model: data.model,
        input: data.input,
        output: data.output,
        inputTokens: data.inputTokens,
        outputTokens: data.outputTokens,
        totalTokens: data.inputTokens + data.outputTokens,
        latencyMs: data.latencyMs,
        cost,
        status: data.status,
        errorMessage: data.errorMessage,
        metadata: JSON.stringify(data.metadata ?? {}),
        userId: data.userId,
      },
    });
  } catch (error) {
    console.error("[Trace] Failed to record trace:", error);
  }

  return { id: traceId, traceId, spanId };
}

// Get the parent trace ID for a given span ID
async function getTraceIdForSpan(spanId: string): Promise<string> {
  try {
    const trace = await db.trace.findFirst({ where: { spanId }, select: { traceId: true } });
    return trace?.traceId ?? generateTraceId();
  } catch {
    return generateTraceId();
  }
}

// Create a traced LLM call wrapper
export async function traceLLMCall<T>(
  params: {
    source: TraceRecord["source"];
    sourceId?: string;
    model: string;
    input: string;
    userId?: string;
    parentId?: string;
    metadata?: Record<string, unknown>;
  },
  fn: () => Promise<{ output: string; inputTokens: number; outputTokens: number }>,
): Promise<T & { _trace: RecordedTrace }> {
  const startTime = Date.now();
  let traceData: RecordedTrace | undefined;

  try {
    const result = await fn();
    const latencyMs = Date.now() - startTime;

    traceData = await recordTrace({
      ...params,
      output: result.output,
      inputTokens: result.inputTokens,
      outputTokens: result.outputTokens,
      latencyMs,
      status: "success",
    });

    return { ...result, _trace: traceData } as T & { _trace: RecordedTrace };
  } catch (error) {
    const latencyMs = Date.now() - startTime;

    traceData = await recordTrace({
      ...params,
      inputTokens: 0,
      outputTokens: 0,
      latencyMs,
      status: "error",
      errorMessage: error instanceof Error ? error.message : "Unknown error",
    });

    throw error;
  }
}

// Seed demo traces for dashboard
export async function seedDemoTraces(): Promise<void> {
  const count = await db.trace.count();
  if (count > 0) return;

  const models = ["gpt-4o", "gpt-4o-mini", "claude-sonnet-4-20250514", "gemini-2.0-flash", "deepseek-chat"];
  const sources: Array<TraceRecord["source"]> = ["chat", "agent", "workflow", "rag"];
  const statuses: Array<TraceRecord["status"]> = ["success", "success", "success", "success", "success", "error", "timeout"];

  const now = Date.now();
  const traces: Array<{
    traceId: string;
    spanId: string;
    parentId?: string | null;
    source: string;
    sourceId?: string | null;
    model: string;
    input: string;
    output?: string | null;
    inputTokens: number;
    outputTokens: number;
    totalTokens: number;
    latencyMs: number;
    cost: number;
    status: string;
    errorMessage?: string | null;
    metadata: string;
    createdAt: Date;
  }> = [];

  for (let i = 0; i < 200; i++) {
    const model = models[Math.floor(Math.random() * models.length)];
    const source = sources[Math.floor(Math.random() * sources.length)];
    const status = statuses[Math.floor(Math.random() * statuses.length)];
    const inputTokens = Math.floor(Math.random() * 2000) + 100;
    const outputTokens = Math.floor(Math.random() * 1500) + 50;
    const latencyMs = Math.floor(Math.random() * 5000) + 200;
    const cost = estimateCost(model, inputTokens, outputTokens);

    const hoursAgo = Math.floor(Math.random() * 168); // up to 7 days
    const createdAt = new Date(now - hoursAgo * 3600 * 1000);

    traces.push({
      traceId: generateTraceId(),
      spanId: generateSpanId(),
      source,
      model,
      input: `User query ${i + 1}: ${["Explain microservices architecture", "Write a Python function for data processing", "Analyze this sales data", "Create a marketing strategy", "Debug this TypeScript error", "Summarize the quarterly report", "Design a database schema for e-commerce", "Help me write unit tests", "Review this code for security issues", "Optimize this SQL query"][i % 10]}`,
      output: status === "success" ? `Response ${i + 1}: Based on my analysis... [detailed response]` : null,
      inputTokens,
      outputTokens,
      totalTokens: inputTokens + outputTokens,
      latencyMs,
      cost,
      status,
      errorMessage: status === "error" ? "API rate limit exceeded" : status === "timeout" ? "Request timed out after 30s" : null,
      metadata: JSON.stringify({ temperature: 0.7, stream: true }),
      createdAt,
    });
  }

  // Sort by createdAt ascending for insertion
  traces.sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());

  // Insert in batches
  const BATCH_SIZE = 50;
  for (let i = 0; i < traces.length; i += BATCH_SIZE) {
    const batch = traces.slice(i, i + BATCH_SIZE);
    await db.trace.createMany({ data: batch as never });
  }
}