"use client";

import React, { useState, useMemo, useEffect, useCallback } from "react";

import { api } from "@/lib/api";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

import {
  Workflow,
  Plus,
  Search,
  Play,
  CheckCircle2,
  Sparkles,
  Wrench,
  GitBranch,
  User,
  XCircle,
  Clock,
  Loader2,
  Activity,
  Zap,
  AlertCircle,
  Save,
} from "lucide-react";

// ── Node type config ──
const nodeTypeConfig: Record<
  string,
  {
    icon: React.ElementType;
    borderClass: string;
    bgClass: string;
    label: string;
  }
> = {
  input: {
    icon: Play,
    borderClass: "border-l-green-500",
    bgClass: "bg-green-500/5",
    label: "Input",
  },
  output: {
    icon: CheckCircle2,
    borderClass: "border-l-emerald-500",
    bgClass: "bg-emerald-500/5",
    label: "Output",
  },
  llm: {
    icon: Sparkles,
    borderClass: "border-l-fuchsia-500",
    bgClass: "bg-fuchsia-500/5",
    label: "LLM",
  },
  tool: {
    icon: Wrench,
    borderClass: "border-l-amber-500",
    bgClass: "bg-amber-500/5",
    label: "Tool",
  },
  condition: {
    icon: GitBranch,
    borderClass: "border-l-orange-500",
    bgClass: "bg-orange-500/5",
    label: "Condition",
  },
  rag: {
    icon: Search,
    borderClass: "border-l-teal-500",
    bgClass: "bg-teal-500/5",
    label: "RAG",
  },
  human: {
    icon: User,
    borderClass: "border-l-rose-500",
    bgClass: "bg-rose-500/5",
    label: "Human",
  },
};

const nodePaletteItems = [
  { type: "input", label: "Input" },
  { type: "llm", label: "LLM" },
  { type: "tool", label: "Tool" },
  { type: "condition", label: "Condition" },
  { type: "rag", label: "RAG" },
  { type: "output", label: "Output" },
  { type: "human", label: "Human" },
];

const mockExecutions = [
  {
    id: "exec_1",
    run: "#1247",
    status: "success",
    duration: "3.2s",
    startedAt: "2025-01-20 10:30:00",
    triggeredBy: "API",
  },
  {
    id: "exec_2",
    run: "#1246",
    status: "success",
    duration: "2.8s",
    startedAt: "2025-01-20 09:15:00",
    triggeredBy: "Manual",
  },
  {
    id: "exec_3",
    run: "#1245",
    status: "failed",
    duration: "5.1s",
    startedAt: "2025-01-20 08:00:00",
    triggeredBy: "Schedule",
  },
  {
    id: "exec_4",
    run: "#1244",
    status: "running",
    duration: "—",
    startedAt: "2025-01-20 10:45:00",
    triggeredBy: "API",
  },
  {
    id: "exec_5",
    run: "#1243",
    status: "success",
    duration: "4.0s",
    startedAt: "2025-01-19 23:00:00",
    triggeredBy: "Schedule",
  },
];

interface WorkflowNode {
  id: string;
  type: "llm" | "tool" | "condition" | "input" | "output" | "rag" | "human";
  label: string;
  config: Record<string, unknown>;
  position: { x: number; y: number };
}

interface WorkflowEdge {
  id: string;
  source: string;
  target: string;
  label?: string;
}

interface WorkflowCount {
  executions?: number;
  [key: string]: unknown;
}

interface WorkflowExecution {
  id?: string;
  status?: string;
  startedAt?: string;
  [key: string]: unknown;
}

interface Workflow {
  id: string;
  name: string;
  description: string;
  status: "active" | "draft" | "paused";
  nodes: WorkflowNode[];
  edges: WorkflowEdge[];
  executions?: number;
  lastRun?: string | { createdAt?: string; [key: string]: unknown };
  createdAt: string;
  _count?: WorkflowCount;
  executions_data?: WorkflowExecution[];
}

