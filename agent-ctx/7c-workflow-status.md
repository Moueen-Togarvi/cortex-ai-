# Task 7c: WorkflowBuilderPage Real-Time Per-Node Execution Status

## Work Summary

Updated `src/components/pages/WorkflowBuilderPage.tsx` to show real-time per-node execution status during workflow runs.

## Changes Made

### 1. Added state variables (line 389-390)
- `nodeStatuses`: `Record<string, "pending" | "running" | "success" | "failed" | "skipped">` — tracks each node's execution status by ID
- `isRunningWorkflow`: `boolean` — tracks whether a streaming workflow execution is in progress

### 2. Replaced `handleRunWorkflow` function (lines 512-539)
- Changed from `api.runWorkflow()` (single POST) to `api.streamWorkflow()` (SSE streaming)
- Added callbacks:
  - `onNodeStart`: Sets node status to "running"
  - `onNodeComplete`: Sets node status from SSE data (success/failed/skipped)
  - `onNodeError`: Sets node status to "failed"
  - `onDone`: Clears running state, refreshes workflow list
  - `onError`: Logs error, clears running state
- Guards against re-entry with `isRunningWorkflow` check

### 3. Updated node rendering (lines 784-857)
- Added `nodeStatus` variable extracted from `nodeStatuses[node.id]`
- Added `statusBorderColor` that applies Tailwind ring classes:
  - "running" → amber ring
  - "success" → emerald ring
  - "failed" → rose ring
- Added absolute-positioned status indicator in top-right corner of each node:
  - Running: Pulsing amber circle (SVG with `<animate>` for opacity pulsing)
  - Success: Solid emerald circle
  - Failed: Solid red circle

### 4. Updated Run button (lines 891-901)
- Changed to `size="sm"` with compact text
- Uses `isRunningWorkflow` for disabled/loading state instead of `running`
- Shows `<Loader2>` spinner with "Running..." text during execution
- Shows `<Play>` icon with "Run" text when idle
- References `selected` (the correct derived variable) for disabled check

## Notes
- No import changes were needed since `streamWorkflow` is already a method on the `api` object from `@/lib/api`
- The existing `running`/`runResult` state is kept for backward compatibility with the run result display card
- Lint passes for this file (the one lint error is in ChatPage.tsx, unrelated)