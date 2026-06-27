"use client";

import React, { useState, useRef, useEffect, useMemo, useCallback } from "react";

import { api } from "@/lib/api";
import ReactMarkdown from "react-markdown";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Slider } from "@/components/ui/slider";
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
  Bot,
  Plus,
  Search,
  Play,
  Save,
  Activity,
  Zap,
  Clock,
  AlertTriangle,
  Send,
  Wrench,
  Loader2,
  CheckCircle,
} from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

const modelOptions = [
  "gpt-4o",
  "claude-sonnet-4-20250514",
  "deepseek-chat",
  "gemini-2.0-flash",
];

const weeklyData = [
  { day: "Mon", count: 45 },
  { day: "Tue", count: 62 },
  { day: "Wed", count: 38 },
  { day: "Thu", count: 71 },
  { day: "Fri", count: 56 },
  { day: "Sat", count: 29 },
  { day: "Sun", count: 18 },
];

interface AgentCount {
  executions?: number;
  [key: string]: unknown;
}

interface Agent {
  id: string;
  name: string;
  description: string;
  model: string;
  systemPrompt: string;
  tools: string[] | string;
  temperature: number;
  maxTokens: number;
  status: "active" | "draft" | "archived";
  createdAt: string;
  executions?: number;
  avgLatency?: number;
  _count?: AgentCount;
}

interface Tool {
  id: string;
  name: string;
  description: string;
  category: string;
}

interface ReasoningStep {
  step: number;
  type: "thinking" | "tool_call" | "tool_result" | "responding" | "error";
  content: string;
  toolId?: string;
  toolName?: string;
  toolOutput?: string;
  durationMs?: number;
}

interface TestMessage {
  role: "user" | "assistant" | "tool_call" | "tool_result" | "thinking" | "error";
  content: string;
  toolsUsed?: string[];
  steps?: ReasoningStep[];
  toolName?: string;
  durationMs?: number;
}

