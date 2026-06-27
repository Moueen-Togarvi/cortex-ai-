"use client";

import { useState, useEffect, useCallback } from "react";
import {
  CreditCard,
  DollarSign,
  Zap,
  TrendingUp,
  FileText,
  Loader2,
  Download,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { api } from "@/lib/api";

interface UsageRecord {
  id: string;
  date: string;
  tokens: number;
  cost: number;
  requests: number;
  model?: string;
  type?: string;
}

interface PlanInfo {
  name: string;
  price: number;
  tokensIncluded: number;
  tokensUsed: number;
  status: string;
}

function fmtTokens(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return n.toLocaleString();
}

export default function BillingPage() {
  const [loading, setLoading] = useState(true);
  const [usage, setUsage] = useState<UsageRecord[]>([]);
  const [totalCost, setTotalCost] = useState(0);
  const [totalTokens, setTotalTokens] = useState(0);
  const [totalRequests, setTotalRequests] = useState(0);

  const plan: PlanInfo = {
    name: "Enterprise",
    price: 299,
    tokensIncluded: 10_000_000,
    tokensUsed: totalTokens,
    status: "active",
  };

  const fetchUsage = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.getUsage(30) as { data: UsageRecord[]; summary: { totalTokens: number; totalCost: number; totalRequests: number } };
      setUsage(res.data ?? []);
      setTotalCost(res.summary?.totalCost ?? 0);
      setTotalTokens(res.summary?.totalTokens ?? 0);
      setTotalRequests(res.summary?.totalRequests ?? 0);
    } catch {
      setUsage([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchUsage(); }, [fetchUsage]);

  const usagePercent = plan.tokensIncluded > 0 ? Math.min(100, (plan.tokensUsed / plan.tokensIncluded) * 100) : 0;

  if (loading) {
    return (
      <div className="p-4 md:p-6 space-y-6">
        <Skeleton className="h-8 w-48" />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-28 rounded-xl" />)}
        </div>
        <Skeleton className="h-64 rounded-xl" />
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-amber-500/15 flex items-center justify-center">
            <CreditCard className="h-5 w-5 text-amber-400" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Billing & Usage</h1>
            <p className="text-sm text-muted-foreground">Monitor costs, usage, and plan details</p>
          </div>
        </div>
        <Button variant="outline" size="sm" className="gap-2">
          <Download className="h-4 w-4" /> Export Invoice
        </Button>
      </div>

      {/* Plan Card */}
      <Card className="border-border/50 bg-card/50">
        <CardContent className="p-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4">
            <div className="flex items-center gap-3">
              <FileText className="h-5 w-5 text-amber-400" />
              <div>
                <h3 className="font-semibold">{plan.name} Plan</h3>
                <p className="text-sm text-muted-foreground">${plan.price}/month</p>
              </div>
            </div>
            <Badge variant="default" className="bg-emerald-500/15 text-emerald-400 border-emerald-500/30">
              Active
            </Badge>
          </div>
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Token usage</span>
              <span className="font-mono">{fmtTokens(plan.tokensUsed)} / {fmtTokens(plan.tokensIncluded)}</span>
            </div>
            <Progress value={usagePercent} className="h-2" />
            <p className="text-xs text-muted-foreground">{usagePercent.toFixed(1)}% of monthly quota used</p>
          </div>
        </CardContent>
      </Card>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        <Card className="border-border/50 bg-card/50">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <DollarSign className="h-4 w-4 text-amber-400" />
              <span className="text-xs text-muted-foreground">Total Cost (30d)</span>
            </div>
            <p className="text-2xl font-bold">${totalCost.toFixed(2)}</p>
          </CardContent>
        </Card>
        <Card className="border-border/50 bg-card/50">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <Zap className="h-4 w-4 text-emerald-400" />
              <span className="text-xs text-muted-foreground">Total Tokens</span>
            </div>
            <p className="text-2xl font-bold">{fmtTokens(totalTokens)}</p>
          </CardContent>
        </Card>
        <Card className="border-border/50 bg-card/50">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <TrendingUp className="h-4 w-4 text-cyan-400" />
              <span className="text-xs text-muted-foreground">Total Requests</span>
            </div>
            <p className="text-2xl font-bold">{totalRequests.toLocaleString()}</p>
          </CardContent>
        </Card>
      </div>

      {/* Usage Table */}
      <Card className="border-border/50 bg-card/50">
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Usage History</CardTitle>
          <CardDescription className="text-xs">Daily usage breakdown for the last 30 days</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="max-h-96 overflow-y-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-xs">Date</TableHead>
                  <TableHead className="text-xs text-right">Requests</TableHead>
                  <TableHead className="text-xs text-right">Tokens</TableHead>
                  <TableHead className="text-xs text-right">Cost</TableHead>
                  <TableHead className="text-xs">Model</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {usage.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center text-muted-foreground py-8 text-sm">
                      No usage data yet. Start using the platform to see your usage history.
                    </TableCell>
                  </TableRow>
                )}
                {usage.map((u) => (
                  <TableRow key={u.id}>
                    <TableCell className="text-xs font-mono">{u.date}</TableCell>
                    <TableCell className="text-xs text-right">{u.requests}</TableCell>
                    <TableCell className="text-xs text-right font-mono">{fmtTokens(u.tokens)}</TableCell>
                    <TableCell className="text-xs text-right font-mono">${u.cost.toFixed(4)}</TableCell>
                    <TableCell className="text-xs">
                      {u.model && <Badge variant="secondary" className="text-[10px]">{u.model}</Badge>}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}