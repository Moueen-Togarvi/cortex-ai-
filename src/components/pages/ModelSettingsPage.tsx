"use client";

import React, { useState, useMemo, useEffect } from "react";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import { Zap, Clock, Coins, Activity, TestTube2, Loader2 } from "lucide-react";
import { api } from "@/lib/api";

const providerColors: Record<string, string> = {
  openai: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400",
  anthropic: "bg-orange-500/15 text-orange-600 dark:text-orange-400",
  google: "bg-red-500/15 text-red-600 dark:text-red-400",
  deepseek: "bg-sky-500/15 text-sky-600 dark:text-sky-400",
};

const providerLabels: Record<string, string> = {
  openai: "OpenAI",
  anthropic: "Anthropic",
  google: "Google",
  deepseek: "DeepSeek",
};

interface ModelData {
  id: string;
  name: string;
  provider: string;
  modelId: string;
  status: "active" | "inactive" | "error";
  inputPrice: number;
  outputPrice: number;
  contextWindow: number;
  maxOutput: number;
  totalUsage: number;
  totalCost: number;
  avgLatency: number;
}

interface UsageRecord {
  date: string;
  tokens: number;
  cost: number;
  requests: number;
}

interface UsageData {
  data: UsageRecord[];
  summary: {
    totalTokens: number;
    totalCost: number;
    totalRequests: number;
  };
}

function formatChartDate(dateStr: string) {
  const d = new Date(dateStr);
  const months = [
    "Jan",
    "Feb",
    "Mar",
    "Apr",
    "May",
    "Jun",
    "Jul",
    "Aug",
    "Sep",
    "Oct",
    "Nov",
    "Dec",
  ];
  return `${months[d.getMonth()]} ${d.getDate()}`;
}

function formatNumber(n: number) {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return n.toString();
}

