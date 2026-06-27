"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Shield,
  Plus,
  Pencil,
  Trash2,
  Loader2,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  ShieldCheck,
  FileText,
  Activity,
  Clock,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";

// ── Types ────────────────────────────────────────────────────────

interface GuardrailPolicy {
  id: string;
  name: string;
  description?: string;
  type: string;
  enabled: boolean;
  scope: string;
  config: string;
  severity: string;
  action: string;
  createdAt: string;
  updatedAt: string;
  _count?: { evals: number };
}

interface EvalResult {
  policyId: string;
  policyName: string;
  policyType: string;
  passed: boolean;
  action: string;
  severity: string;
  violations: Array<{ type: string; matched: string; severity: string }>;
  maskedText?: string;
  latencyMs: number;
}

// ── Mappings ─────────────────────────────────────────────────────

const typeLabels: Record<string, string> = {
  pii_detection: "PII Detection",
  content_filter: "Content Filter",
  output_validation: "Output Validator",
  custom: "Custom",
};

const typeColors: Record<string, string> = {
  pii_detection: "bg-cyan-500/15 text-cyan-400 border-cyan-500/30",
  content_filter: "bg-amber-500/15 text-amber-400 border-amber-500/30",
  output_validation: "bg-violet-500/15 text-violet-400 border-violet-500/30",
  custom: "bg-gray-500/15 text-gray-400 border-gray-500/30",
};

const severityColors: Record<string, string> = {
  low: "bg-gray-500/15 text-gray-400 border-gray-500/30",
  medium: "bg-amber-500/15 text-amber-400 border-amber-500/30",
  high: "bg-orange-500/15 text-orange-400 border-orange-500/30",
  critical: "bg-red-500/15 text-red-400 border-red-500/30",
};

const actionLabels: Record<string, string> = {
  flag: "Flag Only",
  block: "Block",
  mask: "Auto-Mask",
  log: "Log Only",
};

const actionColors: Record<string, string> = {
  flag: "bg-blue-500/15 text-blue-400 border-blue-500/30",
  block: "bg-red-500/15 text-red-400 border-red-500/30",
  mask: "bg-amber-500/15 text-amber-400 border-amber-500/30",
  log: "bg-gray-500/15 text-gray-400 border-gray-500/30",
};

const scopeLabels: Record<string, string> = {
  all: "All Scopes",
  chat: "Chat",
  agent: "Agent",
  workflow: "Workflow",
};

const defaultConfigs: Record<string, string> = {
  pii_detection: JSON.stringify(
    {
      maskChar: "[REDACTED]",
      detectEmails: true,
      detectPhones: true,
      detectSSN: true,
      detectCreditCards: true,
    },
    null,
    2
  ),
  content_filter: JSON.stringify(
    {
      filterHarmful: true,
      filterHateSpeech: true,
      filterProfanity: true,
    },
    null,
    2
  ),
  output_validation: JSON.stringify(
    {
      maxLength: 10000,
      checkCodeInjection: true,
      checkJSONValidity: true,
    },
    null,
    2
  ),
  custom: JSON.stringify({}, null, 2),
};

const DEMO_TEXT = `My email is john.doe@company.com and my phone is (555) 123-4567.
My SSN is 123-45-6789 and my credit card is 4111111111111111.
Please help me write a professional email to my team.`;

// ── Empty state ──────────────────────────────────────────────────

function EmptyState({
  icon: Icon,
  title,
  description,
}: {
  icon: React.ElementType;
  title: string;
  description: string;
}) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="h-12 w-12 rounded-xl bg-muted/50 flex items-center justify-center mb-4">
        <Icon className="h-6 w-6 text-muted-foreground" />
      </div>
      <h3 className="text-sm font-medium text-muted-foreground mb-1">
        {title}
      </h3>
      <p className="text-xs text-muted-foreground/70 max-w-sm">{description}</p>
    </div>
  );
}

