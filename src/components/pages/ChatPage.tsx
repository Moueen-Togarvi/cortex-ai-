"use client";

import React, {
  useState,
  useEffect,
  useRef,
  useCallback,
  useMemo,
} from "react";
import ReactMarkdown from "react-markdown";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { oneDark } from "react-syntax-highlighter/dist/esm/styles/prism";

import { cn } from "@/lib/utils";
import { api } from "@/lib/api";
import { mockKnowledgeBases } from "@/lib/mock-data";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip";
import {
  ResizablePanelGroup,
  ResizablePanel,
  ResizableHandle,
} from "@/components/ui/resizable";

import {
  Bot,
  Plus,
  Search,
  SendHorizontal,
  Square,
  Paperclip,
  Thermometer,
  MessageSquare,
  BarChart3,
  FileText,
  Workflow,
  ChevronLeft,
  Copy,
  Check,
  Sparkles,
  Trash2,
} from "lucide-react";

// ── Types ────────────────────────────────────────────────────────

interface ConversationSummary {
  id: string;
  title: string;
  model: string;
  knowledgeBaseId?: string | null;
  temperature?: number | null;
  userId?: string;
  createdAt: string;
  updatedAt: string;
  messageCount: number;
  lastMessage: { content: string; createdAt: string } | null;
}

interface ConversationMessage {
  id: string;
  conversationId: string;
  role: string;
  content: string;
  model?: string | null;
  tokens: number;
  createdAt: string;
}

// ── Helpers ──────────────────────────────────────────────────────

function relativeTime(dateStr: string): string {
  const now = new Date();
  const then = new Date(dateStr);
  const diffMs = now.getTime() - then.getTime();
  const diffSec = Math.floor(diffMs / 1000);
  if (diffSec < 60) return "just now";
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin} minute${diffMin !== 1 ? "s" : ""} ago`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr} hour${diffHr !== 1 ? "s" : ""} ago`;
  const diffDay = Math.floor(diffHr / 24);
  if (diffDay < 7) return `${diffDay} day${diffDay !== 1 ? "s" : ""} ago`;
  return then.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function formatTimestamp(dateStr: string): string {
  return new Date(dateStr).toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
  });
}

// ── Typing Indicator ──────────────────────────────────────────────

function TypingIndicator() {
  return (
    <div className="flex items-end gap-3 px-4 py-2">
      <div className="flex size-8 items-center justify-center rounded-full bg-primary/10">
        <Bot className="size-4 text-primary" />
      </div>
      <div className="rounded-2xl rounded-bl-md bg-muted px-4 py-3">
        <div className="flex items-center gap-1">
          <span className="inline-block size-2 animate-bounce rounded-full bg-muted-foreground/60 [animation-delay:0ms]" />
          <span className="inline-block size-2 animate-bounce rounded-full bg-muted-foreground/60 [animation-delay:150ms]" />
          <span className="inline-block size-2 animate-bounce rounded-full bg-muted-foreground/60 [animation-delay:300ms]" />
        </div>
      </div>
    </div>
  );
}

// ── Suggestion Cards ────────────────────────────────────────────

const suggestions = [
  {
    icon: BarChart3,
    title: "Analyze my data",
    description: "Upload a dataset and get AI-powered insights",
  },
  {
    icon: Workflow,
    title: "Help with coding",
    description: "Debug, refactor, or write new code",
  },
  {
    icon: FileText,
    title: "Summarize documents",
    description: "Extract key points from long documents",
  },
  {
    icon: Sparkles,
    title: "Create a workflow",
    description: "Build an automated multi-step workflow",
  },
];

function SuggestionCards({
  onSelect,
}: {
  onSelect: (text: string) => void;
}) {
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4 px-4 max-w-3xl mx-auto">
      {suggestions.map((s) => (
        <button
          key={s.title}
          onClick={() => onSelect(s.title)}
          className="group flex flex-col items-start gap-2 rounded-xl border border-border/50 bg-card p-4 text-left transition-all hover:border-primary/30 hover:bg-accent hover:shadow-md"
        >
          <div className="flex size-10 items-center justify-center rounded-lg bg-primary/10 text-primary transition-colors group-hover:bg-primary/20">
            <s.icon className="size-5" />
          </div>
          <span className="text-sm font-medium">{s.title}</span>
          <span className="text-xs text-muted-foreground line-clamp-2">
            {s.description}
          </span>
        </button>
      ))}
    </div>
  );
}