export default function ModelSettingsPage() {
  const [models, setModels] = useState<ModelData[]>([]);
  const [usageData, setUsageData] = useState<UsageRecord[]>([]);
  const [usageSummary, setUsageSummary] = useState<{ totalTokens: number; totalCost: number; totalRequests: number }>({
    totalTokens: 0,
    totalCost: 0,
    totalRequests: 0,
  });
  const [loadingModels, setLoadingModels] = useState(true);
  const [loadingUsage, setLoadingUsage] = useState(true);

  const [modelStatuses, setModelStatuses] = useState<Record<string, boolean>>({});

  useEffect(() => {
    api.getModels()
      .then((data) => {
        const modelsData = (data as ModelData[]) ?? [];
        setModels(modelsData);
        setModelStatuses(
          Object.fromEntries(
            modelsData.map((m) => [m.id, m.status === "active"])
          )
        );
      })
      .catch((err) => console.error("Failed to fetch models:", err))
      .finally(() => setLoadingModels(false));

    api.getUsage(7)
      .then((data) => {
        const usage = data as UsageData;
        setUsageData(usage.data ?? []);
        setUsageSummary(usage.summary ?? { totalTokens: 0, totalCost: 0, totalRequests: 0 });
      })
      .catch((err) => console.error("Failed to fetch usage:", err))
      .finally(() => setLoadingUsage(false));
  }, []);

  function toggleModelStatus(id: string, checked: boolean) {
    setModelStatuses((prev) => ({ ...prev, [id]: checked }));
  }

  // Summary stats for Usage tab
  const summaryStats = useMemo(() => {
    if (usageSummary.totalTokens > 0 || usageSummary.totalCost > 0 || usageSummary.totalRequests > 0) {
      const activeModels = models.filter((m) => m.status === "active");
      const avgLatency =
        activeModels.reduce((a, m) => a + m.avgLatency, 0) /
        (activeModels.length || 1);

      return {
        totalTokens: usageSummary.totalTokens,
        totalCost: usageSummary.totalCost,
        totalRequests: usageSummary.totalRequests,
        avgLatency: avgLatency.toFixed(1),
      };
    }

    // Fallback to model-level calculation
    const totalTokens = models.reduce((a, m) => a + m.totalUsage, 0);
    const totalCost = models.reduce((a, m) => a + m.totalCost, 0);
    const totalRequests = usageData.reduce(
      (a, r) => a + r.requests,
      0
    );
    const activeModels = models.filter(
      (m) => m.status === "active"
    );
    const avgLatency =
      activeModels.reduce((a, m) => a + m.avgLatency, 0) /
      (activeModels.length || 1);

    return {
      totalTokens,
      totalCost,
      totalRequests,
      avgLatency: avgLatency.toFixed(1),
    };
  }, [models, usageData, usageSummary]);

  const chartData = usageData.map((r) => ({
    ...r,
    label: formatChartDate(r.date),
    tokensK: +(r.tokens / 1000).toFixed(1),
  }));

  // Group models by provider
  const groupedModels = useMemo(() => {
    const groups: Record<string, ModelData[]> = {};
    for (const m of models) {
      if (!groups[m.provider]) groups[m.provider] = [];
      groups[m.provider].push(m);
    }
    return groups;
  }, [models]);

  return (
    <div className="p-4 md:p-6 space-y-6">
      <Tabs defaultValue="models">
        <TabsList>
          <TabsTrigger value="models">Models</TabsTrigger>
          <TabsTrigger value="usage">Usage</TabsTrigger>
        </TabsList>

        {/* ──── Models Tab ──── */}
        <TabsContent value="models" className="space-y-6">
          {loadingModels ? (
            <div className="space-y-6">
              {["openai", "anthropic"].map((provider) => (
                <React.Fragment key={provider}>
                  <div className="flex items-center gap-3">
                    <Skeleton className="h-6 w-20 rounded-md" />
                    <Skeleton className="h-px flex-1" />
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {Array.from({ length: 2 }).map((_, i) => (
                      <Card key={i}>
                        <CardHeader>
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0 flex-1 space-y-2">
                              <Skeleton className="h-5 w-3/4" />
                              <Skeleton className="h-4 w-1/2" />
                            </div>
                            <Skeleton className="h-6 w-16 rounded-md" />
                          </div>
                        </CardHeader>
                        <CardContent className="space-y-4">
                          <div className="flex gap-3">
                            <Skeleton className="h-12 w-20 rounded-lg" />
                            <Skeleton className="h-12 w-20 rounded-lg" />
                          </div>
                          <div className="grid grid-cols-3 gap-2">
                            <Skeleton className="h-14 rounded-lg" />
                            <Skeleton className="h-14 rounded-lg" />
                            <Skeleton className="h-14 rounded-lg" />
                          </div>
                          <Skeleton className="h-4 w-3/4" />
                          <Skeleton className="h-px w-full" />
                          <div className="flex items-center justify-between">
                            <Skeleton className="h-5 w-24" />
                            <Skeleton className="h-8 w-12 rounded-md" />
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </React.Fragment>
              ))}
            </div>
          ) : (
            Object.entries(groupedModels).map(([provider, provModels]) => (
              <React.Fragment key={provider}>
                <div className="flex items-center gap-3">
                  <Badge
                    variant="default"
                    className={providerColors[provider]}
                  >
                    {providerLabels[provider] ?? provider}
                  </Badge>
                  <Separator className="flex-1" />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {provModels.map((model) => (
                    <Card key={model.id}>
                      <CardHeader>
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <CardTitle className="text-base truncate">
                              {model.name}
                            </CardTitle>
                            <CardDescription className="font-mono text-xs truncate">
                              {model.modelId}
                            </CardDescription>
                          </div>
                          <Badge
                            variant="default"
                            className={providerColors[model.provider]}
                          >
                            {providerLabels[model.provider]}
                          </Badge>
                        </div>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        {/* Pricing */}
                        <div>
                          <p className="text-xs text-muted-foreground mb-1">
                            Pricing
                          </p>
                          <div className="flex gap-3">
                            <div className="rounded-lg bg-muted/50 px-3 py-1.5 text-center">
                              <p className="text-[10px] text-muted-foreground">
                                Input
                              </p>
                              <p className="text-sm font-semibold">
                                ${model.inputPrice}/M
                              </p>
                            </div>
                            <div className="rounded-lg bg-muted/50 px-3 py-1.5 text-center">
                              <p className="text-[10px] text-muted-foreground">
                                Output
                              </p>
                              <p className="text-sm font-semibold">
                                ${model.outputPrice}/M
                              </p>
                            </div>
                          </div>
                        </div>

                        {/* Stats grid */}
                        <div className="grid grid-cols-3 gap-2">
                          <div className="rounded-lg bg-muted/50 p-2 text-center">
                            <p className="text-[10px] text-muted-foreground">
                              Context
                            </p>
                            <p className="text-xs font-semibold">
                              {formatNumber(model.contextWindow)}
                            </p>
                          </div>
                          <div className="rounded-lg bg-muted/50 p-2 text-center">
                            <p className="text-[10px] text-muted-foreground">
                              Max Out
                            </p>
                            <p className="text-xs font-semibold">
                              {formatNumber(model.maxOutput)}
                            </p>
                          </div>
                          <div className="rounded-lg bg-muted/50 p-2 text-center">
                            <p className="text-[10px] text-muted-foreground">
                              Latency
                            </p>
                            <p className="text-xs font-semibold">
                              {model.avgLatency}s
                            </p>
                          </div>
                        </div>

                        {/* Usage */}
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-muted-foreground">
                            Usage: {formatNumber(model.totalUsage)} tokens
                          </span>
                          <span className="font-medium">
                            ${model.totalCost.toFixed(1)}
                          </span>
                        </div>

                        <Separator />

                        {/* Controls */}
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Switch
                              checked={modelStatuses[model.id] ?? true}
                              onCheckedChange={(checked) =>
                                toggleModelStatus(model.id, checked)
                              }
                            />
                            <span className="text-xs text-muted-foreground">
                              {modelStatuses[model.id] ? "Enabled" : "Disabled"}
                            </span>
                          </div>
                          <Button variant="outline" size="sm" className="gap-1.5">
                            <TestTube2 className="h-3.5 w-3.5" />
                            Test
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </React.Fragment>
            ))
          )}
        </TabsContent>

        {/* ──── Usage Tab ──── */}
        <TabsContent value="usage" className="space-y-6">
          {loadingUsage ? (
            <div className="space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {Array.from({ length: 4 }).map((_, i) => (
                  <Card key={i}>
                    <CardContent className="pt-6">
                      <div className="flex items-center gap-3">
                        <Skeleton className="h-10 w-10 rounded-lg" />
                        <div className="space-y-2">
                          <Skeleton className="h-3 w-32" />
                          <Skeleton className="h-7 w-16" />
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
              <Card>
                <CardHeader>
                  <Skeleton className="h-6 w-48" />
                </CardHeader>
                <CardContent>
                  <Skeleton className="h-[300px] w-full" />
                </CardContent>
              </Card>
            </div>
          ) : (
            <>
              {/* Summary cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <Card>
                  <CardContent className="pt-6">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted">
                        <Activity className="h-5 w-5 text-muted-foreground" />
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">
                          Total Tokens (this month)
                        </p>
                        <p className="text-xl font-bold">
                          {formatNumber(summaryStats.totalTokens)}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-6">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted">
                        <Coins className="h-5 w-5 text-muted-foreground" />
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">
                          Total Cost
                        </p>
                        <p className="text-xl font-bold">
                          ${summaryStats.totalCost.toFixed(2)}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-6">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted">
                        <Zap className="h-5 w-5 text-muted-foreground" />
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">
                          Total Requests
                        </p>
                        <p className="text-xl font-bold">
                          {summaryStats.totalRequests.toLocaleString()}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-6">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted">
                        <Clock className="h-5 w-5 text-muted-foreground" />
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">
                          Avg Latency
                        </p>
                        <p className="text-xl font-bold">
                          {summaryStats.avgLatency}s
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Usage Chart */}
              <Card>
                <CardHeader>
                  <CardTitle>Token Usage &amp; Cost (7 days)</CardTitle>
                </CardHeader>
                <CardContent>
                  {chartData.length > 0 ? (
                    <div className="h-[300px] w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <ComposedChart data={chartData}>
                          <CartesianGrid
                            strokeDasharray="3 3"
                            className="stroke-border"
                          />
                          <XAxis
                            dataKey="label"
                            tick={{ fontSize: 12 }}
                            tickLine={false}
                            axisLine={false}
                          />
                          <YAxis
                            yAxisId="left"
                            tick={{ fontSize: 12 }}
                            tickLine={false}
                            axisLine={false}
                            tickFormatter={(v: number) => `${v}K`}
                          />
                          <YAxis
                            yAxisId="right"
                            orientation="right"
                            tick={{ fontSize: 12 }}
                            tickLine={false}
                            axisLine={false}
                            tickFormatter={(v: number) => `$${v}`}
                          />
                          <Tooltip
                            contentStyle={{
                              backgroundColor: "hsl(var(--card))",
                              border: "1px solid hsl(var(--border))",
                              borderRadius: "8px",
                              fontSize: "12px",
                            }}
                            labelFormatter={(label: string) => `Date: ${label}`}
                          />
                          <Legend />
                          <Bar
                            yAxisId="left"
                            dataKey="tokensK"
                            name="Tokens (K)"
                            fill="var(--chart-1)"
                            radius={[4, 4, 0, 0]}
                          />
                          <Line
                            yAxisId="right"
                            type="monotone"
                            dataKey="cost"
                            name="Cost ($)"
                            stroke="var(--chart-2)"
                            strokeWidth={2}
                            dot={{ r: 3 }}
                          />
                        </ComposedChart>
                      </ResponsiveContainer>
                    </div>
                  ) : (
                    <div className="h-[300px] w-full flex items-center justify-center text-muted-foreground">
                      No usage data available
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Usage by model table */}
              <Card>
                <CardHeader>
                  <CardTitle>Usage by Model</CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Model</TableHead>
                        <TableHead>Provider</TableHead>
                        <TableHead className="text-right">Tokens</TableHead>
                        <TableHead className="text-right">Cost</TableHead>
                        <TableHead className="text-right hidden sm:table-cell">
                          Status
                        </TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {models.map((model) => (
                        <TableRow key={model.id}>
                          <TableCell className="font-medium">
                            {model.name}
                          </TableCell>
                          <TableCell>
                            <Badge
                              variant="default"
                              className={providerColors[model.provider]}
                            >
                              {providerLabels[model.provider]}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            {formatNumber(model.totalUsage)}
                          </TableCell>
                          <TableCell className="text-right">
                            ${model.totalCost.toFixed(2)}
                          </TableCell>
                          <TableCell className="text-right hidden sm:table-cell">
                            <Badge
                              variant={
                                model.status === "active" ? "default" : "secondary"
                              }
                              className={
                                model.status === "active"
                                  ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400"
                                  : ""
                              }
                            >
                              {model.status === "active" ? "Active" : "Inactive"}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