function formatRelativeTime(dateStr: string): string {
  if (!dateStr) return "Never";
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMins < 1) return "Just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  return `${diffDays}d ago`;
}

// ── NODE WIDTH / HEIGHT for edge calculations ──
const NODE_W = 180;
const NODE_H = 64;

// ── Configuration Tab (separate component to avoid setState-in-effect) ──
function ConfigurationTab({
  workflow,
  onSaved,
}: {
  workflow: Workflow;
  onSaved: () => void;
}) {
  const [configName, setConfigName] = useState(workflow.name);
  const [configStatus, setConfigStatus] = useState<string>(workflow.status);
  const [configDesc, setConfigDesc] = useState(workflow.description);
  const [saving, setSaving] = useState(false);

  const handleSave = () => {
    setSaving(true);
    api
      .updateWorkflow(workflow.id, {
        name: configName,
        description: configDesc,
        status: configStatus,
      })
      .then(() => onSaved())
      .catch((err) => console.error("Failed to save workflow:", err))
      .finally(() => setSaving(false));
  };

  const nodes = workflow.nodes as WorkflowNode[];

  return (
    <div className="max-w-2xl space-y-6">
      {/* Basic info */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Workflow Settings</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="cfg-name">Name</Label>
            <Input
              id="cfg-name"
              value={configName}
              onChange={(e) => setConfigName(e.target.value)}
              placeholder="Workflow name"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="cfg-desc">Description</Label>
            <Textarea
              id="cfg-desc"
              value={configDesc}
              onChange={(e) => setConfigDesc(e.target.value)}
              placeholder="Describe what this workflow does…"
              rows={3}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="cfg-status">Status</Label>
            <Select value={configStatus} onValueChange={setConfigStatus}>
              <SelectTrigger id="cfg-status" className="w-48">
                <SelectValue placeholder="Select status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="draft">Draft</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="paused">Paused</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Button onClick={handleSave} disabled={saving} className="gap-1.5">
            {saving ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Save className="size-4" />
            )}
            Save Changes
          </Button>
        </CardContent>
      </Card>

      {/* Node configuration accordion */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Node Configuration</CardTitle>
        </CardHeader>
        <CardContent>
          {!nodes || nodes.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No nodes in this workflow.
            </p>
          ) : (
            <Accordion type="multiple" className="w-full">
              {nodes.map((node, idx) => {
                const cfg = nodeTypeConfig[node.type] ?? nodeTypeConfig.tool;
                const Icon = cfg.icon;
                const configEntries = Object.entries(node.config ?? {});
                return (
                  <AccordionItem key={node.id} value={node.id}>
                    <AccordionTrigger className="gap-2 hover:no-underline">
                      <div className="flex items-center gap-2">
                        <Icon className="size-4 text-muted-foreground" />
                        <span className="text-sm font-medium">
                          {node.label || `Node ${idx + 1}`}
                        </span>
                        <Badge variant="secondary" className="text-[10px] capitalize">
                          {cfg.label}
                        </Badge>
                      </div>
                    </AccordionTrigger>
                    <AccordionContent>
                      {configEntries.length === 0 ? (
                        <p className="text-sm text-muted-foreground pl-6">
                          No configuration set.
                        </p>
                      ) : (
                        <div className="pl-6 space-y-2">
                          {configEntries.map(([key, value]) => (
                            <div
                              key={key}
                              className="flex items-start gap-2 text-sm"
                            >
                              <span className="font-mono text-xs bg-muted px-1.5 py-0.5 rounded">
                                {key}
                              </span>
                              <span className="text-muted-foreground break-all">
                                {typeof value === "object"
                                  ? JSON.stringify(value, null, 2)
                                  : String(value)}
                              </span>
                            </div>
                          ))}
                        </div>
                      )}
                    </AccordionContent>
                  </AccordionItem>
                );
              })}
            </Accordion>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export default function WorkflowBuilderPage() {
  const [workflows, setWorkflows] = useState<Workflow[]>([]);
  const [loading, setLoading] = useState(true);
  const [pageError, setPageError] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [createName, setCreateName] = useState("");
  const [createDesc, setCreateDesc] = useState("");
  const [creating, setCreating] = useState(false);
  const [running, setRunning] = useState(false);
  const [runResult, setRunResult] = useState<string | null>(null);
  const [nodeStatuses, setNodeStatuses] = useState<Record<string, "pending" | "running" | "success" | "failed" | "skipped">>({});
  const [isRunningWorkflow, setIsRunningWorkflow] = useState(false);

  // Derived: selected workflow with parsed nodes/edges
  const selected = useMemo(() => {
    const wf = workflows.find((w) => w.id === selectedId) ?? null;
    if (!wf) return null;
    try {
      const parsed = {
        ...wf,
        nodes: typeof wf.nodes === "string" ? JSON.parse(wf.nodes) : wf.nodes,
        edges: typeof wf.edges === "string" ? JSON.parse(wf.edges) : wf.edges,
      } as Workflow;
      return parsed;
    } catch {
      return null;
    }
  }, [workflows, selectedId]);

  const fetchWorkflows = useCallback(() => {
    api
      .getWorkflows()
      .then((data) => setWorkflows((data as Workflow[]) ?? []))
      .catch((err) => console.error("Failed to fetch workflows:", err));
  }, []);

  useEffect(() => {
    api
      .getWorkflows()
      .then((data) => setWorkflows((data as Workflow[]) ?? []))
      .catch((err) => {
        console.error("Failed to fetch workflows:", err);
        setPageError("Failed to load workflows. Please try again.");
      })
      .finally(() => setLoading(false));
  }, []);

  const filteredWorkflows = useMemo(
    () =>
      workflows.filter((w) =>
        w.name.toLowerCase().includes(searchQuery.toLowerCase())
      ),
    [workflows, searchQuery]
  );

  // Helper to get workflow execution count
  function getWorkflowExecutions(wf: Workflow): number {
    return (wf._count?.executions as number) ?? (wf.executions as number) ?? 0;
  }

  // Helper to get last run time
  function getLastRun(wf: Workflow): string {
    if (!wf.lastRun) return "";
    if (typeof wf.lastRun === "string") return wf.lastRun;
    return ((wf.lastRun as Record<string, string>)?.createdAt ?? "");
  }

  const statusColor = (status: string) => {
    switch (status) {
      case "active":
        return "bg-emerald-500";
      case "paused":
        return "bg-amber-500";
      default:
        return "bg-gray-400";
    }
  };

  const executionStatusBadge = (status: string) => {
    switch (status) {
      case "success":
        return (
          <Badge
            variant="outline"
            className="border-emerald-500/30 text-emerald-500 bg-emerald-500/10 gap-1"
          >
            <CheckCircle2 className="size-3" />
            Success
          </Badge>
        );
      case "failed":
        return (
          <Badge
            variant="outline"
            className="border-rose-500/30 text-rose-500 bg-rose-500/10 gap-1"
          >
            <XCircle className="size-3" />
            Failed
          </Badge>
        );
      case "running":
        return (
          <Badge
            variant="outline"
            className="border-amber-500/30 text-amber-500 bg-amber-500/10 gap-1"
          >
            <Loader2 className="size-3 animate-spin" />
            Running
          </Badge>
        );
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const handleCreateWorkflow = () => {
    if (!createName.trim()) return;
    setCreating(true);
    api
      .createWorkflow({
        name: createName,
        description: createDesc,
      })
      .then(() => {
        setCreateDialogOpen(false);
        setCreateName("");
        setCreateDesc("");
        fetchWorkflows();
      })
      .catch((err) => console.error("Failed to create workflow:", err))
      .finally(() => setCreating(false));
  };

  const handleRunWorkflow = async () => {
    if (!selectedId || isRunningWorkflow) return;
    setIsRunningWorkflow(true);
    setNodeStatuses({});

    await api.streamWorkflow(selectedId, {
      onNodeStart: (data) => {
        setNodeStatuses((prev) => ({ ...prev, [data.nodeId]: "running" }));
      },
      onNodeComplete: (data) => {
        setNodeStatuses((prev) => ({
          ...prev,
          [data.nodeId as string]: (data.status as "success" | "failed" | "skipped") ?? "success",
        }));
      },
      onNodeError: (data) => {
        setNodeStatuses((prev) => ({ ...prev, [data.nodeId]: "failed" }));
      },
      onDone: () => {
        setIsRunningWorkflow(false);
        fetchWorkflows();
      },
      onError: (error) => {
        console.error("Workflow execution error:", error);
        setIsRunningWorkflow(false);
      },
    });
  };

  // ─────────────────────────── RENDER ───────────────────────────

  return (
    <div className="flex h-[calc(100vh-4rem)]">
      {/* ─── LEFT PANEL: Workflow List ─── */}
      <aside className="w-72 border-r bg-muted/30 flex flex-col shrink-0">
        {/* Header */}
        <div className="p-4 border-b space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold tracking-tight">Workflows</h2>
            <Button
              size="sm"
              onClick={() => setCreateDialogOpen(true)}
              className="gap-1.5"
            >
              <Plus className="size-4" />
              <span className="hidden sm:inline">Create</span>
            </Button>
          </div>
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 size-4 text-muted-foreground" />
            <Input
              placeholder="Search workflows…"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 h-9"
            />
          </div>
        </div>

        {/* Workflow List */}
        <ScrollArea className="flex-1">
          <div className="p-2 space-y-1">
            {loading ? (
              // Skeletons
              Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="p-3 rounded-lg space-y-2">
                  <div className="flex items-center gap-2">
                    <Skeleton className="size-2.5 rounded-full" />
                    <Skeleton className="h-4 w-32" />
                  </div>
                  <Skeleton className="h-3 w-20" />
                </div>
              ))
            ) : filteredWorkflows.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">
                {searchQuery ? "No workflows match your search." : "No workflows yet."}
              </p>
            ) : (
              filteredWorkflows.map((wf) => {
                const isSelected = wf.id === selectedId;
                const execCount = getWorkflowExecutions(wf);
                const lastRunTime = getLastRun(wf);

                return (
                  <button
                    key={wf.id}
                    onClick={() => setSelectedId(wf.id)}
                    className={cn(
                      "w-full text-left rounded-lg p-3 transition-colors",
                      "hover:bg-accent/60",
                      isSelected && "bg-accent ring-1 ring-ring/20"
                    )}
                  >
                    <div className="flex items-start gap-2.5">
                      {/* Status dot */}
                      <span
                        className={cn(
                          "mt-1.5 size-2.5 rounded-full shrink-0",
                          statusColor(wf.status)
                        )}
                      />
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium truncate">{wf.name}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {execCount > 0
                            ? `${execCount} run${execCount > 1 ? "s" : ""}`
                            : "No runs"}
                          {lastRunTime && (
                            <>
                              {" · "}
                              {formatRelativeTime(lastRunTime)}
                            </>
                          )}
                        </p>
                      </div>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </ScrollArea>
      </aside>

      {/* ─── RIGHT PANEL ─── */}
      <main className="flex-1 flex flex-col min-w-0">
        {pageError ? (
          <div className="flex-1 flex items-center justify-center">
            <Card className="max-w-md w-full mx-4">
              <CardHeader className="text-center">
                <AlertCircle className="size-10 text-rose-500 mx-auto mb-2" />
                <CardTitle className="text-lg">Error Loading Workflows</CardTitle>
              </CardHeader>
              <CardContent className="text-center">
                <p className="text-sm text-muted-foreground">{pageError}</p>
              </CardContent>
            </Card>
          </div>
        ) : !selected ? (
          /* ─── EMPTY STATE ─── */
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center space-y-3 px-4">
              <div className="mx-auto size-16 rounded-2xl bg-muted flex items-center justify-center">
                <Workflow className="size-8 text-muted-foreground" />
              </div>
              <h3 className="text-lg font-semibold">No Workflow Selected</h3>
              <p className="text-sm text-muted-foreground max-w-sm">
                Select a workflow from the list to view and edit its DAG canvas,
                or create a new one to get started.
              </p>
              <Button
                variant="outline"
                onClick={() => setCreateDialogOpen(true)}
                className="mt-2 gap-1.5"
              >
                <Plus className="size-4" />
                Create Workflow
              </Button>
            </div>
          </div>
        ) : (
          /* ─── TABS: Canvas / Configuration / Executions ─── */
          <Tabs defaultValue="canvas" className="flex-1 flex flex-col">
            <div className="border-b px-4 pt-3">
              <TabsList>
                <TabsTrigger value="canvas" className="gap-1.5">
                  <GitBranch className="size-3.5" />
                  Canvas
                </TabsTrigger>
                <TabsTrigger value="configuration" className="gap-1.5">
                  <Save className="size-3.5" />
                  Configuration
                </TabsTrigger>
                <TabsTrigger value="executions" className="gap-1.5">
                  <Activity className="size-3.5" />
                  Executions
                </TabsTrigger>
              </TabsList>
            </div>

            {/* ────── CANVAS TAB ────── */}
            <TabsContent value="canvas" className="flex-1 flex flex-col m-0 p-4 gap-3 overflow-hidden">
              {/* Node palette */}
              <div className="flex flex-wrap gap-2 shrink-0">
                {nodePaletteItems.map((item) => {
                  const cfg = nodeTypeConfig[item.type];
                  const Icon = cfg.icon;
                  return (
                    <div
                      key={item.type}
                      className={cn(
                        "flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium border",
                        "border-border/60 bg-card hover:bg-accent/50 transition-colors cursor-default",
                        cfg.bgClass
                      )}
                    >
                      <Icon className="size-3.5" />
                      {item.label}
                    </div>
                  );
                })}
              </div>

              {/* SVG Canvas */}
              <div className="flex-1 relative border rounded-lg bg-card overflow-auto min-h-[500px]">
                {/* Empty canvas state */}
                {(!selected.nodes || (selected.nodes as WorkflowNode[]).length === 0) ? (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <p className="text-sm text-muted-foreground">
                      This workflow has no nodes yet. Add nodes via the API to visualize the DAG.
                    </p>
                  </div>
                ) : (
                  <div className="relative" style={{ minWidth: 800, minHeight: 500 }}>
                    {/* SVG layer for edges */}
                    <svg
                      className="absolute inset-0 pointer-events-none"
                      width="100%"
                      height="100%"
                      style={{ zIndex: 0 }}
                    >
                      {(selected.edges as WorkflowEdge[]).map((edge) => {
                        const srcNode = (selected.nodes as WorkflowNode[]).find(
                          (n) => n.id === edge.source
                        );
                        const tgtNode = (selected.nodes as WorkflowNode[]).find(
                          (n) => n.id === edge.target
                        );
                        if (!srcNode || !tgtNode) return null;

                        const x1 = (srcNode.position?.x ?? 0) + NODE_W;
                        const y1 = (srcNode.position?.y ?? 0) + NODE_H / 2;
                        const x2 = tgtNode.position?.x ?? 0;
                        const y2 = (tgtNode.position?.y ?? 0) + NODE_H / 2;
                        const midX = (x1 + x2) / 2;
                        const midY = (y1 + y2) / 2;

                        return (
                          <g key={edge.id}>
                            <line
                              x1={x1}
                              y1={y1}
                              x2={x2}
                              y2={y2}
                              stroke="currentColor"
                              className="text-muted-foreground/40"
                              strokeWidth={2}
                            />
                            {/* Arrowhead */}
                            <circle
                              cx={x2}
                              cy={y2}
                              r={3}
                              className="fill-muted-foreground/60"
                            />
                            {/* Edge label */}
                            {edge.label && (
                              <text
                                x={midX}
                                y={midY - 6}
                                textAnchor="middle"
                                className="fill-muted-foreground text-[11px] select-none"
                              >
                                {edge.label}
                              </text>
                            )}
                          </g>
                        );
                      })}
                    </svg>

                    {/* Node layer */}
                    {(selected.nodes as WorkflowNode[]).map((node) => {
                      const cfg = nodeTypeConfig[node.type] ?? nodeTypeConfig.tool;
                      const Icon = cfg.icon;
                      const nodeStatus = nodeStatuses[node.id];
                      const statusBorderColor =
                        nodeStatus === "running"
                          ? "ring-2 ring-amber-500/60"
                          : nodeStatus === "success"
                          ? "ring-2 ring-emerald-500/60"
                          : nodeStatus === "failed"
                          ? "ring-2 ring-rose-500/60"
                          : "";
                      return (
                        <div
                          key={node.id}
                          className={cn(
                            "absolute rounded-lg border-l-4 bg-card shadow-sm border border-border/60 p-3",
                            "flex items-center gap-2.5 select-none",
                            cfg.borderClass,
                            statusBorderColor
                          )}
                          style={{
                            left: node.position?.x ?? 0,
                            top: node.position?.y ?? 0,
                            width: NODE_W,
                            height: NODE_H,
                            zIndex: 1,
                          }}
                        >
                          <div
                            className={cn(
                              "flex items-center justify-center size-8 rounded-md shrink-0",
                              cfg.bgClass
                            )}
                          >
                            <Icon className="size-4 text-muted-foreground" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-medium truncate">{node.label}</p>
                            <p className="text-[11px] text-muted-foreground capitalize">
                              {cfg.label}
                            </p>
                          </div>
                          {/* Status indicator */}
                          {nodeStatus && (
                            <div className="absolute top-1.5 right-1.5">
                              {nodeStatus === "running" && (
                                <svg width="10" height="10" viewBox="0 0 10 10">
                                  <circle cx="5" cy="5" r="4" fill="#f59e0b">
                                    <animate
                                      attributeName="opacity"
                                      values="1;0.3;1"
                                      dur="1s"
                                      repeatCount="indefinite"
                                    />
                                  </circle>
                                </svg>
                              )}
                              {nodeStatus === "success" && (
                                <svg width="10" height="10" viewBox="0 0 10 10">
                                  <circle cx="5" cy="5" r="4" fill="#10b981" />
                                </svg>
                              )}
                              {nodeStatus === "failed" && (
                                <svg width="10" height="10" viewBox="0 0 10 10">
                                  <circle cx="5" cy="5" r="4" fill="#ef4444" />
                                </svg>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </TabsContent>

            {/* ────── CONFIGURATION TAB ────── */}
            <TabsContent
              value="configuration"
              className="flex-1 overflow-y-auto m-0 p-4"
            >
              <ConfigurationTab
                key={selected.id}
                workflow={selected}
                onSaved={fetchWorkflows}
              />
            </TabsContent>

            {/* ────── EXECUTIONS TAB ────── */}
            <TabsContent
              value="executions"
              className="flex-1 overflow-y-auto m-0 p-4"
            >
              <div className="max-w-4xl space-y-6">
                {/* Action bar */}
                <div className="flex items-center justify-between flex-wrap gap-3">
                  <div>
                    <h3 className="text-lg font-semibold">
                      Executions
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      Run and monitor workflow executions.
                    </p>
                  </div>
                  <Button
                    size="sm"
                    onClick={handleRunWorkflow}
                    disabled={!selected || isRunningWorkflow}
                  >
                    {isRunningWorkflow ? (
                      <><Loader2 className="size-3.5 mr-1 animate-spin" /> Running...</>
                    ) : (
                      <><Play className="size-3.5 mr-1" /> Run</>
                    )}
                  </Button>
                </div>

                {/* Run result */}
                {runResult && (
                  <Card
                    className={cn(
                      "border",
                      runResult.toLowerCase().includes("failed")
                        ? "border-rose-500/30 bg-rose-500/5"
                        : "border-emerald-500/30 bg-emerald-500/5"
                    )}
                  >
                    <CardContent className="p-4 flex items-start gap-2">
                      {runResult.toLowerCase().includes("failed") ? (
                        <XCircle className="size-5 text-rose-500 shrink-0 mt-0.5" />
                      ) : (
                        <CheckCircle2 className="size-5 text-emerald-500 shrink-0 mt-0.5" />
                      )}
                      <p className="text-sm">{runResult}</p>
                    </CardContent>
                  </Card>
                )}

                {/* Stats cards */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  <Card>
                    <CardContent className="p-4 flex items-center gap-3">
                      <div className="size-9 rounded-lg bg-emerald-500/10 flex items-center justify-center">
                        <CheckCircle2 className="size-4 text-emerald-500" />
                      </div>
                      <div>
                        <p className="text-2xl font-bold">3</p>
                        <p className="text-xs text-muted-foreground">Successful</p>
                      </div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="p-4 flex items-center gap-3">
                      <div className="size-9 rounded-lg bg-rose-500/10 flex items-center justify-center">
                        <XCircle className="size-4 text-rose-500" />
                      </div>
                      <div>
                        <p className="text-2xl font-bold">1</p>
                        <p className="text-xs text-muted-foreground">Failed</p>
                      </div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="p-4 flex items-center gap-3">
                      <div className="size-9 rounded-lg bg-amber-500/10 flex items-center justify-center">
                        <Clock className="size-4 text-amber-500" />
                      </div>
                      <div>
                        <p className="text-2xl font-bold">3.3s</p>
                        <p className="text-xs text-muted-foreground">Avg Duration</p>
                      </div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="p-4 flex items-center gap-3">
                      <div className="size-9 rounded-lg bg-fuchsia-500/10 flex items-center justify-center">
                        <Zap className="size-4 text-fuchsia-500" />
                      </div>
                      <div>
                        <p className="text-2xl font-bold">5</p>
                        <p className="text-xs text-muted-foreground">Total Runs</p>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* Executions table */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Recent Executions</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-24">Run</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Duration</TableHead>
                          <TableHead>Started</TableHead>
                          <TableHead className="hidden sm:table-cell">Triggered By</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {mockExecutions.map((exec) => (
                          <TableRow key={exec.id}>
                            <TableCell className="font-mono text-sm">
                              {exec.run}
                            </TableCell>
                            <TableCell>{executionStatusBadge(exec.status)}</TableCell>
                            <TableCell className="text-sm">
                              {exec.duration}
                            </TableCell>
                            <TableCell className="text-sm text-muted-foreground">
                              {exec.startedAt}
                            </TableCell>
                            <TableCell className="hidden sm:table-cell text-sm text-muted-foreground">
                              {exec.triggeredBy}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                    <p className="text-xs text-muted-foreground mt-3">
                      Showing mock execution data. Execution history API coming soon.
                    </p>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>
          </Tabs>
        )}
      </main>

      {/* ─── CREATE WORKFLOW DIALOG ─── */}
      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create Workflow</DialogTitle>
            <DialogDescription>
              Add a new workflow to your project. You can configure it after creation.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="create-name">Name</Label>
              <Input
                id="create-name"
                value={createName}
                onChange={(e) => setCreateName(e.target.value)}
                placeholder="e.g. Customer Support Bot"
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleCreateWorkflow();
                }}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="create-desc">Description</Label>
              <Textarea
                id="create-desc"
                value={createDesc}
                onChange={(e) => setCreateDesc(e.target.value)}
                placeholder="What does this workflow do?"
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setCreateDialogOpen(false)}
              disabled={creating}
            >
              Cancel
            </Button>
            <Button
              onClick={handleCreateWorkflow}
              disabled={creating || !createName.trim()}
              className="gap-1.5"
            >
              {creating ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Plus className="size-4" />
              )}
              Create
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}