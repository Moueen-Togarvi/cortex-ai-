"use client";

import React, { useState, useEffect, useCallback } from "react";

import { api } from "@/lib/api";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

import {
  ScrollText,
  RefreshCw,
  Filter,
  Shield,
  Bot,
  Workflow,
  MessageSquare,
  FileText,
  Database,
  Key,
  User,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";

interface AuditLogEntry {
  id: string;
  action: string;
  resource: string | null;
  resourceId: string | null;
  details: string | null;
  ipAddress: string | null;
  userAgent: string | null;
  createdAt: string;
  user?: { name: string; email: string } | null;
}

const actionIcons: Record<string, React.ElementType> = {
  login: User,
  logout: User,
  register: User,
  create_agent: Bot,
  run_agent: Bot,
  create_workflow: Workflow,
  run_workflow: Workflow,
  create_conversation: MessageSquare,
  send_message: MessageSquare,
  upload_document: FileText,
  create_knowledge_base: Database,
  create_api_key: Key,
};

const actionColors: Record<string, string> = {
  login: "bg-emerald-500/10 text-emerald-500",
  logout: "bg-gray-500/10 text-gray-500",
  register: "bg-blue-500/10 text-blue-500",
  create_agent: "bg-purple-500/10 text-purple-500",
  run_agent: "bg-violet-500/10 text-violet-500",
  create_workflow: "bg-orange-500/10 text-orange-500",
  run_workflow: "bg-amber-500/10 text-amber-500",
  create_conversation: "bg-cyan-500/10 text-cyan-500",
  send_message: "bg-teal-500/10 text-teal-500",
  upload_document: "bg-rose-500/10 text-rose-500",
  default: "bg-muted text-muted-foreground",
};

function formatAction(action: string): string {
  return action
    .split("_")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

function formatTime(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  if (diffMins < 1) return "just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString();
}

export default function AuditLogsPage() {
  const [logs, setLogs] = useState<AuditLogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionFilter, setActionFilter] = useState<string>("all");
  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const pageSize = 25;

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    try {
      const data = (await api.getAuditLogs({
        action: actionFilter !== "all" ? actionFilter : undefined,
        limit: pageSize,
        offset: page * pageSize,
      })) as AuditLogEntry[];
      setLogs(data);
      setTotalPages(Math.max(1, Math.ceil(data.length / pageSize)));
    } catch (err) {
      console.error("Failed to fetch audit logs:", err);
    } finally {
      setLoading(false);
    }
  }, [actionFilter, page]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  const uniqueActions = [...new Set(logs.map((l) => l.action))];

  return (
    <div className="p-4 md:p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex size-10 items-center justify-center rounded-xl bg-primary/10">
            <Shield className="size-5 text-primary" />
          </div>
          <div>
            <h1 className="text-xl font-semibold">Audit Logs</h1>
            <p className="text-sm text-muted-foreground">
              Track all platform activity and user actions
            </p>
          </div>
        </div>
        <Button variant="outline" size="sm" onClick={fetchLogs} disabled={loading}>
          <RefreshCw className={cn("size-4 mr-1.5", loading && "animate-spin")} />
          Refresh
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center gap-4 flex-wrap">
            <div className="flex items-center gap-2">
              <Filter className="size-4 text-muted-foreground" />
              <span className="text-sm font-medium">Filter:</span>
            </div>
            <Select value={actionFilter} onValueChange={(v) => { setActionFilter(v); setPage(0); }}>
              <SelectTrigger className="w-48 h-8">
                <SelectValue placeholder="All Actions" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Actions</SelectItem>
                {uniqueActions.map((action) => (
                  <SelectItem key={action} value={action}>
                    {formatAction(action)}
                  </SelectItem>
                ))}
                <SelectItem value="login">Login</SelectItem>
                <SelectItem value="register">Register</SelectItem>
                <SelectItem value="create_agent">Create Agent</SelectItem>
                <SelectItem value="run_agent">Run Agent</SelectItem>
                <SelectItem value="create_workflow">Create Workflow</SelectItem>
                <SelectItem value="run_workflow">Run Workflow</SelectItem>
                <SelectItem value="send_message">Send Message</SelectItem>
                <SelectItem value="upload_document">Upload Document</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Logs Table */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <ScrollText className="size-4" />
            Activity Log
            <Badge variant="secondary" className="text-xs font-normal">
              {logs.length} entries
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <ScrollArea className="max-h-[calc(100vh-22rem)]">
            {loading ? (
              <div className="p-4 space-y-3">
                {Array.from({ length: 8 }).map((_, i) => (
                  <div key={i} className="flex items-center gap-4">
                    <Skeleton className="size-8 rounded-full" />
                    <div className="flex-1 space-y-2">
                      <Skeleton className="h-4 w-48" />
                      <Skeleton className="h-3 w-32" />
                    </div>
                    <Skeleton className="h-4 w-20" />
                  </div>
                ))}
              </div>
            ) : logs.length === 0 ? (
              <div className="py-12 text-center">
                <ScrollText className="size-10 mx-auto text-muted-foreground/30 mb-3" />
                <p className="text-sm text-muted-foreground">No audit logs found</p>
                <p className="text-xs text-muted-foreground/60 mt-1">
                  Actions will appear here as users interact with the platform
                </p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12" />
                    <TableHead>Action</TableHead>
                    <TableHead>User</TableHead>
                    <TableHead>Resource</TableHead>
                    <TableHead>IP Address</TableHead>
                    <TableHead className="text-right">Time</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {logs.map((log) => {
                    const Icon = actionIcons[log.action] || ScrollText;
                    const colorClass = actionColors[log.action] || actionColors.default;
                    return (
                      <TableRow key={log.id}>
                        <TableCell>
                          <div className={cn("size-8 rounded-full flex items-center justify-center", colorClass)}>
                            <Icon className="size-4" />
                          </div>
                        </TableCell>
                        <TableCell>
                          <span className="text-sm font-medium">
                            {formatAction(log.action)}
                          </span>
                        </TableCell>
                        <TableCell>
                          <span className="text-sm text-muted-foreground">
                            {log.user?.name ?? "System"}
                          </span>
                        </TableCell>
                        <TableCell>
                          {log.resource ? (
                            <div className="flex items-center gap-1.5">
                              <Badge variant="outline" className="text-[10px] font-normal">
                                {log.resource}
                              </Badge>
                              {log.resourceId && (
                                <span className="text-[10px] text-muted-foreground font-mono">
                                  {log.resourceId.slice(0, 8)}…
                                </span>
                              )}
                            </div>
                          ) : (
                            <span className="text-xs text-muted-foreground">—</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <span className="text-xs text-muted-foreground font-mono">
                            {log.ipAddress ?? "—"}
                          </span>
                        </TableCell>
                        <TableCell className="text-right">
                          <span className="text-xs text-muted-foreground">
                            {formatTime(log.createdAt)}
                          </span>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            )}
          </ScrollArea>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between border-t px-4 py-3">
              <span className="text-xs text-muted-foreground">
                Page {page + 1} of {totalPages}
              </span>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="icon"
                  className="size-8"
                  disabled={page === 0}
                  onClick={() => setPage((p) => p - 1)}
                >
                  <ChevronLeft className="size-4" />
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  className="size-8"
                  disabled={page >= totalPages - 1}
                  onClick={() => setPage((p) => p + 1)}
                >
                  <ChevronRight className="size-4" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}