// ── Code Block Component ──────────────────────────────────────────

function CodeBlock({
  className,
  children,
  ...props
}: React.HTMLAttributes<HTMLElement> & {
  children?: React.ReactNode;
}) {
  const [copied, setCopied] = useState(false);
  const match = /language-(\w+)/.exec(className || "");
  const isInline = !match;

  if (isInline) {
    return (
      <code className="bg-muted px-1.5 py-0.5 rounded text-sm" {...props}>
        {children}
      </code>
    );
  }

  const handleCopy = () => {
    navigator.clipboard.writeText(String(children));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="relative group my-3 rounded-lg overflow-hidden">
      <div className="flex items-center justify-between bg-zinc-800 dark:bg-zinc-900 rounded-t-lg px-4 py-2 text-xs text-zinc-400">
        <span>{match[1]}</span>
        <button
          onClick={handleCopy}
          className="hover:text-white transition-colors flex items-center gap-1"
        >
          {copied ? <Check className="size-3" /> : <Copy className="size-3" />}
          {copied ? "Copied!" : "Copy"}
        </button>
      </div>
      <SyntaxHighlighter
        style={oneDark}
        language={match[1]}
        PreTag="div"
        customStyle={{
          margin: 0,
          borderRadius: "0 0 0.5rem 0.5rem",
          fontSize: "0.8125rem",
        }}
      >
        {String(children).replace(/\n$/, "")}
      </SyntaxHighlighter>
    </div>
  );
}

// ── Message Bubble ───────────────────────────────────────────────

