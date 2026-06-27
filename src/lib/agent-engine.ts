// ─── Agent Orchestration Engine ───
// LangGraph-style ReAct (Reasoning + Acting) loop with real LLM integration
// Uses z-ai-web-dev-sdk for LLM calls

import ZAI from "z-ai-web-dev-sdk";
import { getToolById, toolRegistry, type ToolDefinition } from "./tools";
import { estimateTokens } from "./llm";

// ── Types ──────────────────────────────────────────────────────

export type AgentStepStatus =
  | "thinking"
  | "tool_call"
  | "tool_result"
  | "responding"
  | "done"
  | "error";

export interface ReasoningStep {
  step: number;
  type: "thinking" | "tool_call" | "tool_result" | "responding" | "error";
  content: string;
  toolId?: string;
  toolName?: string;
  toolInput?: Record<string, unknown>;
  toolOutput?: string;
  durationMs?: number;
}

export interface AgentExecuteOptions {
  agentId: string;
  agentName: string;
  model: string;
  systemPrompt: string;
  toolIds: string[];
  temperature?: number;
  maxTokens?: number;
  maxSteps?: number;
  input: string;
  conversationHistory?: Array<{ role: string; content: string }>;
  onStep?: (step: ReasoningStep) => void;
}

export interface AgentExecuteResult {
  output: string;
  steps: ReasoningStep[];
  toolCalls: Array<{
    toolId: string;
    toolName: string;
    input: Record<string, unknown>;
    output: string;
    status: string;
    latencyMs: number;
    stepIndex: number;
  }>;
  totalTokens: number;
  latencyMs: number;
  status: "success" | "error" | "timeout";
}

// ── ReAct Loop ─────────────────────────────────────────────────

async function callLLM(
  zai: Awaited<ReturnType<typeof ZAI.create>>,
  messages: Array<{ role: string; content: string }>,
): Promise<string> {
  const completion = await zai.chat.completions.create({
    messages: messages.map((m) => ({
      role: m.role as "user" | "assistant",
      content: m.content,
    })),
    thinking: { type: "disabled" },
  });
  return completion.choices[0]?.message?.content ?? "";
}

function buildToolSection(tools: ToolDefinition[]): string {
  if (tools.length === 0) return "";
  const toolDefs = tools
    .map((t) => {
      const params = t.parameters
        .map((p) => `    - ${p.name} (${p.type}${p.required ? ", required" : ""}): ${p.description}${p.default !== undefined ? ` [default: ${p.default}]` : ""}`)
        .join("\n");
      return `  - ${t.id} (${t.name}): ${t.description}\n    Parameters:\n${params}`;
    })
    .join("\n\n");
  return `
## Available Tools

You have access to the following tools. When you need to use a tool, you MUST respond with a JSON block in this EXACT format:

\`\`\`tool_call
{"tool": "tool_id", "parameters": {"param1": "value1"}}
\`\`\`

You can call MULTIPLE tools in one response by including multiple tool_call blocks.

Tools available:
${toolDefs}

IMPORTANT: Always use tool_call blocks when you need to call a tool. After receiving tool results, analyze them and respond to the user.`;
}

function parseToolCalls(response: string): Array<{
  toolId: string;
  parameters: Record<string, unknown>;
}> {
  const calls: Array<{ toolId: string; parameters: Record<string, unknown> }> = [];
  // Match ```tool_call ... ``` blocks
  const regex = /```tool_call\s*\n?([\s\S]*?)```/g;
  let match;

  while ((match = regex.exec(response)) !== null) {
    try {
      const parsed = JSON.parse(match[1].trim());
      if (parsed.tool && typeof parsed.tool === "string") {
        calls.push({
          toolId: parsed.tool,
          parameters: parsed.parameters ?? {},
        });
      }
    } catch {
      // Skip malformed JSON
    }
  }

  // Also try to parse if the entire response is just JSON
  if (calls.length === 0) {
    try {
      const parsed = JSON.parse(response.trim());
      if (parsed.tool && typeof parsed.tool === "string") {
        calls.push({
          toolId: parsed.tool,
          parameters: parsed.parameters ?? {},
        });
      }
    } catch {
      // Not JSON, no tool calls
    }
  }

  return calls;
}

function stripToolCallBlocks(text: string): string {
  // Remove tool_call code blocks from the response
  return text
    .replace(/```tool_call\s*\n?[\s\S]*?```/g, "")
    .trim();
}

// ── Main Agent Execution ──────────────────────────────────────

