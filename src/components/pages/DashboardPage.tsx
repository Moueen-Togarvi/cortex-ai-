"use client";

import React, { useEffect, useState } from "react";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import {
  MessageSquare,
  FileText,
  Bot,
  DollarSign,
  Upload,
  UserPlus,
  Workflow,
  Activity,
} from "lucide-react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { api } from "@/lib/api";
import { useNavigationStore } from "@/store/navigationStore";

interface DashboardStats {
  totalConversations: number;
  totalDocuments: number;
  totalAgents: number;
  totalWorkflows: number;
  activeKnowledgeBases: number;
  tokensUsedThisMonth: number;
  costThisMonth: number;
  activeUsers: number;
  avgResponseTime: number;
  recentActivity: RecentActivityItem[];
}

interface RecentActivityItem {
  id: string;
  type: "agent_execution" | "document";
  title: string;
  description: string;
  status: string;
  createdAt: string;
}

interface UsageRecord {
  date: string;
  tokens: number;
  cost: number;
  requests: number;
}

const quickActions = [
  { label: "New Chat", icon: MessageSquare, page: "chat" as const },
  { label: "Upload Document", icon: Upload, page: "documents" as const },
  { label: "Create Agent", icon: UserPlus, page: "agent-studio" as const },
  { label: "Build Workflow", icon: Workflow, page: "workflows" as const },
];

const systemHealth = [
  { name: "LLM Gateway", status: "Operational", color: "bg-emerald-500" },
  { name: "RAG Engine", status: "Operational", color: "bg-emerald-500" },
  { name: "Document Service", status: "Processing", color: "bg-amber-500" },
  { name: "Agent Runtime", status: "Operational", color: "bg-emerald-500" },
];

const activityIconMap = {
  agent_execution: Bot,
  document: FileText,
  agent: Bot,
  workflow: Workflow,
  chat: MessageSquare,
};

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