export default function AgentStudioPage() {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [tools, setTools] = useState<Tool[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedAgentId, setSelectedAgentId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [createName, setCreateName] = useState("");
  const [createDesc, setCreateDesc] = useState("");
  const [createModel, setCreateModel] = useState("gpt-4o");
  const [creating, setCreating] = useState(false);

  // Config state
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [model, setModel] = useState("");
  const [temperature, setTemperature] = useState([0.7]);
  const [maxTokens, setMaxTokens] = useState(4096);
  const [systemPrompt, setSystemPrompt] = useState("");
  const [selectedTools, setSelectedTools] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);

  // Testing state
  const [testMessages, setTestMessages] = useState<TestMessage[]>([]);
  const [testInput, setTestInput] = useState("");
  const [isTestRunning, setIsTestRunning] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const fetchAgents = useCallback(() => {
    api.getAgents()
      .then((data) => setAgents((data as Agent[]) ?? []))
      .catch((err) => console.error("Failed to fetch agents:", err));
  }, []);

  const fetchTools = useCallback(() => {
    api.getTools()
      .then((data) => setTools((data as Tool[]) ?? []))
      .catch((err) => console.error("Failed to fetch tools:", err));
  }, []);

  useEffect(() => {
    Promise.all([
      api.getAgents(),
      api.getTools(),
    ])
      .then(([agentsData, toolsData]) => {
        setAgents((agentsData as Agent[]) ?? []);
        setTools((toolsData as Tool[]) ?? []);
      })
      .catch((err) => console.error("Failed to fetch data:", err))
      .finally(() => setLoading(false));
  }, []);

  // Helper to get agent tools as array of IDs
  function getAgentToolIds(agent: Agent): string[] {
    if (Array.isArray(agent.tools)) return agent.tools;
    if (typeof agent.tools === "string") {
      try {
        return JSON.parse(agent.tools);
      } catch {
        return [];
      }
    }
    return [];
  }

  // Helper to get agent execution count
  function getAgentExecutions(agent: Agent): number {
    return agent._count?.executions ?? agent.executions ?? 0;
  }

  const selectedAgent = agents.find((a) => a.id === selectedAgentId) ?? null;

  const filteredAgents = useMemo(
    () =>
      agents.filter((a) =>
        a.name.toLowerCase().includes(searchQuery.toLowerCase())
      ),
    [agents, searchQuery]
  );

  const toolsByCategory = useMemo(() => {
    const groups: Record<string, Tool[]> = {};
    for (const tool of tools) {
      if (!groups[tool.category]) groups[tool.category] = [];
      groups[tool.category].push(tool);
    }
    return groups;
  }, [tools]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [testMessages]);

  const handleSelectAgent = (id: string) => {
    const agent = agents.find((a) => a.id === id);
    if (agent) {
      setName(agent.name);
      setDescription(agent.description);
      setModel(agent.model);
      setTemperature([agent.temperature]);
      setMaxTokens(agent.maxTokens);
      setSystemPrompt(agent.systemPrompt);
      setSelectedTools(getAgentToolIds(agent));
    }
    setSelectedAgentId(id);
    setTestMessages([]);
  };

  const handleCreateAgent = () => {
    if (!createName.trim()) return;
    setCreating(true);
    api.createAgent({
      name: createName,
      description: createDesc,
      model: createModel,
    })
      .then(() => {
        setCreateDialogOpen(false);
        setCreateName("");
        setCreateDesc("");
        setCreateModel("gpt-4o");
        fetchAgents();
      })
      .catch((err) => console.error("Failed to create agent:", err))
      .finally(() => setCreating(false));
  };

  const handleSaveConfig = () => {
    if (!selectedAgentId) return;
    setSaving(true);
    api.updateAgent(selectedAgentId, {
      name,
      description,
      model,
      temperature: temperature[0],
      maxTokens,
      systemPrompt,
      tools: selectedTools,
    })
      .then(() => fetchAgents())
      .catch((err) => console.error("Failed to save agent:", err))
      .finally(() => setSaving(false));
  };

  const handleToggleTool = (toolId: string) => {
    setSelectedTools((prev) =>
      prev.includes(toolId)
        ? prev.filter((t) => t !== toolId)
        : [...prev, toolId]
    );
  };

  const handleRunTest = async () => {
    if (!testInput.trim() || isTestRunning || !selectedAgentId) return;
    const userMsg: TestMessage = { role: "user", content: testInput };
    setTestMessages((prev) => [...prev, userMsg]);
    setTestInput("");
    setIsTestRunning(true);

    try {
      const data = (await api.executeAgent(selectedAgentId, testInput)) as {
        response?: string;
        toolsUsed?: Array<{ toolId: string; toolName: string; status: string }>;
        steps?: ReasoningStep[];
        tokens?: number;
        latencyMs?: number;
      };

      // If we have steps, show them individually for the reasoning trace
      if (data.steps && data.steps.length > 0) {
        for (const step of data.steps) {
          const stepMsg: TestMessage = {
            role: step.type as TestMessage["role"],
            content: step.content,
            toolName: step.toolName,
            durationMs: step.durationMs,
          };
          setTestMessages((prev) => [...prev, stepMsg]);
          // Small delay between steps for visual effect
          await new Promise((r) => setTimeout(r, 100));
        }
      }

      // Add final response
      const response: TestMessage = {
        role: "assistant",
        content: data.response ?? "Agent processed your request successfully.",
        toolsUsed: data.toolsUsed?.map((t) => t.toolId) ?? [],
      };
      setTestMessages((prev) => [...prev, response]);
    } catch (err) {
      console.error("Agent execution failed:", err);
      const errorMsg: TestMessage = {
        role: "error",
        content: `Execution failed: ${err instanceof Error ? err.message : "Unknown error"}`,
      };
      setTestMessages((prev) => [...prev, errorMsg]);
    } finally {
      setIsTestRunning(false);
    }
  };

  return (
    <div className="p-4 md:p-6 space-y-6">
      <div className="flex gap-6 h-[calc(100vh-8rem)]">
        {/* Left Panel — Agent List */}
        <div className="w-72 flex-shrink-0 border rounded-lg bg-card flex flex-col">
          <div className="p-4 border-b space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold">Agents</h2>
              <Button
                size="sm"
                onClick={() => setCreateDialogOpen(true)}
              >
                <Plus className="size-4 mr-1" />
                Create Agent
              </Button>
            </div>
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
              <Input
                placeholder="Search agents..."
                className="pl-8 h-8"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>
          <ScrollArea className="flex-1">
            {loading ? (
              <div className="p-2 space-y-2">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="p-3 space-y-2">
                    <div className="flex items-center gap-2">
                      <Skeleton className="size-2 rounded-full" />
                      <Skeleton className="h-4 w-24" />
                    </div>
                    <div className="flex items-center gap-2 ml-4">
                      <Skeleton className="h-4 w-16" />
                      <Skeleton className="h-3 w-12" />
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-2 space-y-1">
                {filteredAgents.map((agent) => (
                  <button
                    key={agent.id}
                    onClick={() => handleSelectAgent(agent.id)}
                    className={cn(
                      "w-full text-left rounded-md p-3 transition-colors",
                      selectedAgentId === agent.id
                        ? "bg-accent text-accent-foreground"
                        : "hover:bg-muted/50"
                    )}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <span
                        className={cn(
                          "size-2 rounded-full",
                          agent.status === "active"
                            ? "bg-emerald-500"
                            : "bg-gray-400"
                        )}
                      />
                      <span className="text-sm font-medium truncate">
                        {agent.name}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 ml-4">
                      <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                        {agent.model}
                      </Badge>
                      <span className="text-xs text-muted-foreground">
                        {getAgentExecutions(agent).toLocaleString()} runs
                      </span>
                    </div>
                  </button>
                ))}
                {filteredAgents.length === 0 && (
                  <div className="text-center py-8 text-sm text-muted-foreground">
                    No agents found
                  </div>
                )}
              </div>
            )}
          </ScrollArea>
        </div>

        {/* Right Panel — Agent Detail / Editor */}
        <div className="flex-1 min-w-0">
          {!selectedAgent ? (
            <div className="h-full flex flex-col items-center justify-center text-muted-foreground">
              <Bot className="size-16 mb-4 opacity-30" />
              <h3 className="text-lg font-medium mb-1">Select an Agent</h3>
              <p className="text-sm">
                Choose from the list or create a new agent to get started
              </p>
            </div>
          ) : (
            <Tabs defaultValue="configuration" className="h-full flex flex-col">
              <TabsList>
                <TabsTrigger value="configuration">Configuration</TabsTrigger>
                <TabsTrigger value="testing">Testing</TabsTrigger>
                <TabsTrigger value="analytics">Analytics</TabsTrigger>
              </TabsList>

              {/* Tab 1: Configuration */}
              <TabsContent value="configuration" className="flex-1 overflow-y-auto">
                <div className="space-y-6">
                  {/* Agent Settings Card */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base">Agent Settings</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="agent-name">Name</Label>
                          <Input
                            id="agent-name"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="agent-model">Model</Label>
                          <Select value={model} onValueChange={setModel}>
                            <SelectTrigger className="w-full">
                              <SelectValue placeholder="Select model" />
                            </SelectTrigger>
                            <SelectContent>
                              {modelOptions.map((m) => (
                                <SelectItem key={m} value={m}>
                                  {m}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="agent-desc">Description</Label>
                        <Textarea
                          id="agent-desc"
                          value={description}
                          onChange={(e) => setDescription(e.target.value)}
                          rows={2}
                        />
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label>
                            Temperature: {temperature[0].toFixed(1)}
                          </Label>
                          <Slider
                            min={0}
                            max={2}
                            step={0.1}
                            value={temperature}
                            onValueChange={setTemperature}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="agent-max-tokens">Max Tokens</Label>
                          <Input
                            id="agent-max-tokens"
                            type="number"
                            value={maxTokens}
                            onChange={(e) =>
                              setMaxTokens(Number(e.target.value))
                            }
                          />
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="agent-system-prompt">System Prompt</Label>
                        <Textarea
                          id="agent-system-prompt"
                          className="min-h-40"
                          value={systemPrompt}
                          onChange={(e) => setSystemPrompt(e.target.value)}
                        />
                      </div>

                      <Button className="w-fit" onClick={handleSaveConfig} disabled={saving}>
                        {saving ? (
                          <Loader2 className="size-4 mr-2 animate-spin" />
                        ) : (
                          <Save className="size-4 mr-2" />
                        )}
                        Save Configuration
                      </Button>
                    </CardContent>
                  </Card>

                  {/* Tools Card */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base">Tools</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-6">
                      {Object.entries(toolsByCategory).map(
                        ([category, categoryTools]) => (
                          <div key={category}>
                            <h4 className="text-sm font-medium text-muted-foreground mb-3">
                              {category}
                            </h4>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                              {categoryTools.map((tool) => (
                                <Card
                                  key={tool.id}
                                  className={cn(
                                    "p-3 cursor-pointer transition-colors hover:bg-muted/50",
                                    selectedTools.includes(tool.id) &&
                                      "ring-1 ring-primary/50 bg-primary/5"
                                  )}
                                  onClick={() => handleToggleTool(tool.id)}
                                >
                                  <div className="flex items-start gap-3">
                                    <Checkbox
                                      checked={selectedTools.includes(
                                        tool.id
                                      )}
                                      onCheckedChange={() =>
                                        handleToggleTool(tool.id)
                                      }
                                    />
                                    <div className="flex-1 min-w-0">
                                      <div className="flex items-center gap-2 mb-1">
                                        <span className="text-sm font-medium truncate">
                                          {tool.name}
                                        </span>
                                      </div>
                                      <p className="text-xs text-muted-foreground line-clamp-2">
                                        {tool.description}
                                      </p>
                                      <Badge
                                        variant="outline"
                                        className="mt-2 text-[10px] px-1.5 py-0"
                                      >
                                        {tool.category}
                                      </Badge>
                                    </div>
                                  </div>
                                </Card>
                              ))}
                            </div>
                          </div>
                        )
                      )}

                      <Button className="w-fit" onClick={handleSaveConfig} disabled={saving}>
                        {saving ? (
                          <Loader2 className="size-4 mr-2 animate-spin" />
                        ) : (
                          <Save className="size-4 mr-2" />
                        )}
                        Save Tools
                      </Button>
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>

              {/* Tab 2: Testing */}
              <TabsContent value="testing" className="flex-1 flex flex-col min-h-0">
                <Card className="flex-1 flex flex-col min-h-0">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base">
                      Test: {selectedAgent.name}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="flex-1 flex flex-col min-h-0">
                    {/* Messages Area */}
                    <div className="flex-1 max-h-96 overflow-y-auto rounded-lg border bg-muted/20 p-4 space-y-4 mb-4">
                      {testMessages.length === 0 && (
                        <div className="flex items-center justify-center h-full text-sm text-muted-foreground">
                          Send a message to test this agent
                        </div>
                      )}
                      {testMessages.map((msg, idx) => {
                        if (msg.role === "user") {
                          return (
                            <div key={idx} className="flex justify-end mb-3">
                              <div className="bg-primary text-primary-foreground rounded-lg px-4 py-2.5 max-w-[80%]">
                                {msg.content}
                              </div>
                            </div>
                          );
                        }

                        if (msg.role === "thinking") {
                          return (
                            <div key={idx} className="flex items-start gap-2 mb-2 px-2 py-1.5 rounded bg-muted/30">
                              <Zap className="size-3.5 text-muted-foreground mt-0.5 shrink-0" />
                              <div className="min-w-0">
                                <span className="text-[10px] text-muted-foreground uppercase tracking-wide font-medium">Thinking</span>
                                <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{msg.content}</p>
                              </div>
                              {msg.durationMs && <span className="text-[10px] text-muted-foreground ml-auto shrink-0">{msg.durationMs}ms</span>}
                            </div>
                          );
                        }

                        if (msg.role === "tool_call") {
                          return (
                            <div key={idx} className="flex items-start gap-2 mb-2 px-2 py-1.5 rounded border border-primary/20 bg-primary/5">
                              <Wrench className="size-3.5 text-primary mt-0.5 shrink-0" />
                              <div className="min-w-0 flex-1">
                                <span className="text-xs font-medium text-primary">{msg.toolName ?? "Tool"}</span>
                                <p className="text-[11px] text-muted-foreground mt-0.5">{msg.content}</p>
                              </div>
                              {msg.durationMs && <span className="text-[10px] text-muted-foreground ml-auto shrink-0">{msg.durationMs}ms</span>}
                            </div>
                          );
                        }

                        if (msg.role === "tool_result") {
                          return (
                            <div key={idx} className="flex items-start gap-2 mb-2 px-2 py-1.5 rounded bg-muted/30">
                              <CheckCircle className="size-3.5 text-emerald-500 mt-0.5 shrink-0" />
                              <div className="min-w-0 flex-1">
                                <span className="text-[10px] text-emerald-600 font-medium uppercase tracking-wide">Result</span>
                                <p className="text-[11px] text-muted-foreground mt-0.5 whitespace-pre-wrap max-h-24 overflow-y-auto">{msg.content}</p>
                              </div>
                              {msg.durationMs && <span className="text-[10px] text-muted-foreground ml-auto shrink-0">{msg.durationMs}ms</span>}
                            </div>
                          );
                        }

                        if (msg.role === "error") {
                          return (
                            <div key={idx} className="flex items-start gap-2 mb-2 px-3 py-2 rounded bg-destructive/10 border border-destructive/20">
                              <AlertTriangle className="size-3.5 text-destructive mt-0.5 shrink-0" />
                              <p className="text-xs text-destructive">{msg.content}</p>
                            </div>
                          );
                        }

                        // assistant response
                        return (
                          <div key={idx} className="flex items-start gap-3 mb-3">
                            <Avatar className="size-7 shrink-0 mt-0.5">
                              <AvatarFallback className="bg-primary/10 text-primary text-xs"><Bot className="size-3.5" /></AvatarFallback>
                            </Avatar>
                            <div className="min-w-0 flex-1 rounded-lg bg-muted/30 p-3">
                              <div className="prose prose-sm dark:prose-invert max-w-none text-sm">
                                <ReactMarkdown>{msg.content}</ReactMarkdown>
                              </div>
                              {msg.toolsUsed && msg.toolsUsed.length > 0 && (
                                <div className="flex gap-1 mt-2 flex-wrap">
                                  {msg.toolsUsed.map((t) => (
                                    <Badge key={t} variant="secondary" className="text-[10px] px-1.5 py-0">
                                      <Wrench className="size-2.5 mr-1" />{t}
                                    </Badge>
                                  ))}
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })}
                      {isTestRunning && (
                        <div className="flex justify-start">
                          <div className="bg-muted rounded-lg px-4 py-2.5">
                            <Loader2 className="size-4 animate-spin text-muted-foreground" />
                          </div>
                        </div>
                      )}
                      <div ref={messagesEndRef} />
                    </div>

                    {/* Input */}
                    <div className="flex gap-2">
                      <Input
                        placeholder="Test Message"
                        value={testInput}
                        onChange={(e) => setTestInput(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" && !e.shiftKey) {
                            e.preventDefault();
                            handleRunTest();
                          }
                        }}
                        disabled={isTestRunning}
                      />
                      <Button
                        onClick={handleRunTest}
                        disabled={!testInput.trim() || isTestRunning}
                      >
                        <Play className="size-4 mr-2" />
                        Run
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Tab 3: Analytics */}
              <TabsContent value="analytics" className="flex-1 overflow-y-auto">
                <div className="space-y-6">
                  {/* Stats Cards */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    <Card>
                      <CardContent className="p-4">
                        <div className="flex items-center gap-3">
                          <div className="rounded-md bg-emerald-500/10 p-2">
                            <Activity className="size-5 text-emerald-500" />
                          </div>
                          <div>
                            <p className="text-sm text-muted-foreground">
                              Total Executions
                            </p>
                            <p className="text-2xl font-bold">
                              {getAgentExecutions(selectedAgent).toLocaleString()}
                            </p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardContent className="p-4">
                        <div className="flex items-center gap-3">
                          <div className="rounded-md bg-amber-500/10 p-2">
                            <Clock className="size-5 text-amber-500" />
                          </div>
                          <div>
                            <p className="text-sm text-muted-foreground">
                              Avg Latency
                            </p>
                            <p className="text-2xl font-bold">
                              {selectedAgent.avgLatency ?? 1.2}s
                            </p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardContent className="p-4">
                        <div className="flex items-center gap-3">
                          <div className="rounded-md bg-emerald-500/10 p-2">
                            <Zap className="size-5 text-emerald-500" />
                          </div>
                          <div>
                            <p className="text-sm text-muted-foreground">
                              Success Rate
                            </p>
                            <p className="text-2xl font-bold">98.5%</p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardContent className="p-4">
                        <div className="flex items-center gap-3">
                          <div className="rounded-md bg-rose-500/10 p-2">
                            <AlertTriangle className="size-5 text-rose-500" />
                          </div>
                          <div>
                            <p className="text-sm text-muted-foreground">
                              Error Count
                            </p>
                            <p className="text-2xl font-bold">18</p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </div>

                  {/* Bar Chart */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base">
                        Last 7 Days — Executions
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="h-64">
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={weeklyData}>
                            <CartesianGrid
                              strokeDasharray="3 3"
                              className="stroke-muted"
                            />
                            <XAxis
                              dataKey="day"
                              className="text-xs"
                              tick={{ fill: "var(--muted-foreground)" }}
                            />
                            <YAxis
                              className="text-xs"
                              tick={{ fill: "var(--muted-foreground)" }}
                            />
                            <Tooltip
                              contentStyle={{
                                backgroundColor: "var(--popover)",
                                borderColor: "var(--border)",
                                borderRadius: "8px",
                                color: "var(--popover-foreground)",
                              }}
                            />
                            <Bar
                              dataKey="count"
                              fill="var(--chart-1)"
                              radius={[4, 4, 0, 0]}
                            />
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>
            </Tabs>
          )}
        </div>
      </div>

      {/* Create Agent Dialog */}
      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create Agent</DialogTitle>
            <DialogDescription>
              Configure a new AI agent for your platform
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="create-name">Name</Label>
              <Input
                id="create-name"
                placeholder="Agent name"
                value={createName}
                onChange={(e) => setCreateName(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="create-desc">Description</Label>
              <Textarea
                id="create-desc"
                placeholder="Describe what this agent does"
                rows={3}
                value={createDesc}
                onChange={(e) => setCreateDesc(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Model</Label>
              <Select value={createModel} onValueChange={setCreateModel}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select model" />
                </SelectTrigger>
                <SelectContent>
                  {modelOptions.map((m) => (
                    <SelectItem key={m} value={m}>
                      {m}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setCreateDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button
              onClick={handleCreateAgent}
              disabled={creating || !createName.trim()}
            >
              {creating ? (
                <Loader2 className="size-4 mr-2 animate-spin" />
              ) : null}
              {creating ? "Creating..." : "Create"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
