"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Webhook, Plus, MoreHorizontal, Loader2, CheckCircle2, XCircle, Trash2, RefreshCw, Eye, Clock, AlertCircle, Copy,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { api } from "@/lib/api";

interface WebhookItem {
  id: string;
  name: string;
  url: string;
  events: string[];
  enabled: boolean;
  lastDeliveryAt: string | null;
  successRate: number;
  deliveryCount: number;
  createdAt: string;
}

interface Delivery {
  id: string;
  eventId: string;
  statusCode: number;
  durationMs: number;
  success: boolean;
  createdAt: string;
}

const EVENT_TYPES = [
  { value: "agent.complete", label: "Agent Completed" },
  { value: "workflow.done", label: "Workflow Finished" },
  { value: "document.processed", label: "Document Processed" },
  { value: "conversation.created", label: "Conversation Created" },
  { value: "user.invited", label: "User Invited" },
];

function statusBadge(status: number) {
  if (status >= 200 && status < 300) return <Badge className="bg-emerald-500/15 text-emerald-400 border-emerald-500/20 text-[10px] h-5">{status}</Badge>;
  if (status >= 400) return <Badge className="bg-red-500/15 text-red-400 border-red-500/20 text-[10px] h-5">{status}</Badge>;
  return <Badge className="bg-amber-500/15 text-amber-400 border-amber-500/20 text-[10px] h-5">{status}</Badge>;
}