function formatRelativeTime(dateStr: string): string {
  const now = new Date();
  const then = new Date(dateStr);
  const diffMs = now.getTime() - then.getTime();
  const diffSec = Math.floor(diffMs / 1000);
  if (diffSec < 60) return "just now";
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h ago`;
  const diffDay = Math.floor(diffHr / 24);
  if (diffDay < 7) return `${diffDay}d ago`;
  return then.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

// ── Skeleton Cards ──────────────────────────────────────────────

function StatCardSkeleton() {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center gap-3">
        <Skeleton className="h-10 w-10 rounded-lg" />
        <Skeleton className="h-4 w-28" />
      </CardHeader>
      <CardContent>
        <Skeleton className="h-8 w-20 mb-1" />
        <Skeleton className="h-3 w-32" />
      </CardContent>
    </Card>
  );
}

function ActivityItemSkeleton() {
  return (
    <div className="flex items-start gap-3 py-3">
      <Skeleton className="h-8 w-8 shrink-0 rounded-md" />
      <div className="flex-1 min-w-0 space-y-1">
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-3 w-24" />
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const setActivePage = useNavigationStore((s) => s.setActivePage);

  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [usageData, setUsageData] = useState<UsageRecord[]>([]);

  // Fetch dashboard stats
  useEffect(() => {
    api
      .getDashboardStats()
      .then((data) => setStats(data as unknown as DashboardStats))
      .catch((err) => console.error("Failed to fetch dashboard stats:", err))
      .finally(() => setLoading(false));
  }, []);

  // Fetch usage data
  useEffect(() => {
    api
      .getUsage(7)
      .then((r) => setUsageData((r as { usage: UsageRecord[] }).usage || []))
      .catch((err) => console.error("Failed to fetch usage:", err));
  }, []);

  // ── Derived stat cards ────────────────────────────────────────
  const statCards = loading
    ? Array.from({ length: 4 }, (_, i) => ({ key: `skeleton-${i}` }))
    : stats
      ? [
          {
            key: "conversations",
            label: "Total Conversations",
            value: (stats.totalConversations ?? 0).toLocaleString(),
            icon: MessageSquare,
            change: `${stats.activeUsers ?? 0} active users`,
            changeColor: "text-emerald-500",
          },
          {
            key: "documents",
            label: "Documents",
            value: (stats.totalDocuments ?? 0).toLocaleString(),
            icon: FileText,
            change: `${stats.activeKnowledgeBases ?? 0} active KBs`,
            changeColor: "text-muted-foreground",
          },
          {
            key: "agents",
            label: "Active Agents",
            value: stats.totalAgents ?? 0,
            icon: Bot,
            change: `${stats.totalWorkflows ?? 0} workflows`,
            changeColor: "text-muted-foreground",
          },
          {
            key: "cost",
            label: "Monthly Cost",
            value: `$${(stats.costThisMonth ?? 0).toFixed(1)}`,
            icon: DollarSign,
            change: `Avg ${(stats.avgResponseTime ?? 0).toFixed(1)}s response`,
            changeColor: "text-muted-foreground",
          },
        ]
      : [];

  // ── Chart data ────────────────────────────────────────────────
  const chartData = usageData.map((r) => ({
    ...r,
    label: formatChartDate(r.date),
    tokensK: +(r.tokens / 1000).toFixed(1),
  }));

  const totalTokens = usageData.reduce((a, b) => a + b.tokens, 0);
  const totalCost = usageData.reduce((a, b) => a + b.cost, 0);
  const avgPerDay =
    usageData.length > 0 ? Math.round(totalTokens / usageData.length) : 0;

  // ── Activity feed ──────────────────────────────────────────────
  const recentActivity = stats?.recentActivity ?? [];

  return (
    <div className="p-4 md:p-6 space-y-6">
      {/* Stats Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {loading
          ? Array.from({ length: 4 }, (_, i) => <StatCardSkeleton key={i} />)
          : statCards.map((stat) => {
              const Icon = (stat as { icon: typeof MessageSquare }).icon;
              const s = stat as {
                key: string;
                label: string;
                value: string | number;
                icon: typeof MessageSquare;
                change: string;
                changeColor: string;
              };
              return (
                <Card key={s.key}>
                  <CardHeader className="flex flex-row items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted">
                      <Icon className="h-5 w-5 text-muted-foreground" />
                    </div>
                    <span className="text-sm font-medium text-muted-foreground">
                      {s.label}
                    </span>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{s.value}</div>
                    <p className={`mt-1 text-xs ${s.changeColor}`}>
                      {s.change}
                    </p>
                  </CardContent>
                </Card>
              );
            })}
      </div>

      {/* Two-column layout: Chart + Activity Feed */}
      <div className="grid grid-cols-1 lg:grid-cols-7 gap-4">
        {/* Left: Token Usage Chart */}
        <Card className="lg:col-span-4">
          <CardHeader>
            <CardTitle>Token Usage</CardTitle>
            <CardDescription>Last 7 days</CardDescription>
          </CardHeader>
          <CardContent>
            {chartData.length > 0 ? (
              <>
                <div className="h-[280px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={chartData}>
                      <defs>
                        <linearGradient id="tokenGradient" x1="0" y1="0" x2="0" y2="1">
                          <stop
                            offset="5%"
                            stopColor="var(--chart-1)"
                            stopOpacity={0.3}
                          />
                          <stop
                            offset="95%"
                            stopColor="var(--chart-1)"
                            stopOpacity={0}
                          />
                        </linearGradient>
                      </defs>
                      <CartesianGrid
                        strokeDasharray="3 3"
                        className="stroke-border"
                      />
                      <XAxis
                        dataKey="label"
                        tick={{ fontSize: 12 }}
                        className="text-muted-foreground"
                        tickLine={false}
                        axisLine={false}
                      />
                      <YAxis
                        tick={{ fontSize: 12 }}
                        className="text-muted-foreground"
                        tickLine={false}
                        axisLine={false}
                        tickFormatter={(v: number) => `${v}K`}
                      />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: "hsl(var(--card))",
                          border: "1px solid hsl(var(--border))",
                          borderRadius: "8px",
                          fontSize: "12px",
                        }}
                        labelFormatter={(label: string) => `Date: ${label}`}
                        formatter={(value: number) => [
                          `${value}K tokens`,
                          "Tokens",
                        ]}
                      />
                      <Area
                        type="monotone"
                        dataKey="tokensK"
                        stroke="var(--chart-1)"
                        fill="url(#tokenGradient)"
                        strokeWidth={2}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
                <p className="mt-3 text-xs text-muted-foreground">
                  Total: {(totalTokens / 1_000_000).toFixed(2)}M tokens | Cost: $
                  {totalCost.toFixed(2)} | Avg: {(avgPerDay / 1000).toFixed(0)}K/day
                </p>
              </>
            ) : (
              <div className="h-[280px] w-full flex items-center justify-center">
                <p className="text-sm text-muted-foreground">No usage data yet</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Right: Activity Feed */}
        <Card className="lg:col-span-3">
          <CardHeader>
            <CardTitle>Recent Activity</CardTitle>
          </CardHeader>
          <CardContent>
            <ScrollArea className="max-h-96 overflow-y-auto">
              <div className="space-y-1">
                {loading ? (
                  Array.from({ length: 5 }, (_, i) => (
                    <React.Fragment key={`skel-${i}`}>
                      <ActivityItemSkeleton />
                      {i < 4 && <Separator />}
                    </React.Fragment>
                  ))
                ) : recentActivity.length > 0 ? (
                  recentActivity.map((item, idx) => {
                    // Determine icon based on activity type
                    const Icon =
                      (activityIconMap as Record<string, typeof Activity>)[
                        item.type
                      ] ?? Activity;
                    return (
                      <React.Fragment key={item.id}>
                        <div className="flex items-start gap-3 py-3">
                          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-muted">
                            <Icon className="h-4 w-4 text-muted-foreground" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate">
                              {item.title}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {item.description} &middot;{" "}
                              {formatRelativeTime(item.createdAt)}
                            </p>
                          </div>
                        </div>
                        {idx < recentActivity.length - 1 && <Separator />}
                      </React.Fragment>
                    );
                  })
                ) : (
                  <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
                    <Activity className="size-8 opacity-40" />
                    <p className="text-xs mt-2">No recent activity</p>
                  </div>
                )}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      </div>

      {/* Bottom row: Quick Actions + System Health */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Quick Actions */}
        <Card>
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-2 xl:grid-cols-4 gap-3">
              {quickActions.map((action) => {
                const Icon = action.icon;
                return (
                  <button
                    key={action.label}
                    onClick={() => setActivePage(action.page)}
                    className="flex flex-col items-center gap-2 rounded-lg border p-4 transition-colors hover:bg-muted/50 cursor-pointer"
                  >
                    <Icon className="h-6 w-6 text-muted-foreground" />
                    <span className="text-xs font-medium text-center">
                      {action.label}
                    </span>
                  </button>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* System Health */}
        <Card>
          <CardHeader>
            <CardTitle>System Health</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {systemHealth.map((service) => (
                <div
                  key={service.name}
                  className="flex items-center gap-3 rounded-lg border p-3"
                >
                  <span
                    className={`h-2.5 w-2.5 rounded-full shrink-0 ${service.color}`}
                  />
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">
                      {service.name}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {service.status}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