export async function executeAgent(
  options: AgentExecuteOptions,
): Promise<AgentExecuteResult> {
  const {
    model,
    systemPrompt,
    toolIds,
    maxSteps = 8,
    input,
    conversationHistory = [],
    onStep,
  } = options;

  const startTime = Date.now();
  const steps: ReasoningStep[] = [];
  const toolCallResults: AgentExecuteResult["toolCalls"] = [];
  let totalTokens = 0;
  const zai = await ZAI.create();

  // Build tool definitions
  const tools = toolIds
    .map((id) => getToolById(id))
    .filter((t): t is ToolDefinition => t !== undefined);

  const toolSection = buildToolSection(tools);

  // Build system prompt with tool context
  const fullSystemPrompt = `${systemPrompt}

You are an AI agent operating in a ReAct (Reasoning + Acting) loop. Follow this process:
1. Think about the user's request
2. If you need information or need to perform an action, use the available tools
3. Analyze tool results and continue reasoning
4. Provide a comprehensive final answer

${toolSection}

When you have enough information to answer the user, provide your final response WITHOUT using any tool_call blocks.`;

  // Build initial messages
  const messages: Array<{ role: string; content: string }> = [
    { role: "assistant", content: fullSystemPrompt },
  ];

  // Add conversation history if provided
  for (const msg of conversationHistory) {
    if (msg.role === "user" || msg.role === "assistant") {
      messages.push(msg);
    }
  }

  // Add current user input
  messages.push({ role: "user", content: input });

  // ReAct loop
  for (let step = 0; step < maxSteps; step++) {
    const stepStart = Date.now();

    try {
      // Step 1: Call LLM
      const thinkStep: ReasoningStep = {
        step,
        type: "thinking",
        content: "Analyzing request and deciding next action...",
        durationMs: 0,
      };
      onStep?.(thinkStep);

      const llmResponse = await callLLM(zai, messages);
      totalTokens += estimateTokens(llmResponse);

      thinkStep.content = llmResponse.substring(0, 200) + (llmResponse.length > 200 ? "..." : "");
      thinkStep.durationMs = Date.now() - stepStart;
      steps.push(thinkStep);

      // Step 2: Check for tool calls
      const parsedCalls = parseToolCalls(llmResponse);

      if (parsedCalls.length === 0) {
        // No tool calls - this is the final response
        const respondStep: ReasoningStep = {
          step,
          type: "responding",
          content: stripToolCallBlocks(llmResponse),
          durationMs: 0,
        };
        steps.push(respondStep);
        onStep?.(respondStep);

        return {
          output: stripToolCallBlocks(llmResponse),
          steps,
          toolCalls: toolCallResults,
          totalTokens,
          latencyMs: Date.now() - startTime,
          status: "success",
        };
      }

      // Step 3: Execute tools
      // Remove tool calls from response and add as assistant message
      const cleanResponse = stripToolCallBlocks(llmResponse);
      if (cleanResponse) {
        messages.push({ role: "assistant", content: cleanResponse });
      }

      let toolResultsText = "";

      for (const call of parsedCalls) {
        const toolDef = getToolById(call.toolId);
        const toolStart = Date.now();

        const toolCallStep: ReasoningStep = {
          step,
          type: "tool_call",
          content: `Calling ${toolDef?.name ?? call.toolId}...`,
          toolId: call.toolId,
          toolName: toolDef?.name ?? call.toolId,
          toolInput: call.parameters,
        };
        onStep?.(toolCallStep);

        // Dynamic import of executeTool to avoid issues
        const { executeTool } = await import("./tools");
        const result = await executeTool(call.toolId, call.parameters);
        const toolLatency = Date.now() - toolStart;

        toolResultsText += `\n\n[Tool Result: ${toolDef?.name ?? call.toolId}]\n${result.output}`;

        const toolResultStep: ReasoningStep = {
          step,
          type: "tool_result",
          content: result.output,
          toolId: call.toolId,
          toolName: toolDef?.name ?? call.toolId,
          toolOutput: result.output,
          durationMs: toolLatency,
        };
        steps.push(toolResultStep);
        onStep?.(toolResultStep);

        toolCallResults.push({
          toolId: call.toolId,
          toolName: toolDef?.name ?? call.toolId,
          input: call.parameters,
          output: result.output,
          status: result.success ? "success" : "error",
          latencyMs: toolLatency,
          stepIndex: step,
        });
      }

      // Add tool results as a user message for the next LLM call
      messages.push({
        role: "user",
        content: `Tool results:${toolResultsText}\n\nBased on these results, continue your analysis. If you have enough information, provide your final answer. If you need more data, call additional tools.`,
      });
    } catch (error) {
      const errorStep: ReasoningStep = {
        step,
        type: "error",
        content: `Error: ${error instanceof Error ? error.message : "Unknown error"}`,
        durationMs: Date.now() - stepStart,
      };
      steps.push(errorStep);
      onStep?.(errorStep);

      return {
        output: `I encountered an error during execution: ${error instanceof Error ? error.message : "Unknown error"}. Please try again.`,
        steps,
        toolCalls: toolCallResults,
        totalTokens,
        latencyMs: Date.now() - startTime,
        status: "error",
      };
    }
  }

  // Max steps reached - try one final LLM call for a summary
  try {
    messages.push({
      role: "user",
      content: "You've reached the maximum number of reasoning steps. Please provide a final summary of what you've found.",
    });
    const finalResponse = await callLLM(zai, messages);
    totalTokens += estimateTokens(finalResponse);

    const finalStep: ReasoningStep = {
      step: maxSteps,
      type: "responding",
      content: finalResponse,
      durationMs: 0,
    };
    steps.push(finalStep);
    onStep?.(finalStep);

    return {
      output: finalResponse,
      steps,
      toolCalls: toolCallResults,
      totalTokens,
      latencyMs: Date.now() - startTime,
      status: "success",
    };
  } catch {
    return {
      output: "Maximum reasoning steps reached. Unable to generate final summary.",
      steps,
      toolCalls: toolCallResults,
      totalTokens,
      latencyMs: Date.now() - startTime,
      status: "timeout",
    };
  }
}

// ── Simple Chat (no tools) ────────────────────────────────────

export async function simpleChat(
  messages: Array<{ role: string; content: string }>,
): Promise<string> {
  const zai = await ZAI.create();
  const response = await callLLM(zai, messages);
  return response;
}