"use client";

import { useState, useEffect, useCallback } from "react";
import {
  BarChart3,
  Download,
  TrendingUp,
  Zap,
  Clock,
  DollarSign,
  Activity,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell,
} from "recharts";
import { api } from "@/lib/api";

function fmt(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return n.toLocaleString();
}

function successColor(rate: number): string {
  if (rate >= 95) return "bg-emerald-500";
  if (rate >= 80) return "bg-amber-500";
  return "bg-red-500";
}

function successTextColor(rate: number): string {
  if (rate >= 95) return "text-emerald-400";
  if (rate >= 80) return "text-amber-400";
  return "text-red-400";
}

export default function AnalyticsPage() {
  const [period, setPeriod] = useState("30");
  const [loading, setLoading] = useState(true);
  const [overview, setOverview] = useState<Record<string, number | string> | null>(null);
  const [models, setModels] = useState<Array<Record<string, unknown>>>([]);
  const [trend, setTrend] = useState<Array<Record<string, unknown>>>([]);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    const days = parseInt(period);
    try {
      const [ov, md, tr] = await Promise.all([
        api.get(`/analytics/overview?days=${days}`) as Promise<Record<string, unknown>>,
        api.get(`/analytics/models?days=${days}`) as Promise<Record<string, unknown>>,
        api.get(`/analytics/usage-trend?days=${days}`) as Promise<Record<string, unknown>>,
      ]);
      setOverview(ov ?? null);
      setModels((md?.models ?? []) as Array<Record<string, unknown>>);
      setTrend((tr?.trend ?? []) as Array<Record<string, unknown>>);
    } catch (err) {
      console.error("Failed to fetch analytics:", err);
    } finally {
      setLoading(false);
    }
  }, [period]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const overviewCards = [
    { label: "Total Tokens", value: fmt(Number(overview?.totalTokens ?? 0)), icon: Zap, color: "text-emerald-400", bg: "bg-emerald-500/15" },
    { label: "Total Cost", value: `$${Number(overview?.totalCost ?? 0).toFixed(2)}`, icon: DollarSign, color: "text-amber-400", bg: "bg-amber-500/15" },
    { label: "Total Requests", value: fmt(Number(overview?.totalRequests ?? 0)), icon: Activity, color: "text-cyan-400", bg: "bg-cyan-500/15" },
    { label: "Avg Latency", value: `${Number(overview?.avgLatency ?? 0).toFixed(0)}ms`, icon: Clock, color: "text-violet-400", bg: "bg-violet-500/15" },
  ];

  const chartColors = ["#10b981", "#f59e0b", "#06b6d4", "#f43f5e", "#8b5cf6"];

  if (loading) {
    return (
      <div className="p-4 md:p-6 space-y-6">
        <Skeleton className="h-8 w-48" />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-28 rounded-xl" />)}
        </div>
        <Skeleton className="h-64 rounded-xl" />
        <Skeleton className="h-64 rounded-xl" />
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-emerald-500/15 flex items-center justify-center">
            <BarChart3 className="h-5 w-5 text-emerald-400" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Analytics</h1>
            <p className="text-sm text-muted-foreground">Model performance, usage trends & cost analysis</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Select value={period} onValueChange={setPeriod}>
            <SelectTrigger className="w-28 h-9 text-xs"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="7">7 days</SelectItem>
              <SelectItem value="14">14 days</SelectItem>
              <SelectItem value="30">30 days</SelectItem>
              <SelectItem value="90">90 days</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" size="sm" className="gap-2" onClick={() => window.open(`/api/analytics/export?format=csv&days=${period}`, "_blank")}>
            <Download className="h-4 w-4" /> Export CSV
          </Button>
        </div>
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {overviewCards.map((card) => {
          const Icon = card.icon;
          return (
            <Card key={card.label} className="border-border/50 bg-card/50">
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-2">
                  <div className={`h-8 w-8 rounded-lg ${card.bg} flex items-center justify-center`}>
                    <Icon className={`h-4 w-4 ${card.color}`} />
                  </div>
                  <span className="text-xs text-muted-foreground">{card.label}</span>
                </div>
                <p className="text-2xl font-bold">{card.value}</p>
                {overview?.dailyGrowth && (
                  <div className="flex items-center gap-1 mt-1">
                    <TrendingUp className="h-3 w-3 text-emerald-400" />
                    <span className="text-[10px] text-emerald-400">{Number(overview.dailyGrowth).toFixed(1)}% daily</span>
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Usage Trend */}
      <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Usage Trend</CardTitle>
          <CardDescription className="text-xs">Token usage and cost over the last {period} days</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={trend}>
                <defs>
                  <linearGradient id="trendTokens" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="trendCost" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#f59e0b" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="date" tickFormatter={(v: string) => v.slice(5)} stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} />
                <Tooltip contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "8px", fontSize: "12px" }} />
                <Area type="monotone" dataKey="tokens" stroke="#10b981" fill="url(#trendTokens)" strokeWidth={2} />
                <Area type="monotone" dataKey="cost" stroke="#f59e0b" fill="url(#trendCost)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Model Comparison + Table side by side */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Model Comparison Chart */}
        <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Model Cost Comparison</CardTitle>
            <CardDescription className="text-xs">Cost per model for the selected period</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart layout="vertical" data={models}>
                  <XAxis type="number" stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} />
                  <YAxis type="category" dataKey="model" stroke="hsl(var(--muted-foreground))" fontSize={11} tickLine={false} axisLine={false} width={120} />
                  <Tooltip contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "8px", fontSize: "12px" }} formatter={(v: number) => [`$${v.toFixed(4)}`, "Cost"]} />
                  <Bar dataKey="cost" radius={[0, 4, 4, 0]} barSize={20}>
                    {models.map((_, i) => <Cell key={i} fill={chartColors[i % chartColors.length]} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Model Performance Table */}
        <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Model Performance</CardTitle>
            <CardDescription className="text-xs">Detailed metrics per model</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="max-h-64 overflow-y-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-xs">Model</TableHead>
                    <TableHead className="text-xs text-right">Tokens</TableHead>
                    <TableHead className="text-xs text-right">Cost</TableHead>
                    <TableHead className="text-xs text-right">Reqs</TableHead>
                    <TableHead className="text-xs">Success</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {models.map((m) => {
                    const rate = Number(m.successRate ?? 100);
                    return (
                      <TableRow key={String(m.model)}>
                        <TableCell className="text-xs font-medium">{String(m.model)}</TableCell>
                        <TableCell className="text-xs text-right font-mono">{fmt(Number(m.tokens ?? 0))}</TableCell>
                        <TableCell className="text-xs text-right font-mono">${Number(m.cost ?? 0).toFixed(2)}</TableCell>
                        <TableCell className="text-xs text-right">{fmt(Number(m.requests ?? 0))}</TableCell>
                        <TableCell className="text-xs">
                          <div className="flex items-center gap-2">
                            <div className="flex-1 h-1.5 rounded-full bg-muted overflow-hidden">
                              <div className={`h-full rounded-full ${successColor(rate)}`} style={{ width: `${rate}%` }} />
                            </div>
                            <span className={`text-[10px] font-medium ${successTextColor(rate)}`}>{rate.toFixed(0)}%</span>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
