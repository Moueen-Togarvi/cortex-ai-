---
Task ID: 5
Agent: API Routes Writer
Task: Create/rewrite 3 API route files for real streaming with z-ai-web-dev-sdk

## Files Created/Rewritten

### 1. `/src/app/api/conversations/[id]/messages/route.ts` (REWRITTEN)
- Replaced `getDemoResponse()` with real LLM call via `z-ai-web-dev-sdk`
- POST handler accepts `{ content, model }` 
- Saves user message to DB immediately
- Builds SDK messages with last 10 conversation messages for context
- System prompt uses `"assistant"` role per SDK requirement
- Calls `zai.chat.completions.create()` with `thinking: { type: "disabled" }`
- Saves assistant message to DB
- Updates `LLMUsage` tracking (upsert by today's date + model)
- Returns `{ userMessage, assistantMessage }` with status 201

### 2. `/src/app/api/conversations/[id]/messages/stream/route.ts` (NEW)
- SSE streaming endpoint for real-time chat
- Saves user message to DB immediately
- Calls real LLM via z-ai-web-dev-sdk
- Streams response as `event: token` chunks via ReadableStream
- Sends `event: done` with messageId and token count after completion
- Sends `event: error` on failures
- Saves full assistant message to DB after stream completes
- Updates LLMUsage tracking
- Headers: `Content-Type: text/event-stream`, `Cache-Control: no-cache`, `Connection: keep-alive`

### 3. `/src/app/api/agents/[id]/execute/route.ts` (REWRITTEN)
- Replaced fake tool execution with real `executeAgent()` from agent-engine
- Accepts `{ message, history? }` in request body
- Fetches agent config from DB
- Calls `executeAgent()` with full ReAct loop (tool calling, multi-step reasoning)
- Saves `AgentExecution` record with steps JSON and toolCalls
- Saves individual `ToolCall` records via `createMany`
- Returns `{ response, toolsUsed, tokens, latencyMs, steps, executionId }`

## Patterns Used
- `interface RouteParams { params: Promise<{ id: string }> }` for dynamic routes
- `const { id } = await params;` to unwrap params
- `NextRequest, NextResponse` from `next/server`
- `db` from `@/lib/db`
- `estimateTokens`, `estimateCost`, `getModelById` from `@/lib/llm`
- `ZAI.create()` → `zai.chat.completions.create()` pattern
- try/catch with `{ error: "..." }` status 500

## Verification
- ESLint passes with zero errors
- Dev server running normally on port 3000