export default function WebhooksPage() {
  const [webhooks, setWebhooks] = useState<WebhookItem[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [deliveries, setDeliveries] = useState<Delivery[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [name, setName] = useState("");
  const [url, setUrl] = useState("");
  const [events, setEvents] = useState<string[]>(["agent.complete"]);
  const [creating, setCreating] = useState(false);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api.get("/webhooks") as WebhookItem[];
      setWebhooks(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("Failed to fetch webhooks:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchDeliveries = async (id: string) => {
    setSelectedId(id);
    try {
      const data = await api.get(`/webhooks/${id}/deliveries`) as { deliveries: Delivery[] };
      setDeliveries(data?.deliveries ?? []);
    } catch {
      setDeliveries([]);
    }
  };

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const handleCreate = async () => {
    if (!name.trim() || !url.trim()) return;
    setCreating(true);
    try {
      await api.post("/webhooks", { name, url, events });
      toast.success(`Webhook "${name}" created`);
      setShowCreate(false);
      setName("");
      setUrl("");
      setEvents(["agent.complete"]);
      fetchAll();
    } catch {
      toast.error("Failed to create webhook");
    } finally {
      setCreating(false);
    }
  };

  const toggleWebhook = async (id: string, enabled: boolean) => {
    try {
      await api.put(`/webhooks/${id}`, { enabled });
      fetchAll();
    } catch {
      toast.error("Failed to update webhook");
    }
  };

  const deleteWebhook = async (id: string) => {
    try {
      await api.del(`/webhooks/${id}`);
      toast.success("Webhook deleted");
      if (selectedId === id) { setSelectedId(null); setDeliveries([]); }
      fetchAll();
    } catch {
      toast.error("Failed to delete webhook");
    }
  };

  const toggleEvent = (event: string) => {
    setEvents(prev => prev.includes(event) ? prev.filter(e => e !== event) : [...prev, event]);
  };

  const copyUrl = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success("URL copied");
  };

  if (loading) {
    return (
      <div className="p-4 md:p-6 space-y-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-64 rounded-xl" />
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-violet-500/15 flex items-center justify-center">
            <Webhook className="h-5 w-5 text-violet-400" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Webhooks</h1>
            <p className="text-sm text-muted-foreground">Configure outbound HTTP callbacks for platform events</p>
          </div>
        </div>
        <Button className="gap-2 bg-emerald-600 hover:bg-emerald-700 text-white" onClick={() => setShowCreate(true)}>
          <Plus className="h-4 w-4" />
          Create Webhook
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Webhooks List */}
        <div className="lg:col-span-1 space-y-3">
          {webhooks.length === 0 ? (
            <Card className="border-border/50 bg-card/50">
              <CardContent className="py-12 text-center">
                <Webhook className="h-8 w-8 text-muted-foreground/30 mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">No webhooks configured</p>
                <p className="text-xs text-muted-foreground/60 mt-1">Create one to receive event notifications</p>
              </CardContent>
            </Card>
          ) : (
            webhooks.map(wh => (
              <Card key={wh.id} className={`border transition-colors ${selectedId === wh.id ? "border-emerald-500/50 bg-emerald-500/5" : "border-border/50 bg-card/50 hover:bg-card"}`}>
                <CardContent className="p-4 space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <button className="text-left flex-1 min-w-0" onClick={() => fetchDeliveries(wh.id)}>
                      <p className="text-sm font-medium truncate">{wh.name}</p>
                      <p className="text-xs text-muted-foreground truncate mt-0.5 font-mono">{wh.url}</p>
                    </button>
                    <div className="flex items-center gap-1.5">
                      <Switch checked={wh.enabled} onCheckedChange={v => toggleWebhook(wh.id, v)} className="scale-75" />
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-7 w-7"><MoreHorizontal className="h-3.5 w-3.5" /></Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => copyUrl(wh.url)}><Copy className="h-3.5 w-3.5 mr-2" />Copy URL</DropdownMenuItem>
                          <DropdownMenuItem className="text-red-400" onClick={() => deleteWebhook(wh.id)}><Trash2 className="h-3.5 w-3.5 mr-2" />Delete</DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {wh.events.map(e => <Badge key={e} variant="outline" className="text-[9px] font-normal h-4 px-1.5">{e}</Badge>)}
                  </div>
                  <div className="flex items-center gap-3 text-[10px] text-muted-foreground">
                    <span className="flex items-center gap-1"><AlertCircle className="h-3 w-3" />{wh.deliveryCount} deliveries</span>
                    <span className="flex items-center gap-1">{wh.successRate.toFixed(0)}% success</span>
                    {wh.lastDeliveryAt && <span>{new Date(wh.lastDeliveryAt).toLocaleDateString()}</span>}
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>

        {/* Delivery Log */}
        <Card className="lg:col-span-2 border-border/50 bg-card/50 backdrop-blur-sm">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-base">Delivery Log</CardTitle>
                <CardDescription className="text-xs">{selectedId ? `${deliveries.length} deliveries for selected webhook` : "Select a webhook to view deliveries"}</CardDescription>
              </div>
              {selectedId && (
                <Button variant="ghost" size="sm" className="h-8 text-xs gap-1.5" onClick={() => fetchDeliveries(selectedId)}>
                  <RefreshCw className="h-3.5 w-3.5" /> Refresh
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {!selectedId ? (
              <div className="py-12 text-center">
                <Eye className="h-8 w-8 text-muted-foreground/30 mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">Select a webhook to view delivery history</p>
              </div>
            ) : deliveries.length === 0 ? (
              <div className="py-12 text-center">
                <Clock className="h-8 w-8 text-muted-foreground/30 mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">No deliveries yet</p>
              </div>
            ) : (
              <div className="max-h-96 overflow-y-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-xs">Event</TableHead>
                      <TableHead className="text-xs">Status</TableHead>
                      <TableHead className="text-xs text-right">Duration</TableHead>
                      <TableHead className="text-xs text-right">Time</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {deliveries.map(d => (
                      <TableRow key={d.id}>
                        <TableCell className="text-xs font-mono">{d.eventId}</TableCell>
                        <TableCell className="flex items-center gap-1.5">
                          {d.success ? <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" /> : <XCircle className="h-3.5 w-3.5 text-red-400" />}
                          {statusBadge(d.statusCode)}
                        </TableCell>
                        <TableCell className="text-xs text-right font-mono">{d.durationMs}ms</TableCell>
                        <TableCell className="text-xs text-right text-muted-foreground">{new Date(d.createdAt).toLocaleString()}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Create Dialog */}
      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Create Webhook</DialogTitle>
            <DialogDescription>Configure an HTTP endpoint to receive event notifications</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div className="space-y-2">
              <Label>Name</Label>
              <Input placeholder="e.g., Slack Notifications" value={name} onChange={e => setName(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Endpoint URL</Label>
              <Input placeholder="https://hooks.slack.com/services/..." value={url} onChange={e => setUrl(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Events</Label>
              <div className="space-y-1.5">
                {EVENT_TYPES.map(evt => (
                  <label key={evt.value} className="flex items-center gap-2 text-sm cursor-pointer">
                    <input type="checkbox" checked={events.includes(evt.value)} onChange={() => toggleEvent(evt.value)} className="rounded border-muted" />
                    <span>{evt.label}</span>
                    <span className="text-xs text-muted-foreground font-mono">{evt.value}</span>
                  </label>
                ))}
              </div>
            </div>
            <Button className="w-full bg-emerald-600 hover:bg-emerald-700 text-white" disabled={creating || !name.trim() || !url.trim()} onClick={handleCreate}>
              {creating && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {creating ? "Creating..." : "Create Webhook"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