// ── Policy Form Dialog ───────────────────────────────────────────

interface PolicyFormData {
  name: string;
  description: string;
  type: string;
  scope: string;
  severity: string;
  action: string;
  enabled: boolean;
  config: string;
}

const emptyForm: PolicyFormData = {
  name: "",
  description: "",
  type: "pii_detection",
  scope: "all",
  severity: "medium",
  action: "flag",
  enabled: true,
  config: defaultConfigs.pii_detection,
};

function PolicyDialog({
  open,
  onOpenChange,
  policy,
  onSave,
  saving,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  policy: GuardrailPolicy | null;
  onSave: (data: PolicyFormData) => void;
  saving: boolean;
}) {
  const isEditing = !!policy;
  const getInitialForm = useCallback((): PolicyFormData => {
    if (policy) {
      return {
        name: policy.name,
        description: policy.description ?? "",
        type: policy.type,
        scope: policy.scope,
        severity: policy.severity,
        action: policy.action,
        enabled: policy.enabled,
        config: policy.config,
      };
    }
    return { ...emptyForm };
  }, [policy]);
  const [form, setForm] = useState<PolicyFormData>(getInitialForm);

  const updateField = <K extends keyof PolicyFormData>(
    key: K,
    value: PolicyFormData[K]
  ) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const handleTypeChange = (type: string) => {
    setForm((prev) => ({
      ...prev,
      type,
      config: defaultConfigs[type] ?? defaultConfigs.custom,
    }));
  };

  const isValid =
    form.name.trim().length > 0 &&
    (() => {
      try {
        JSON.parse(form.config);
        return true;
      } catch {
        return false;
      }
    })();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[560px] max-h-[90vh]">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? "Edit Policy" : "Create Policy"}
          </DialogTitle>
          <DialogDescription>
            {isEditing
              ? "Update the guardrail policy configuration."
              : "Define a new guardrail policy for AI content safety."}
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="max-h-[60vh] pr-3">
          <div className="space-y-4 py-2">
            {/* Name */}
            <div className="space-y-2">
              <Label htmlFor="policy-name">
                Name <span className="text-red-400">*</span>
              </Label>
              <Input
                id="policy-name"
                placeholder="e.g., PII Detection Policy"
                value={form.name}
                onChange={(e) => updateField("name", e.target.value)}
              />
            </div>

            {/* Description */}
            <div className="space-y-2">
              <Label htmlFor="policy-desc">Description</Label>
              <Textarea
                id="policy-desc"
                placeholder="Describe what this policy does..."
                value={form.description}
                onChange={(e) => updateField("description", e.target.value)}
                rows={2}
              />
            </div>

            {/* Type + Scope row */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Type</Label>
                <Select
                  value={form.type}
                  onValueChange={handleTypeChange}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pii_detection">PII Detection</SelectItem>
                    <SelectItem value="content_filter">Content Filter</SelectItem>
                    <SelectItem value="output_validation">
                      Output Validator
                    </SelectItem>
                    <SelectItem value="custom">Custom</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Scope</Label>
                <Select
                  value={form.scope}
                  onValueChange={(v) => updateField("scope", v)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Scopes</SelectItem>
                    <SelectItem value="chat">Chat</SelectItem>
                    <SelectItem value="agent">Agent</SelectItem>
                    <SelectItem value="workflow">Workflow</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Severity + Action row */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Severity</Label>
                <Select
                  value={form.severity}
                  onValueChange={(v) => updateField("severity", v)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Low</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                    <SelectItem value="critical">Critical</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Action</Label>
                <Select
                  value={form.action}
                  onValueChange={(v) => updateField("action", v)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="flag">Flag Only</SelectItem>
                    <SelectItem value="block">Block</SelectItem>
                    <SelectItem value="mask">Auto-Mask</SelectItem>
                    <SelectItem value="log">Log Only</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Enabled */}
            <div className="flex items-center justify-between">
              <Label htmlFor="policy-enabled">Enabled</Label>
              <Switch
                id="policy-enabled"
                checked={form.enabled}
                onCheckedChange={(v) => updateField("enabled", v)}
              />
            </div>

            <Separator />

            {/* Config JSON */}
            <div className="space-y-2">
              <Label htmlFor="policy-config">Configuration (JSON)</Label>
              <Textarea
                id="policy-config"
                value={form.config}
                onChange={(e) => updateField("config", e.target.value)}
                rows={6}
                className="font-mono text-xs"
              />
              {form.config && (() => {
                try {
                  JSON.parse(form.config);
                  return null;
                } catch {
                  return (
                    <p className="text-xs text-red-400">
                      Invalid JSON format
                    </p>
                  );
                }
              })()}
            </div>
          </div>
        </ScrollArea>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={saving}
          >
            Cancel
          </Button>
          <Button
            onClick={() => onSave(form)}
            disabled={!isValid || saving}
          >
            {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            {isEditing ? "Update Policy" : "Create Policy"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ── Main Component ───────────────────────────────────────────────

export default function GuardrailsPage() {
  const [policies, setPolicies] = useState<GuardrailPolicy[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Policy dialog
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingPolicy, setEditingPolicy] = useState<GuardrailPolicy | null>(null);
  const [saving, setSaving] = useState(false);

  // Test tab
  const [testInput, setTestInput] = useState(DEMO_TEXT);
  const [testScope, setTestScope] = useState("all");
  const [evaluating, setEvaluating] = useState(false);
  const [evalResults, setEvalResults] = useState<EvalResult[] | null>(null);
  const [evalPassed, setEvalPassed] = useState<boolean | null>(null);

  // Fetch policies
  const fetchPolicies = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/guardrails/policies");
      if (!res.ok) throw new Error(`Failed to fetch policies: ${res.status}`);
      const data = await res.json();
      setPolicies(Array.isArray(data) ? data : data.policies ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load policies");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPolicies();
  }, [fetchPolicies]);

  // Toggle policy enabled
  const handleToggle = async (policy: GuardrailPolicy) => {
    try {
      const res = await fetch(`/api/guardrails/policies/${policy.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ enabled: !policy.enabled }),
      });
      if (!res.ok) throw new Error("Failed to update policy");
      toast.success(
        `Policy "${policy.name}" ${!policy.enabled ? "enabled" : "disabled"}`
      );
      fetchPolicies();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Update failed");
    }
  };

  // Delete policy
  const handleDelete = async (policy: GuardrailPolicy) => {
    try {
      const res = await fetch(`/api/guardrails/policies/${policy.id}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Failed to delete policy");
      toast.success(`Policy "${policy.name}" deleted`);
      fetchPolicies();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Delete failed");
    }
  };

  // Save (create or update)
  const handleSave = async (data: PolicyFormData) => {
    setSaving(true);
    try {
      const body = {
        ...data,
        description: data.description || undefined,
      };
      if (editingPolicy) {
        const res = await fetch(`/api/guardrails/policies/${editingPolicy.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
        if (!res.ok) throw new Error("Failed to update policy");
        toast.success(`Policy "${data.name}" updated`);
      } else {
        const res = await fetch("/api/guardrails/policies", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
        if (!res.ok) throw new Error("Failed to create policy");
        toast.success(`Policy "${data.name}" created`);
      }
      setDialogOpen(false);
      setEditingPolicy(null);
      fetchPolicies();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Save failed");
    } finally {
      setSaving(false);
    }
  };

  // Evaluate guardrails
  const handleEvaluate = async () => {
    if (!testInput.trim()) return;
    setEvaluating(true);
    setEvalResults(null);
    setEvalPassed(null);
    try {
      const res = await fetch("/api/guardrails/evaluate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: testInput, scope: testScope }),
      });
      if (!res.ok) throw new Error("Evaluation failed");
      const data = await res.json();
      setEvalResults(data.results ?? []);
      setEvalPassed(data.passed ?? true);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Evaluation failed");
    } finally {
      setEvaluating(false);
    }
  };

  // Loading skeleton
  if (loading) {
    return (
      <div className="p-4 md:p-6 space-y-6">
        <div className="flex items-center gap-3">
          <Skeleton className="h-10 w-10 rounded-xl" />
          <div className="space-y-1.5">
            <Skeleton className="h-6 w-36" />
            <Skeleton className="h-4 w-72" />
          </div>
        </div>
        <Skeleton className="h-10 w-full max-w-md" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-44 rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-emerald-500/15 flex items-center justify-center">
            <Shield className="h-5 w-5 text-emerald-400" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">AI Guardrails</h1>
            <p className="text-sm text-muted-foreground">
              Content safety, PII detection &amp; output validation policies
            </p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="policies" className="space-y-6">
        <TabsList>
          <TabsTrigger value="policies" className="gap-2">
            <ShieldCheck className="h-4 w-4" />
            Policies
          </TabsTrigger>
          <TabsTrigger value="test" className="gap-2">
            <Activity className="h-4 w-4" />
            Test
          </TabsTrigger>
          <TabsTrigger value="log" className="gap-2">
            <FileText className="h-4 w-4" />
            Evaluation Log
          </TabsTrigger>
        </TabsList>

        {/* ═══════════════════════ Tab 1: Policies ═══════════════════════ */}
        <TabsContent value="policies" className="space-y-4">
          {/* Tab header with create button */}
          <div className="flex items-center justify-between">
            <div className="text-sm text-muted-foreground">
              {policies.length} policy{policies.length !== 1 ? "ies" : "y"}{" "}
              configured
            </div>
            <Button
              size="sm"
              className="gap-2"
              onClick={() => {
                setEditingPolicy(null);
                setDialogOpen(true);
              }}
            >
              <Plus className="h-4 w-4" />
              Create Policy
            </Button>
          </div>

          {/* Error state */}
          {error && (
            <Card className="border-red-500/30 bg-red-500/5">
              <CardContent className="p-4 flex items-center gap-3">
                <AlertTriangle className="h-5 w-5 text-red-400 shrink-0" />
                <div>
                  <p className="text-sm font-medium text-red-400">
                    Failed to load policies
                  </p>
                  <p className="text-xs text-red-400/70">{error}</p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  className="ml-auto"
                  onClick={fetchPolicies}
                >
                  Retry
                </Button>
              </CardContent>
            </Card>
          )}

          {/* Empty state */}
          {!error && policies.length === 0 && (
            <Card className="border-border/50 bg-card/50">
              <CardContent className="p-0">
                <EmptyState
                  icon={Shield}
                  title="No guardrail policies yet"
                  description="Create your first policy to start protecting AI interactions from harmful content, PII leaks, and output issues."
                />
              </CardContent>
            </Card>
          )}

          {/* Policy cards grid */}
          {!error && policies.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {policies.map((policy) => (
                <Card
                  key={policy.id}
                  className="border-border/50 bg-card/50 backdrop-blur-sm"
                >
                  <CardContent className="p-4 space-y-3">
                    {/* Top row: name + switch */}
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <h3 className="text-sm font-semibold truncate">
                          {policy.name}
                        </h3>
                        {policy.description && (
                          <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
                            {policy.description}
                          </p>
                        )}
                      </div>
                      <Switch
                        checked={policy.enabled}
                        onCheckedChange={() => handleToggle(policy)}
                      />
                    </div>

                    {/* Badges */}
                    <div className="flex flex-wrap gap-1.5">
                      <Badge
                        variant="outline"
                        className={`text-[10px] px-1.5 py-0 ${typeColors[policy.type] ?? ""}`}
                      >
                        {typeLabels[policy.type] ?? policy.type}
                      </Badge>
                      <Badge
                        variant="outline"
                        className="text-[10px] px-1.5 py-0"
                      >
                        {scopeLabels[policy.scope] ?? policy.scope}
                      </Badge>
                      <Badge
                        variant="outline"
                        className={`text-[10px] px-1.5 py-0 ${severityColors[policy.severity] ?? ""}`}
                      >
                        {policy.severity}
                      </Badge>
                      <Badge
                        variant="outline"
                        className={`text-[10px] px-1.5 py-0 ${actionColors[policy.action] ?? ""}`}
                      >
                        {actionLabels[policy.action] ?? policy.action}
                      </Badge>
                    </div>

                    <Separator />

                    {/* Actions */}
                    <div className="flex items-center gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 gap-1.5 text-xs"
                        onClick={() => {
                          setEditingPolicy(policy);
                          setDialogOpen(true);
                        }}
                      >
                        <Pencil className="h-3.5 w-3.5" />
                        Edit
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 gap-1.5 text-xs text-red-400 hover:text-red-300 hover:bg-red-500/10"
                        onClick={() => handleDelete(policy)}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                        Delete
                      </Button>
                      {policy._count && (
                        <span className="ml-auto text-[10px] text-muted-foreground">
                          {policy._count.evals} evals
                        </span>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* ═══════════════════════ Tab 2: Test ═══════════════════════ */}
        <TabsContent value="test" className="space-y-4">
          <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Live Guardrail Testing</CardTitle>
              <CardDescription className="text-xs">
                Test your text against all enabled guardrail policies to see
                what gets detected, flagged, or masked.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Test input */}
              <div className="space-y-2">
                <Label htmlFor="test-input">Test Input Text</Label>
                <Textarea
                  id="test-input"
                  placeholder="Enter text to evaluate against guardrail policies..."
                  value={testInput}
                  onChange={(e) => setTestInput(e.target.value)}
                  rows={5}
                  className="font-mono text-sm"
                />
              </div>

              {/* Scope + Evaluate */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-end gap-3">
                <div className="space-y-2 flex-1">
                  <Label>Scope</Label>
                  <Select value={testScope} onValueChange={setTestScope}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Scopes</SelectItem>
                      <SelectItem value="chat">Chat</SelectItem>
                      <SelectItem value="agent">Agent</SelectItem>
                      <SelectItem value="workflow">Workflow</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <Button
                  onClick={handleEvaluate}
                  disabled={evaluating || !testInput.trim()}
                  className="gap-2"
                >
                  {evaluating ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Shield className="h-4 w-4" />
                  )}
                  Evaluate
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Results */}
          {evalResults !== null && (
            <div className="space-y-4">
              {/* Overall pass/fail banner */}
              <div
                className={`rounded-xl p-4 flex items-center gap-3 ${
                  evalPassed
                    ? "bg-emerald-500/10 border border-emerald-500/30"
                    : "bg-red-500/10 border border-red-500/30"
                }`}
              >
                {evalPassed ? (
                  <>
                    <CheckCircle2 className="h-5 w-5 text-emerald-400 shrink-0" />
                    <div>
                      <p className="text-sm font-medium text-emerald-400">
                        All checks passed
                      </p>
                      <p className="text-xs text-emerald-400/70">
                        No guardrail violations detected in the input text.
                      </p>
                    </div>
                  </>
                ) : (
                  <>
                    <XCircle className="h-5 w-5 text-red-400 shrink-0" />
                    <div>
                      <p className="text-sm font-medium text-red-400">
                        Violations detected
                      </p>
                      <p className="text-xs text-red-400/70">
                        {evalResults.filter((r) => !r.passed).length} of{" "}
                        {evalResults.length} policies detected issues in the
                        input text.
                      </p>
                    </div>
                  </>
                )}
              </div>

              {/* Per-policy results */}
              {evalResults.map((result) => (
                <Card
                  key={result.policyId}
                  className="border-border/50 bg-card/50 backdrop-blur-sm"
                >
                  <CardContent className="p-4 space-y-3">
                    {/* Policy header */}
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2 min-w-0">
                        <h4 className="text-sm font-medium truncate">
                          {result.policyName}
                        </h4>
                        <Badge
                          variant="outline"
                          className={`text-[10px] px-1.5 py-0 shrink-0 ${typeColors[result.policyType] ?? ""}`}
                        >
                          {typeLabels[result.policyType] ?? result.policyType}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <span className="text-[10px] text-muted-foreground">
                          {result.latencyMs}ms
                        </span>
                        <Badge
                          variant="outline"
                          className={`text-[10px] px-1.5 py-0 ${
                            result.passed
                              ? "bg-emerald-500/15 text-emerald-400 border-emerald-500/30"
                              : "bg-red-500/15 text-red-400 border-red-500/30"
                          }`}
                        >
                          {result.passed ? "Passed" : "Failed"}
                        </Badge>
                      </div>
                    </div>

                    {/* Violations */}
                    {!result.passed && result.violations.length > 0 && (
                      <div className="space-y-2">
                        <p className="text-xs font-medium text-muted-foreground">
                          Violations ({result.violations.length})
                        </p>
                        <ScrollArea className="max-h-48">
                          <div className="space-y-1.5">
                            {result.violations.map((v, i) => (
                              <div
                                key={i}
                                className="flex items-center gap-2 rounded-lg bg-muted/30 p-2"
                              >
                                <Badge
                                  variant="outline"
                                  className={`text-[10px] px-1.5 py-0 shrink-0 ${severityColors[v.severity] ?? ""}`}
                                >
                                  {v.severity}
                                </Badge>
                                <span className="text-[10px] text-muted-foreground shrink-0">
                                  {v.type}
                                </span>
                                <code className="text-[10px] font-mono text-amber-400 truncate">
                                  {v.matched}
                                </code>
                              </div>
                            ))}
                          </div>
                        </ScrollArea>
                      </div>
                    )}

                    {/* Masked output */}
                    {result.maskedText && (
                      <div className="space-y-1.5">
                        <p className="text-xs font-medium text-muted-foreground">
                          Masked Output
                        </p>
                        <pre className="rounded-lg bg-muted/50 p-3 text-xs font-mono text-foreground/90 overflow-x-auto whitespace-pre-wrap break-words max-h-32 overflow-y-auto">
                          {result.maskedText}
                        </pre>
                      </div>
                    )}

                    {/* No violations note for passed */}
                    {result.passed && (
                      <p className="text-xs text-muted-foreground/70">
                        No violations found for this policy.
                      </p>
                    )}
                  </CardContent>
                </Card>
              ))}

              {/* No results */}
              {evalResults.length === 0 && (
                <Card className="border-border/50 bg-card/50">
                  <CardContent className="p-0">
                    <EmptyState
                      icon={ShieldCheck}
                      title="No policies evaluated"
                      description="No enabled policies matched the selected scope. Create or enable policies to see evaluation results."
                    />
                  </CardContent>
                </Card>
              )}
            </div>
          )}
        </TabsContent>

        {/* ═══════════════════════ Tab 3: Evaluation Log ═══════════════════════ */}
        <TabsContent value="log" className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              Evaluation history and pass-rate statistics per policy
            </p>
          </div>

          {policies.length === 0 ? (
            <Card className="border-border/50 bg-card/50">
              <CardContent className="p-0">
                <EmptyState
                  icon={FileText}
                  title="No evaluation data yet"
                  description="Evaluation logs will appear here once guardrail policies are created and used."
                />
              </CardContent>
            </Card>
          ) : (
            <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
              <CardContent className="p-0">
                <div className="max-h-96 overflow-y-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-border/50">
                        <th className="text-xs font-medium text-muted-foreground text-left p-4">
                          Policy
                        </th>
                        <th className="text-xs font-medium text-muted-foreground text-left p-4">
                          Type
                        </th>
                        <th className="text-xs font-medium text-muted-foreground text-left p-4">
                          Scope
                        </th>
                        <th className="text-xs font-medium text-muted-foreground text-center p-4">
                          Evaluations
                        </th>
                        <th className="text-xs font-medium text-muted-foreground text-center p-4">
                          Status
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {policies.map((policy) => (
                        <tr
                          key={policy.id}
                          className="border-b border-border/30 last:border-0 hover:bg-muted/20 transition-colors"
                        >
                          <td className="p-4">
                            <div className="flex items-center gap-2">
                              <div
                                className={`h-2 w-2 rounded-full shrink-0 ${
                                  policy.enabled
                                    ? "bg-emerald-400"
                                    : "bg-muted-foreground/30"
                                }`}
                              />
                              <span className="text-sm font-medium">
                                {policy.name}
                              </span>
                            </div>
                          </td>
                          <td className="p-4">
                            <Badge
                              variant="outline"
                              className={`text-[10px] px-1.5 py-0 ${typeColors[policy.type] ?? ""}`}
                            >
                              {typeLabels[policy.type] ?? policy.type}
                            </Badge>
                          </td>
                          <td className="p-4">
                            <span className="text-xs text-muted-foreground">
                              {scopeLabels[policy.scope] ?? policy.scope}
                            </span>
                          </td>
                          <td className="p-4 text-center">
                            <span className="text-sm font-mono">
                              {policy._count?.evals ?? 0}
                            </span>
                          </td>
                          <td className="p-4 text-center">
                            <Badge
                              variant="outline"
                              className={`text-[10px] px-1.5 py-0 ${
                                policy.enabled
                                  ? "bg-emerald-500/15 text-emerald-400 border-emerald-500/30"
                                  : "bg-gray-500/15 text-gray-400 border-gray-500/30"
                              }`}
                            >
                              {policy.enabled ? "Active" : "Disabled"}
                            </Badge>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Summary stats */}
          {policies.length > 0 && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                {
                  label: "Total Policies",
                  value: policies.length,
                  icon: Shield,
                  color: "text-emerald-400",
                  bg: "bg-emerald-500/15",
                },
                {
                  label: "Active Policies",
                  value: policies.filter((p) => p.enabled).length,
                  icon: ShieldCheck,
                  color: "text-cyan-400",
                  bg: "bg-cyan-500/15",
                },
                {
                  label: "PII Detection",
                  value: policies.filter((p) => p.type === "pii_detection").length,
                  icon: AlertTriangle,
                  color: "text-amber-400",
                  bg: "bg-amber-500/15",
                },
                {
                  label: "Total Evaluations",
                  value: policies.reduce(
                    (sum, p) => sum + (p._count?.evals ?? 0),
                    0
                  ),
                  icon: Clock,
                  color: "text-violet-400",
                  bg: "bg-violet-500/15",
                },
              ].map((stat) => {
                const Icon = stat.icon;
                return (
                  <Card
                    key={stat.label}
                    className="border-border/50 bg-card/50"
                  >
                    <CardContent className="p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <div
                          className={`h-8 w-8 rounded-lg ${stat.bg} flex items-center justify-center`}
                        >
                          <Icon className={`h-4 w-4 ${stat.color}`} />
                        </div>
                        <span className="text-xs text-muted-foreground">
                          {stat.label}
                        </span>
                      </div>
                      <p className="text-2xl font-bold">{stat.value}</p>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Policy Dialog */}
      <PolicyDialog
        key={editingPolicy?.id ?? "new"}
        open={dialogOpen}
        onOpenChange={(open) => {
          setDialogOpen(open);
          if (!open) setEditingPolicy(null);
        }}
        policy={editingPolicy}
        onSave={handleSave}
        saving={saving}
      />
    </div>
  );
}