function MessageBubble({ message }: { message: ConversationMessage }) {
  const isUser = message.role === "user";

  return (
    <div
      className={cn(
        "flex gap-3 px-4 py-2",
        isUser ? "flex-row-reverse" : "flex-row"
      )}
    >
      {/* Avatar */}
      {isUser ? (
        <Avatar className="size-8 shrink-0">
          <AvatarFallback className="bg-primary text-primary-foreground text-xs font-semibold">
            AK
          </AvatarFallback>
        </Avatar>
      ) : (
        <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary/10">
          <Bot className="size-4 text-primary" />
        </div>
      )}

      {/* Content */}
      <div
        className={cn(
          "max-w-[75%] space-y-1",
          isUser ? "items-end" : "items-start"
        )}
      >
        <div
          className={cn(
            "rounded-2xl px-4 py-3 text-sm leading-relaxed",
            isUser
              ? "rounded-br-md bg-primary text-primary-foreground"
              : "rounded-bl-md bg-muted"
          )}
        >
          {isUser ? (
            <p className="whitespace-pre-wrap">{message.content}</p>
          ) : (
            <div className="prose prose-sm prose-zinc dark:prose-invert max-w-none [&>pre]:my-0 [&>ul]:my-2 [&>ol]:my-2 [&>p]:my-1.5 [&>h2]:mt-3 [&>h2]:mb-1.5 [&>h3]:mt-2 [&>h3]:mb-1 [&>blockquote]:my-2">
              <ReactMarkdown
                components={{
                  code({ className, children, ...props }) {
                    return (
                      <CodeBlock className={className} {...props}>
                        {children}
                      </CodeBlock>
                    );
                  },
                }}
              >
                {message.content}
              </ReactMarkdown>
            </div>
          )}
        </div>

        {/* Meta row */}
        <div
          className={cn(
            "flex items-center gap-2 px-1",
            isUser ? "justify-end" : "justify-start"
          )}
        >
          <span className="text-[11px] text-muted-foreground">
            {formatTimestamp(message.createdAt)}
          </span>
          {message.tokens > 0 && (
            <Badge variant="secondary" className="h-4 px-1.5 text-[10px]">
              {message.tokens} tokens
            </Badge>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Conversation List Item ────────────────────────────────────────

function ConversationItem({
  conversation,
  isSelected,
  onClick,
}: {
  conversation: ConversationSummary;
  isSelected: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "group w-full flex flex-col gap-1.5 rounded-lg px-3 py-2.5 text-left transition-colors",
        isSelected
          ? "bg-primary/10 text-primary"
          : "hover:bg-accent text-foreground"
      )}
    >
      <div className="flex items-center justify-between gap-2">
        <span
          className={cn(
            "truncate text-sm font-medium",
            isSelected ? "text-primary" : ""
          )}
        >
          {conversation.title}
        </span>
        <Badge
          variant="secondary"
          className="shrink-0 text-[10px] px-1.5 py-0 h-4 font-normal"
        >
          {conversation.model.split("-")[0]}
        </Badge>
      </div>
      <span className="text-[11px] text-muted-foreground">
        {relativeTime(conversation.updatedAt)}
      </span>
    </button>
  );
}

// ── Conversation List Skeleton ────────────────────────────────────

function ConversationListSkeleton() {
  return (
    <div className="flex flex-col gap-1 px-1">
      {Array.from({ length: 6 }, (_, i) => (
        <div
          key={i}
          className="flex flex-col gap-1.5 rounded-lg px-3 py-2.5"
        >
          <div className="flex items-center justify-between gap-2">
            <Skeleton className="h-4 flex-1" />
            <Skeleton className="h-4 w-12" />
          </div>
          <Skeleton className="h-3 w-20" />
        </div>
      ))}
    </div>
  );
}

// ── Empty State ────────────────────────────────────────────────────

function EmptyState({ onSuggestion }: { onSuggestion: (text: string) => void }) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-6 px-4">
      <div className="flex flex-col items-center gap-3">
        <div className="flex size-16 items-center justify-center rounded-2xl bg-primary/10">
          <Bot className="size-8 text-primary" />
        </div>
        <h2 className="text-xl font-semibold">Start a Conversation</h2>
        <p className="text-sm text-muted-foreground text-center max-w-md">
          Ask anything — analyze data, write code, summarize documents, or build
          workflows. Your AI assistant is ready to help.
        </p>
      </div>
      <SuggestionCards onSelect={onSuggestion} />
    </div>
  );
}

// ── Main ChatPage ─────────────────────────────────────────────────

