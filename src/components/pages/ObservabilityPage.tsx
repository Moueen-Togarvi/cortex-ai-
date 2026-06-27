"use client";

import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import {
  Activity,
  CheckCircle,
  Clock,
  AlertTriangle,
  RefreshCw,
  Loader2,
  ExternalLink,
  Copy,
  Filter,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  Cell,
} from "recharts";
import { api } from "@/lib/api";
import { formatDistanceToNow, format } from "date-fns";

// ── Helpers ────────────────────────────────────────────────────

function fmt(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return n.toLocaleString();
}

function fmtCost(n: number): string {
  if (n >= 1) return `$${n.toFixed(2)}`;
  if (n >= 0.01) return `$${n.toFixed(3)}`;
  return `$${n.toFixed(4)}`;
}

function statusColor(status: string): string {
  switch (status) {
    case "success":
      return "bg-emerald-500/15 text-emerald-400 border-emerald-500/30";
    case "error":
      return "bg-red-500/15 text-red-400 border-red-500/30";
    case "timeout":
      return "bg-amber-500/15 text-amber-400 border-amber-500/30";
    case "filtered":
      return "bg-violet-500/15 text-violet-400 border-violet-500/30";
    default:
      return "bg-muted text-muted-foreground border-border";
  }
}

function sourceColor(source: string): string {
  switch (source) {
    case "chat":
      return "bg-emerald-500/15 text-emerald-400 border-emerald-500/30";
    case "agent":
      return "bg-cyan-500/15 text-cyan-400 border-cyan-500/30";
    case "workflow":
      return "bg-violet-500/15 text-violet-400 border-violet-500/30";
    case "rag":
      return "bg-amber-500/15 text-amber-400 border-amber-500/30";
    default:
      return "bg-muted text-muted-foreground border-border";
  }
}

function latencyColor(ms: number): string {
  if (ms < 500) return "text-emerald-400";
  if (ms < 2000) return "text-amber-400";
  return "text-red-400";
}

function truncate(str: string, max: number): string {
  if (!str) return "—";
  return str.length > max ? str.slice(0, max) + "…" : str;
}

const TOOLTIP_STYLE = {
  backgroundColor: "hsl(var(--card))",
  border: "1px solid hsl(var(--border))",
  borderRadius: "8px",
  fontSize: "12px",
};

const PERIOD_MAP: Record<string, number> = {
  "1h": 1,
  "24h": 24,
  "7d": 168,
  "30d": 720,
};

const SOURCE_COLORS: Record<string, string> = {
  chat: "#10b981",
  agent: "#06b6d4",
  workflow: "#8b5cf6",
  rag: "#f59e0b",
};

// ── Trace Detail Dialog ────────────────────────────────────────

interface TraceRecord {
  id: string;
  spanId?: string;
  traceId?: string;
  model: string;
  source: string;
  status: string;
  latencyMs: number;
  inputTokens?: number;
  outputTokens?: number;
  totalTokens?: number;
  cost?: number;
  input?: string;
  output?: string;
  metadata?: Record<string, unknown>;
  guardrailEvaluations?: Array<Record<string, unknown>>;
  createdAt?: string;
}