export default function ChatPage() {
  // ── State ───────────────────────────────────────────────────
  const [conversations, setConversations] = useState<ConversationSummary[]>([]);
  const [convLoading, setConvLoading] = useState(true);
  const [selectedConvId, setSelectedConvId] = useState<string | null>(null);
  const [activeTitle, setActiveTitle] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [inputValue, setInputValue] = useState("");
  const [selectedModel, setSelectedModel] = useState("gpt-4o");
  const [selectedKb, setSelectedKb] = useState("none");
  const [temperature, setTemperature] = useState(0.7);
  const [sending, setSending] = useState(false);
  const [messages, setMessages] = useState<ConversationMessage[]>([]);
  const [messagesLoading, setMessagesLoading] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // ── Fetch conversations on mount ────────────────────────────
  useEffect(() => {
    api
      .getConversations()
      .then((data) => {
        const list = data as ConversationSummary[];
        setConversations(list);
        if (list.length > 0 && !selectedConvId) {
          setSelectedConvId(list[0].id);
          setActiveTitle(list[0].title);
        }
      })
      .catch((err) => console.error("Failed to fetch conversations:", err))
      .finally(() => setConvLoading(false));
  }, []);

  // ── Fetch messages when conversation is selected ─────────────
  useEffect(() => {
    if (!selectedConvId) return;
    api
      .getConversation(selectedConvId)
      .then((conv) => {
        const c = conv as { messages?: ConversationMessage[]; title?: string };
        setMessages(c.messages ?? []);
        if (c.title) setActiveTitle(c.title);
      })
      .catch((err) => console.error("Failed to fetch conversation:", err));
  }, [selectedConvId]);

  // Derived: clear display when no conversation is selected
  const displayMessages = selectedConvId ? messages : [];

  // ── Derived ─────────────────────────────────────────────────
  const filteredConversations = useMemo(() => {
    if (!searchQuery.trim()) return conversations;
    const q = searchQuery.toLowerCase();
    return conversations.filter((c) => c.title.toLowerCase().includes(q));
  }, [conversations, searchQuery]);

  // ── Auto-scroll ────────────────────────────────────────────
  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [displayMessages, scrollToBottom]);

  // ── Auto-resize textarea ───────────────────────────────────
  useEffect(() => {
    const ta = textareaRef.current;
    if (ta) {
      ta.style.height = "auto";
      ta.style.height = Math.min(ta.scrollHeight, 144) + "px";
    }
  }, [inputValue]);

  // ── Send message ────────────────────────────────────────────
  const handleSend = useCallback(async () => {
    const text = inputValue.trim();
    if (!text || sending) return;

    // If no conversation selected, create one first
    let convId = selectedConvId;
    if (!convId) {
      try {
        const newConv = (await api.createConversation({ model: selectedModel })) as {
          id: string;
          title: string;
        };
        convId = newConv.id;
        setSelectedConvId(convId);
        setActiveTitle(newConv.title ?? "New Chat");
        setConversations((prev) => [
          {
            id: newConv.id,
            title: newConv.title ?? "New Chat",
            model: selectedModel,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            messageCount: 0,
            lastMessage: null,
          },
          ...prev,
        ]);
      } catch (err) {
        console.error("Failed to create conversation:", err);
        return;
      }
    }

    setInputValue("");
    setSending(true);

    // Add user message to display immediately
    const userMsg: ConversationMessage = {
      id: `temp-user-${Date.now()}`,
      conversationId: convId,
      role: "user",
      content: text,
      tokens: 0,
      createdAt: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, userMsg]);

    // Add placeholder assistant message for streaming
    const assistantMsgId = `temp-assistant-${Date.now()}`;
    setMessages((prev) => [
      ...prev,
      {
        id: assistantMsgId,
        conversationId: convId,
        role: "assistant",
        content: "",
        tokens: 0,
        createdAt: new Date().toISOString(),
      },
    ]);

    // Stream the response
    await api.streamMessage(
      convId,
      text,
      {
        onToken: (data) => {
          setMessages((prev) => {
            const updated = [...prev];
            const last = updated[updated.length - 1];
            if (last && last.role === "assistant") {
              updated[updated.length - 1] = {
                ...last,
                content: last.content + (data as unknown as { content: string }).content,
              };
            }
            return updated;
          });
        },
        onDone: () => {
          // Update conversation list
          setConversations((prev) =>
            prev.map((c) =>
              c.id === convId
                ? {
                    ...c,
                    updatedAt: new Date().toISOString(),
                    messageCount: c.messageCount + 2,
                    lastMessage: {
                      content: text.slice(0, 100) + (text.length > 100 ? "..." : ""),
                      createdAt: new Date().toISOString(),
                    },
                  }
                : c
            )
          );
        },
        onError: (error) => {
          setMessages((prev) => {
            const updated = [...prev];
            const last = updated[updated.length - 1];
            if (last && last.role === "assistant") {
              updated[updated.length - 1] = {
                ...last,
                content: `Error: ${error}`,
              };
            }
            return updated;
          });
        },
      },
      selectedModel,
    );

    setSending(false);
  }, [inputValue, sending, selectedConvId, selectedModel]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleNewChat = useCallback(() => {
    setSelectedConvId(null);
    setMessages([]);
    setSending(false);
    setActiveTitle(null);
    textareaRef.current?.focus();
  }, []);

  const handleSelectConversation = useCallback((id: string) => {
    setSelectedConvId(id);
    const conv = conversations.find((c) => c.id === id);
    if (conv) setActiveTitle(conv.title);
  }, [conversations]);

  const handleDeleteConversation = useCallback(
    async (id: string) => {
      try {
        await api.deleteConversation(id);
        setConversations((prev) => prev.filter((c) => c.id !== id));
        if (selectedConvId === id) {
          const remaining = conversations.filter((c) => c.id !== id);
          if (remaining.length > 0) {
            setSelectedConvId(remaining[0].id);
            setActiveTitle(remaining[0].title);
          } else {
            setSelectedConvId(null);
            setMessages([]);
            setActiveTitle(null);
          }
        }
      } catch (err) {
        console.error("Failed to delete conversation:", err);
      }
    },
    [selectedConvId, conversations]
  );

  const handleSuggestion = (text: string) => {
    setInputValue(text);
  };

  // ── Render ─────────────────────────────────────────────────
  return (
    <div className="flex h-[calc(100vh-3.5rem)] overflow-hidden bg-background">
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <ResizablePanelGroup direction="horizontal" className="h-full">
        {/* ── Left Panel: Conversation List ── */}
        <ResizablePanel
          defaultSize={22}
          minSize={16}
          maxSize={30}
          className={cn(
            "hidden md:flex md:flex-col border-r border-border bg-card",
            "fixed inset-y-0 left-0 top-14 z-50 w-80 md:relative md:inset-auto md:top-auto md:z-auto md:w-auto",
            sidebarOpen ? "flex" : "hidden md:flex"
          )}
        >
          {/* Header */}
          <div className="flex items-center justify-between border-b border-border px-4 py-3">
            <h2 className="text-sm font-semibold">AI Chat</h2>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="size-8"
                  onClick={handleNewChat}
                >
                  <Plus className="size-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="right">New Chat</TooltipContent>
            </Tooltip>
          </div>

          {/* Search */}
          <div className="px-3 py-2">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search conversations..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="h-8 pl-8 text-xs"
              />
            </div>
          </div>

          {/* Conversation list */}
          <ScrollArea className="flex-1 px-2">
            <div className="flex flex-col gap-0.5 pb-4">
              {convLoading ? (
                <ConversationListSkeleton />
              ) : filteredConversations.length > 0 ? (
                filteredConversations.map((conv) => (
                  <div key={conv.id} className="group/conv relative">
                    <ConversationItem
                      conversation={conv}
                      isSelected={conv.id === selectedConvId}
                      onClick={() => handleSelectConversation(conv.id)}
                    />
                    {/* Delete button on hover */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteConversation(conv.id);
                      }}
                      className="absolute right-2 top-1/2 -translate-y-1/2 opacity-0 group-hover/conv:opacity-100 transition-opacity p-1 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive"
                    >
                      <Trash2 className="size-3" />
                    </button>
                  </div>
                ))
              ) : (
                <div className="flex flex-col items-center justify-center gap-2 py-8 text-muted-foreground">
                  <MessageSquare className="size-8 opacity-40" />
                  <p className="text-xs">No conversations found</p>
                </div>
              )}
            </div>
          </ScrollArea>
        </ResizablePanel>

        <ResizableHandle withHandle className="hidden md:flex" />

        {/* ── Right Panel: Chat Area ── */}
        <ResizablePanel defaultSize={78} minSize={50}>
          <div className="flex h-full flex-col">
            {/* Top bar */}
            <div className="flex h-12 items-center gap-2 border-b border-border px-3 overflow-x-auto">
              {/* Mobile sidebar toggle */}
              <Button
                variant="ghost"
                size="icon"
                className="size-8 shrink-0 md:hidden"
                onClick={() => setSidebarOpen(!sidebarOpen)}
              >
                <ChevronLeft className="size-4" />
              </Button>

              {/* Conversation title */}
              <span className="shrink-0 text-sm font-medium truncate max-w-[180px]">
                {activeTitle ?? "New Chat"}
              </span>

              <div className="h-4 w-px bg-border mx-1 shrink-0" />

              {/* Model selector */}
              <Select value={selectedModel} onValueChange={setSelectedModel}>
                <SelectTrigger size="sm" className="h-7 text-xs w-[160px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="gpt-4o">GPT-4o</SelectItem>
                  <SelectItem value="claude-sonnet-4">Claude Sonnet 4</SelectItem>
                  <SelectItem value="deepseek-chat">DeepSeek Chat</SelectItem>
                  <SelectItem value="gemini-2.0-flash">
                    Gemini 2.0 Flash
                  </SelectItem>
                </SelectContent>
              </Select>

              {/* KB selector */}
              <Select value={selectedKb} onValueChange={setSelectedKb}>
                <SelectTrigger size="sm" className="h-7 text-xs w-[150px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None</SelectItem>
                  {mockKnowledgeBases.map((kb) => (
                    <SelectItem key={kb.id} value={kb.id}>
                      {kb.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {/* Temperature */}
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-7 gap-1.5 text-xs"
                  >
                    <Thermometer className="size-3" />
                    <span>{temperature.toFixed(1)}</span>
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-64" align="start">
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">Temperature</span>
                      <span className="text-sm font-mono text-muted-foreground">
                        {temperature.toFixed(1)}
                      </span>
                    </div>
                    <Slider
                      value={[temperature]}
                      onValueChange={([v]) => setTemperature(v)}
                      min={0}
                      max={2}
                      step={0.1}
                    />
                    <div className="flex justify-between text-[10px] text-muted-foreground">
                      <span>Precise</span>
                      <span>Creative</span>
                    </div>
                  </div>
                </PopoverContent>
              </Popover>
            </div>

            {/* Messages Area */}
            <div className="relative flex-1 overflow-hidden">
              {!selectedConvId && messages.length === 0 && !sending ? (
                /* Empty state */
                <EmptyState onSuggestion={handleSuggestion} />
              ) : messagesLoading ? (
                /* Loading messages */
                <div className="flex flex-col gap-4 p-4">
                  {Array.from({ length: 3 }, (_, i) => (
                    <div
                      key={i}
                      className={cn(
                        "flex gap-3 px-4",
                        i % 2 === 0 ? "flex-row-reverse" : "flex-row"
                      )}
                    >
                      <Skeleton className="size-8 rounded-full" />
                      <div className="space-y-2 max-w-[75%]">
                        <Skeleton className="h-16 w-64 rounded-2xl" />
                        <Skeleton className="h-3 w-16" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <ScrollArea className="h-full">
                  <div className="flex flex-col gap-1 pb-4">
                    {displayMessages.map((msg) => (
                      <MessageBubble key={msg.id} message={msg} />
                    ))}

                    {/* Typing indicator: only show briefly before streaming placeholder appears */}
                    {sending && displayMessages.length === 0 && <TypingIndicator />}

                    <div ref={messagesEndRef} />
                  </div>
                </ScrollArea>
              )}
            </div>

            {/* Input Area */}
            <div className="border-t border-border bg-background p-4">
              <div className="mx-auto flex max-w-3xl items-end gap-2">
                {/* Attachment button */}
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="outline"
                      size="icon"
                      className="size-9 shrink-0 opacity-50 cursor-not-allowed"
                      disabled
                    >
                      <Paperclip className="size-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Attachments coming soon</TooltipContent>
                </Tooltip>

                {/* Textarea */}
                <Textarea
                  ref={textareaRef}
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Type your message..."
                  className="min-h-[36px] max-h-[144px] resize-none flex-1 text-sm leading-relaxed py-2"
                  rows={1}
                  disabled={sending}
                />

                {/* Stop / Send button */}
                {sending ? (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="destructive"
                        size="icon"
                        className="size-9 shrink-0"
                        onClick={() => setSending(false)}
                      >
                        <Square className="size-4" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>Cancel</TooltipContent>
                  </Tooltip>
                ) : (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="default"
                        size="icon"
                        className="size-9 shrink-0"
                        onClick={handleSend}
                        disabled={!inputValue.trim()}
                      >
                        <SendHorizontal className="size-4" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>Send message</TooltipContent>
                  </Tooltip>
                )}
              </div>

              {/* Bottom hint */}
              <p className="mx-auto mt-2 max-w-3xl text-center text-[11px] text-muted-foreground">
                AI can make mistakes. Verify important information.
              </p>
            </div>
          </div>
        </ResizablePanel>
      </ResizablePanelGroup>
    </div>
  );
}