function TraceDetailDialog({
  trace,
  open,
  onOpenChange,
}: {
  trace: TraceRecord | null;
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const [copied, setCopied] = useState(false);

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const totalTokens =
    (trace?.totalTokens ?? 0) ||
    ((trace?.inputTokens ?? 0) + (trace?.outputTokens ?? 0));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base">
            Trace Detail
            {trace?.id && (
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6"
                onClick={() => handleCopy(trace.id)}
              >
                <Copy className="h-3 w-3" />
              </Button>
            )}
          </DialogTitle>
          <DialogDescription className="text-xs">
            {trace?.id ?? "—"}
          </DialogDescription>
        </DialogHeader>

        {trace && (
          <div className="space-y-4">
            {/* Meta grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="space-y-1">
                <span className="text-[10px] uppercase tracking-wider text-muted-foreground">
                  Span ID
                </span>
                <p className="text-xs font-mono truncate">
                  {trace.spanId || trace.traceId || "—"}
                </p>
              </div>
              <div className="space-y-1">
                <span className="text-[10px] uppercase tracking-wider text-muted-foreground">
                  Model
                </span>
                <p className="text-xs font-medium">{trace.model || "—"}</p>
              </div>
              <div className="space-y-1">
                <span className="text-[10px] uppercase tracking-wider text-muted-foreground">
                  Source
                </span>
                <Badge
                  variant="outline"
                  className={`text-[10px] ${sourceColor(trace.source)}`}
                >
                  {trace.source}
                </Badge>
              </div>
              <div className="space-y-1">
                <span className="text-[10px] uppercase tracking-wider text-muted-foreground">
                  Status
                </span>
                <Badge
                  variant="outline"
                  className={`text-[10px] ${statusColor(trace.status)}`}
                >
                  {trace.status}
                </Badge>
              </div>
              <div className="space-y-1">
                <span className="text-[10px] uppercase tracking-wider text-muted-foreground">
                  Latency
                </span>
                <p className={`text-xs font-mono font-semibold ${latencyColor(trace.latencyMs)}`}>
                  {trace.latencyMs?.toFixed(0) ?? "—"}ms
                </p>
              </div>
              <div className="space-y-1">
                <span className="text-[10px] uppercase tracking-wider text-muted-foreground">
                  Tokens
                </span>
                <p className="text-xs font-mono">
                  {fmt(totalTokens)}
                  {trace.inputTokens
                    ? ` (${fmt(trace.inputTokens)}↓ / ${fmt(trace.outputTokens ?? 0)}↑)`
                    : ""}
                </p>
              </div>
              <div className="space-y-1">
                <span className="text-[10px] uppercase tracking-wider text-muted-foreground">
                  Cost
                </span>
                <p className="text-xs font-mono">
                  {fmtCost(trace.cost ?? 0)}
                </p>
              </div>
              <div className="space-y-1">
                <span className="text-[10px] uppercase tracking-wider text-muted-foreground">
                  Time
                </span>
                <p className="text-xs">
                  {trace.createdAt
                    ? formatDistanceToNow(new Date(trace.createdAt), {
                        addSuffix: true,
                      })
                    : "—"}
                </p>
              </div>
            </div>

            {/* Tabs for Input / Output / Metadata */}
            <Tabs defaultValue="input">
              <TabsList className="h-8">
                <TabsTrigger value="input" className="text-xs px-3 h-7">
                  Input
                </TabsTrigger>
                <TabsTrigger value="output" className="text-xs px-3 h-7">
                  Output
                </TabsTrigger>
                <TabsTrigger value="metadata" className="text-xs px-3 h-7">
                  Metadata
                </TabsTrigger>
                {trace.guardrailEvaluations &&
                  trace.guardrailEvaluations.length > 0 && (
                    <TabsTrigger
                      value="guardrails"
                      className="text-xs px-3 h-7"
                    >
                      Guardrails
                    </TabsTrigger>
                  )}
              </TabsList>
              <TabsContent value="input">
                <div className="rounded-lg border border-border/50 bg-muted/30 p-3 max-h-60 overflow-y-auto">
                  <pre className="text-xs font-mono whitespace-pre-wrap break-words leading-relaxed">
                    {trace.input || "No input data"}
                  </pre>
                </div>
              </TabsContent>
              <TabsContent value="output">
                <div className="rounded-lg border border-border/50 bg-muted/30 p-3 max-h-60 overflow-y-auto">
                  <pre className="text-xs font-mono whitespace-pre-wrap break-words leading-relaxed">
                    {trace.output || "No output data"}
                  </pre>
                </div>
              </TabsContent>
              <TabsContent value="metadata">
                <div className="rounded-lg border border-border/50 bg-muted/30 p-3 max-h-60 overflow-y-auto">
                  <pre className="text-xs font-mono whitespace-pre-wrap break-words leading-relaxed">
                    {trace.metadata
                      ? JSON.stringify(trace.metadata, null, 2)
                      : "No metadata"}
                  </pre>
                </div>
              </TabsContent>
              {trace.guardrailEvaluations &&
                trace.guardrailEvaluations.length > 0 && (
                  <TabsContent value="guardrails">
                    <div className="space-y-2 max-h-60 overflow-y-auto">
                      {trace.guardrailEvaluations.map((g, i) => (
                        <div
                          key={i}
                          className="rounded-lg border border-border/50 bg-muted/30 p-3 space-y-1"
                        >
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-medium">
                              {String(g.policyName ?? g.name ?? `Policy ${i + 1}`)}
                            </span>
                            <Badge
                              variant="outline"
                              className={`text-[10px] ${
                                g.passed === true || g.result === "pass"
                                  ? statusColor("success")
                                  : statusColor("error")
                              }`}
                            >
                              {g.passed === true || g.result === "pass"
                                ? "PASS"
                                : "FAIL"}
                            </Badge>
                          </div>
                          {g.details && (
                            <p className="text-[10px] text-muted-foreground">
                              {String(g.details)}
                            </p>
                          )}
                        </div>
                      ))}
                    </div>
                  </TabsContent>
                )}
            </Tabs>

            {copied && (
              <p className="text-[10px] text-emerald-400 text-center">
                Copied to clipboard
              </p>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

// ── Main Component ─────────────────────────────────────────────

export default function ObservabilityPage() {
  const [period, setPeriod] = useState("24h");
  const [autoRefresh, setAutoRefresh] = useState(false);
  const [loading, setLoading] = useState(true);
  const [sourceFilter, setSourceFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [selectedTrace, setSelectedTrace] = useState<TraceRecord | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  // Data state
  const [overview, setOverview] = useState<Record<string, unknown> | null>(null);
  const [traces, setTraces] = useState<TraceRecord[]>([]);
  const [traceTotal, setTraceTotal] = useState(0);

  const refreshRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    const hours = PERIOD_MAP[period] ?? 24;

    try {
      const [ov, tr] = await Promise.all([
        api.getObservabilityOverview(hours),
        api.getTraces({
          hours,
          limit: 200,
          source: sourceFilter !== "all" ? sourceFilter : undefined,
          status: statusFilter !== "all" ? statusFilter : undefined,
        }),
      ]);

      setOverview(ov ?? null);
      const traceList = (tr?.traces ?? tr?.data ?? []) as TraceRecord[];
      setTraces(traceList);
      setTraceTotal(Number(tr?.total ?? tr?.count ?? traceList.length));
    } catch (err) {
      console.error("Failed to fetch observability data:", err);
    } finally {
      setLoading(false);
    }
  }, [period, sourceFilter, statusFilter]);

  // Auto-refresh
  useEffect(() => {
    if (autoRefresh) {
      refreshRef.current = setInterval(fetchAll, 15_000);
    }
    return () => {
      if (refreshRef.current) clearInterval(refreshRef.current);
    };
  }, [autoRefresh, fetchAll]);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  // ── Derived data ─────────────────────────────────────────────

  const totalTraces = Number(overview?.totalTraces ?? traceTotal ?? 0);

  const successCount = Number(
    overview?.successCount ?? traces.filter((t) => t.status === "success").length ?? 0,
  );
  const successRate = totalTraces > 0 ? (successCount / totalTraces) * 100 : 100;

  const avgLatency = Number(overview?.avgLatency ?? 0);
  const errorCount = Number(
    overview?.errorCount ?? traces.filter((t) => t.status === "error").length ?? 0,
  );
  const errorRate = totalTraces > 0 ? (errorCount / totalTraces) * 100 : 0;

  // Hourly data for latency chart
  const hourlyData = useMemo(() => {
    const raw = (overview?.byHour ?? []) as Array<Record<string, unknown>>;
    return raw.map((h) => ({
      hour: String(h.hour ?? h.label ?? ""),
      count: Number(h.count ?? 0),
      avgLatency: Number(h.avgLatency ?? 0),
    }));
  }, [overview]);

  // Source distribution
  const sourceData = useMemo(() => {
    const raw = (overview?.bySource ?? []) as Array<Record<string, unknown>>;
    return raw.map((s) => ({
      source: String(s.source ?? "unknown"),
      count: Number(s.count ?? 0),
    }));
  }, [overview]);

  // Status breakdown
  const statusBreakdown = useMemo(() => {
    const raw = (overview?.byStatus ?? []) as Array<Record<string, unknown>>;
    const fallback: Record<string, number> = {};
    for (const t of traces) {
      fallback[t.status] = (fallback[t.status] || 0) + 1;
    }
    if (raw.length > 0) {
      for (const s of raw) {
        fallback[String(s.status ?? "unknown")] = Number(s.count ?? 0);
      }
    }
    return fallback;
  }, [overview, traces]);

  // Model performance from trace data (client-side grouping)
  const modelPerf = useMemo(() => {
    const map: Record<
      string,
      { count: number; totalLatency: number; latencies: number[]; totalCost: number; success: number }
    > = {};
    for (const t of traces) {
      if (!map[t.model]) {
        map[t.model] = {
          count: 0,
          totalLatency: 0,
          latencies: [],
          totalCost: 0,
          success: 0,
        };
      }
      const m = map[t.model];
      m.count++;
      m.totalLatency += t.latencyMs || 0;
      m.latencies.push(t.latencyMs || 0);
      m.totalCost += t.cost || 0;
      if (t.status === "success") m.success++;
    }
    return Object.entries(map)
      .map(([model, d]) => {
        const sorted = [...d.latencies].sort((a, b) => a - b);
        const p95 = sorted[Math.floor(sorted.length * 0.95)] ?? 0;
        return {
          model,
          count: d.count,
          avgLatency: d.count > 0 ? d.totalLatency / d.count : 0,
          p95Latency: p95,
          cost: d.totalCost,
          successRate: d.count > 0 ? (d.success / d.count) * 100 : 0,
        };
      })
      .sort((a, b) => b.count - a.count);
  }, [traces]);

  // ── Stats cards ──────────────────────────────────────────────

  const statsCards = [
    {
      label: "Total Traces",
      value: fmt(totalTraces),
      icon: Activity,
      color: "text-emerald-400",
      bg: "bg-emerald-500/15",
    },
    {
      label: "Success Rate",
      value: `${successRate.toFixed(1)}%`,
      icon: CheckCircle,
      color:
        successRate > 95
          ? "text-emerald-400"
          : successRate > 80
            ? "text-amber-400"
            : "text-red-400",
      bg:
        successRate > 95
          ? "bg-emerald-500/15"
          : successRate > 80
            ? "bg-amber-500/15"
            : "bg-red-500/15",
    },
    {
      label: "Avg Latency",
      value: `${avgLatency.toFixed(0)}ms`,
      icon: Clock,
      color: "text-violet-400",
      bg: "bg-violet-500/15",
    },
    {
      label: "Error Rate",
      value: `${errorRate.toFixed(1)}%`,
      icon: AlertTriangle,
      color: errorRate > 5 ? "text-red-400" : "text-amber-400",
      bg: errorRate > 5 ? "bg-red-500/15" : "bg-amber-500/15",
    },
  ];

  // ── Loading state ────────────────────────────────────────────

  if (loading) {
    return (
      <div className="p-4 md:p-6 space-y-6">
        <Skeleton className="h-8 w-48" />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-28 rounded-xl" />
          ))}
        </div>
        <Skeleton className="h-64 rounded-xl" />
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Skeleton className="h-64 rounded-xl" />
          <Skeleton className="h-64 rounded-xl" />
        </div>
        <Skeleton className="h-80 rounded-xl" />
      </div>
    );
  }

  // ── Render ───────────────────────────────────────────────────

  return (
    <div className="p-4 md:p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-emerald-500/15 flex items-center justify-center">
            <Activity className="h-5 w-5 text-emerald-400" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Observability</h1>
            <p className="text-sm text-muted-foreground">
              LLM call traces, performance metrics &amp; error tracking
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Select value={period} onValueChange={setPeriod}>
            <SelectTrigger className="w-28 h-9 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="1h">1 hour</SelectItem>
              <SelectItem value="24h">24 hours</SelectItem>
              <SelectItem value="7d">7 days</SelectItem>
              <SelectItem value="30d">30 days</SelectItem>
            </SelectContent>
          </Select>
          <Button
            variant={autoRefresh ? "default" : "outline"}
            size="sm"
            className="gap-2"
            onClick={() => setAutoRefresh(!autoRefresh)}
          >
            {autoRefresh ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4" />
            )}
            {autoRefresh ? "Auto" : "Refresh"}
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {statsCards.map((card) => {
          const Icon = card.icon;
          return (
            <Card key={card.label} className="border-border/50 bg-card/50">
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-2">
                  <div
                    className={`h-8 w-8 rounded-lg ${card.bg} flex items-center justify-center`}
                  >
                    <Icon className={`h-4 w-4 ${card.color}`} />
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {card.label}
                  </span>
                </div>
                <p className="text-2xl font-bold">{card.value}</p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Latency Distribution Chart */}
      <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Latency Distribution</CardTitle>
          <CardDescription className="text-xs">
            Traces per hour with average latency overlay
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={hourlyData}>
                <defs>
                  <linearGradient id="obsCountGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.4} />
                <XAxis
                  dataKey="hour"
                  stroke="hsl(var(--muted-foreground))"
                  fontSize={11}
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis
                  yAxisId="left"
                  stroke="hsl(var(--muted-foreground))"
                  fontSize={11}
                  tickLine={false}
                  axisLine={false}
                  label={{
                    value: "Count",
                    angle: -90,
                    position: "insideLeft",
                    style: { fontSize: 10, fill: "hsl(var(--muted-foreground))" },
                  }}
                />
                <YAxis
                  yAxisId="right"
                  orientation="right"
                  stroke="hsl(var(--muted-foreground))"
                  fontSize={11}
                  tickLine={false}
                  axisLine={false}
                  label={{
                    value: "Latency (ms)",
                    angle: 90,
                    position: "insideRight",
                    style: { fontSize: 10, fill: "hsl(var(--muted-foreground))" },
                  }}
                />
                <Tooltip contentStyle={TOOLTIP_STYLE} />
                <Area
                  yAxisId="left"
                  type="monotone"
                  dataKey="count"
                  stroke="#10b981"
                  fill="url(#obsCountGrad)"
                  strokeWidth={2}
                  name="Traces"
                />
                <Area
                  yAxisId="right"
                  type="monotone"
                  dataKey="avgLatency"
                  stroke="#f59e0b"
                  fill="none"
                  strokeWidth={2}
                  strokeDasharray="4 4"
                  name="Avg Latency"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Source Distribution + Status Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Source Distribution */}
        <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Source Distribution</CardTitle>
            <CardDescription className="text-xs">
              Traces by source type
            </CardDescription>
          </CardHeader>
          <CardContent>
            {sourceData.length > 0 ? (
              <div className="h-56">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart layout="vertical" data={sourceData}>
                    <XAxis
                      type="number"
                      stroke="hsl(var(--muted-foreground))"
                      fontSize={11}
                      tickLine={false}
                      axisLine={false}
                    />
                    <YAxis
                      type="category"
                      dataKey="source"
                      stroke="hsl(var(--muted-foreground))"
                      fontSize={11}
                      tickLine={false}
                      axisLine={false}
                      width={80}
                    />
                    <Tooltip contentStyle={TOOLTIP_STYLE} />
                    <Bar dataKey="count" radius={[0, 4, 4, 0]} barSize={24}>
                      {sourceData.map((entry, i) => (
                        <Cell
                          key={i}
                          fill={SOURCE_COLORS[entry.source] ?? "#6b7280"}
                        />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="h-56 flex items-center justify-center text-sm text-muted-foreground">
                No source data available
              </div>
            )}
          </CardContent>
        </Card>

        {/* Status Breakdown */}
        <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Status Breakdown</CardTitle>
            <CardDescription className="text-xs">
              Traces by status type
            </CardDescription>
          </CardHeader>
          <CardContent>
            {Object.keys(statusBreakdown).length > 0 ? (
              <div className="space-y-3 py-2">
                {Object.entries(statusBreakdown)
                  .sort(([, a], [, b]) => b - a)
                  .map(([status, count]) => {
                    const pct =
                      totalTraces > 0 ? (count / totalTraces) * 100 : 0;
                    return (
                      <div key={status} className="space-y-1.5">
                        <div className="flex items-center justify-between">
                          <Badge
                            variant="outline"
                            className={`text-[10px] capitalize ${statusColor(status)}`}
                          >
                            {status}
                          </Badge>
                          <span className="text-xs text-muted-foreground">
                            {fmt(count)} ({pct.toFixed(1)}%)
                          </span>
                        </div>
                        <div className="h-2 rounded-full bg-muted overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all ${
                              status === "success"
                                ? "bg-emerald-500"
                                : status === "error"
                                  ? "bg-red-500"
                                  : status === "timeout"
                                    ? "bg-amber-500"
                                    : "bg-violet-500"
                            }`}
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
              </div>
            ) : (
              <div className="h-56 flex items-center justify-center text-sm text-muted-foreground">
                No status data available
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Model Performance Table */}
      {modelPerf.length > 0 && (
        <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Model Performance</CardTitle>
            <CardDescription className="text-xs">
              Aggregated metrics by model from trace data
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="max-h-64 overflow-y-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-xs">Model</TableHead>
                    <TableHead className="text-xs text-right">Traces</TableHead>
                    <TableHead className="text-xs text-right">
                      Avg Latency
                    </TableHead>
                    <TableHead className="text-xs text-right">
                      P95 Latency
                    </TableHead>
                    <TableHead className="text-xs text-right">Cost</TableHead>
                    <TableHead className="text-xs">Success Rate</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {modelPerf.map((m) => (
                    <TableRow key={m.model}>
                      <TableCell className="text-xs font-medium">
                        {m.model}
                      </TableCell>
                      <TableCell className="text-xs text-right font-mono">
                        {fmt(m.count)}
                      </TableCell>
                      <TableCell
                        className={`text-xs text-right font-mono ${latencyColor(m.avgLatency)}`}
                      >
                        {m.avgLatency.toFixed(0)}ms
                      </TableCell>
                      <TableCell
                        className={`text-xs text-right font-mono ${latencyColor(m.p95Latency)}`}
                      >
                        {m.p95Latency.toFixed(0)}ms
                      </TableCell>
                      <TableCell className="text-xs text-right font-mono">
                        {fmtCost(m.cost)}
                      </TableCell>
                      <TableCell className="text-xs">
                        <div className="flex items-center gap-2">
                          <div className="flex-1 h-1.5 rounded-full bg-muted overflow-hidden">
                            <div
                              className={`h-full rounded-full ${
                                m.successRate >= 95
                                  ? "bg-emerald-500"
                                  : m.successRate >= 80
                                    ? "bg-amber-500"
                                    : "bg-red-500"
                              }`}
                              style={{ width: `${m.successRate}%` }}
                            />
                          </div>
                          <span
                            className={`text-[10px] font-medium ${
                              m.successRate >= 95
                                ? "text-emerald-400"
                                : m.successRate >= 80
                                  ? "text-amber-400"
                                  : "text-red-400"
                            }`}
                          >
                            {m.successRate.toFixed(0)}%
                          </span>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Trace Table */}
      <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
        <CardHeader className="pb-2">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            <div>
              <CardTitle className="text-base">Traces</CardTitle>
              <CardDescription className="text-xs">
                {fmt(traceTotal)} traces found
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1 text-muted-foreground">
                <Filter className="h-3.5 w-3.5" />
                <span className="text-[10px]">Filter:</span>
              </div>
              <Select value={sourceFilter} onValueChange={setSourceFilter}>
                <SelectTrigger className="w-24 h-7 text-[10px]">
                  <SelectValue placeholder="Source" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All sources</SelectItem>
                  <SelectItem value="chat">Chat</SelectItem>
                  <SelectItem value="agent">Agent</SelectItem>
                  <SelectItem value="workflow">Workflow</SelectItem>
                  <SelectItem value="rag">RAG</SelectItem>
                </SelectContent>
              </Select>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-24 h-7 text-[10px]">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All status</SelectItem>
                  <SelectItem value="success">Success</SelectItem>
                  <SelectItem value="error">Error</SelectItem>
                  <SelectItem value="timeout">Timeout</SelectItem>
                  <SelectItem value="filtered">Filtered</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {traces.length > 0 ? (
            <div className="max-h-[500px] overflow-y-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-xs">Time</TableHead>
                    <TableHead className="text-xs">Source</TableHead>
                    <TableHead className="text-xs">Model</TableHead>
                    <TableHead className="text-xs text-right">
                      Latency
                    </TableHead>
                    <TableHead className="text-xs text-right">Tokens</TableHead>
                    <TableHead className="text-xs text-right">Cost</TableHead>
                    <TableHead className="text-xs">Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {traces.map((t) => {
                    const total =
                      (t.totalTokens ?? 0) ||
                      ((t.inputTokens ?? 0) + (t.outputTokens ?? 0));
                    return (
                      <TableRow
                        key={t.id}
                        className="cursor-pointer hover:bg-muted/50 transition-colors"
                        onClick={() => {
                          setSelectedTrace(t);
                          setDialogOpen(true);
                        }}
                      >
                        <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                          {t.createdAt
                            ? format(new Date(t.createdAt), "HH:mm:ss")
                            : "—"}
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant="outline"
                            className={`text-[10px] capitalize ${sourceColor(t.source)}`}
                          >
                            {t.source}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-xs font-medium max-w-[120px] truncate">
                          {t.model}
                        </TableCell>
                        <TableCell
                          className={`text-xs text-right font-mono font-semibold ${latencyColor(t.latencyMs)}`}
                        >
                          {t.latencyMs?.toFixed(0) ?? "—"}ms
                        </TableCell>
                        <TableCell className="text-xs text-right font-mono">
                          {fmt(total)}
                        </TableCell>
                        <TableCell className="text-xs text-right font-mono">
                          {fmtCost(t.cost ?? 0)}
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant="outline"
                            className={`text-[10px] capitalize ${statusColor(t.status)}`}
                          >
                            {t.status}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="py-16 text-center text-sm text-muted-foreground">
              No traces found for the selected filters
            </div>
          )}
        </CardContent>
      </Card>

      {/* Trace Detail Dialog */}
      <TraceDetailDialog
        trace={selectedTrace}
        open={dialogOpen}
        onOpenChange={setDialogOpen}
      />
    </div>
  );
}