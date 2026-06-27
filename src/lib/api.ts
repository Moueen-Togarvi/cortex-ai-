// Shared API client for frontend-backend communication

const BASE = "/api";

// Get auth token from localStorage (set by auth store)
function getAuthHeaders(): Record<string, string> {
  if (typeof window === "undefined") return {};
  try {
    const stored = localStorage.getItem("auth-store");
    if (!stored) return {};
    const parsed = JSON.parse(stored);
    const token = parsed?.state?.token;
    return token ? { Authorization: `Bearer ${token}` } : {};
  } catch {
    return {};
  }
}

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    headers: { "Content-Type": "application/json", ...getAuthHeaders(), ...options?.headers },
    ...options,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ message: res.statusText }));
    throw new Error(err.message || `API Error ${res.status}`);
  }
  return res.json();
}

// ── SSE Streaming Helpers ──────────────────────────────────────

export interface SSECallbacks<T = string> {
  onToken?: (data: T) => void;
  onDone?: (data: Record<string, unknown>) => void;
  onError?: (error: string) => void;
  onNodeStart?: (data: { nodeId: string; nodeType: string; label: string }) => void;
  onNodeComplete?: (data: Record<string, unknown>) => void;
  onNodeError?: (data: { nodeId: string; error: string }) => void;
}

export async function streamRequest(
  path: string,
  body: Record<string, unknown>,
  callbacks: SSECallbacks<unknown>,
): Promise<void> {
  const res = await fetch(`${BASE}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ message: res.statusText }));
    callbacks.onError?.(err.message || `Stream Error ${res.status}`);
    return;
  }

  const reader = res.body?.getReader();
  if (!reader) {
    callbacks.onError?.("No response stream");
    return;
  }

  const decoder = new TextDecoder();
  let buffer = "";
  let currentEvent = "message";

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() ?? "";

      for (const line of lines) {
        if (line.startsWith("event: ")) {
          currentEvent = line.slice(7).trim();
        } else if (line.startsWith("data: ")) {
          const dataStr = line.slice(6);
          try {
            const data = JSON.parse(dataStr);

            switch (currentEvent) {
              case "token":
                callbacks.onToken?.(data);
                break;
              case "done":
                callbacks.onDone?.(data);
                break;
              case "error":
                callbacks.onError?.(data.error ?? "Unknown error");
                break;
              case "node_start":
                callbacks.onNodeStart?.(data);
                break;
              case "node_complete":
                callbacks.onNodeComplete?.(data);
                break;
              case "node_error":
                callbacks.onNodeError?.(data);
                break;
            }
          } catch {
            // Skip malformed JSON
          }
          currentEvent = "message";
        }
      }
    }
  } catch (error) {
    callbacks.onError?.(error instanceof Error ? error.message : "Stream interrupted");
  }
}

export const api = {
  // Dashboard
  getDashboardStats: () => request<Record<string, unknown>>("/dashboard/stats"),

  // Conversations
  getConversations: () => request<unknown[]>("/conversations"),
  createConversation: (data?: Record<string, unknown>) =>
    request<unknown>("/conversations", { method: "POST", body: JSON.stringify(data || {}) }),
  getConversation: (id: string) => request<unknown>(`/conversations/${id}`),
  deleteConversation: (id: string) =>
    request<void>(`/conversations/${id}`, { method: "DELETE" }),
  sendMessage: (conversationId: string, content: string, model?: string) =>
    request<unknown>(`/conversations/${conversationId}/messages`, {
      method: "POST",
      body: JSON.stringify({ content, model }),
    }),
  // SSE streaming chat
  streamMessage: (
    conversationId: string,
    content: string,
    callbacks: SSECallbacks<{ content: string }>,
    model?: string,
  ) =>
    streamRequest(
      `/conversations/${conversationId}/messages/stream`,
      { content, model },
      callbacks,
    ),

  // Agents
  getAgents: () => request<unknown[]>("/agents"),
  getAgent: (id: string) => request<unknown>(`/agents/${id}`),
  createAgent: (data: Record<string, unknown>) =>
    request<unknown>("/agents", { method: "POST", body: JSON.stringify(data) }),
  updateAgent: (id: string, data: Record<string, unknown>) =>
    request<unknown>(`/agents/${id}`, { method: "PUT", body: JSON.stringify(data) }),
  deleteAgent: (id: string) =>
    request<void>(`/agents/${id}`, { method: "DELETE" }),
  executeAgent: (id: string, message: string, history?: Array<{ role: string; content: string }>) =>
    request<unknown>(`/agents/${id}/execute`, {
      method: "POST",
      body: JSON.stringify({ message, history }),
    }),

  // Tools
  getTools: () => request<unknown[]>("/tools"),

  // Workflows
  getWorkflows: () => request<unknown[]>("/workflows"),
  getWorkflow: (id: string) => request<unknown>(`/workflows/${id}`),
  createWorkflow: (data: Record<string, unknown>) =>
    request<unknown>("/workflows", { method: "POST", body: JSON.stringify(data) }),
  updateWorkflow: (id: string, data: Record<string, unknown>) =>
    request<unknown>(`/workflows/${id}`, { method: "PUT", body: JSON.stringify(data) }),
  deleteWorkflow: (id: string) =>
    request<void>(`/workflows/${id}`, { method: "DELETE" }),
  runWorkflow: (id: string) =>
    request<unknown>(`/workflows/${id}/run`, { method: "POST" }),
  // SSE streaming workflow execution
  streamWorkflow: (
    id: string,
    callbacks: SSECallbacks,
    input?: Record<string, string>,
  ) =>
    streamRequest(`/workflows/${id}/run/stream`, { input }, callbacks),

  // Documents
  getDocuments: () => request<unknown[]>("/documents"),
  createDocument: (data: Record<string, unknown>) =>
    request<unknown>("/documents", { method: "POST", body: JSON.stringify(data) }),
  deleteDocument: (id: string) =>
    request<void>(`/documents/${id}`, { method: "DELETE" }),

  // Knowledge Bases
  getKnowledgeBases: () => request<unknown[]>("/knowledge-bases"),
  getKnowledgeBase: (id: string) => request<unknown>(`/knowledge-bases/${id}`),
  createKnowledgeBase: (data: Record<string, unknown>) =>
    request<unknown>("/knowledge-bases", { method: "POST", body: JSON.stringify(data) }),
  updateKnowledgeBase: (id: string, data: Record<string, unknown>) =>
    request<unknown>(`/knowledge-bases/${id}`, { method: "PUT", body: JSON.stringify(data) }),
  deleteKnowledgeBase: (id: string) =>
    request<void>(`/knowledge-bases/${id}`, { method: "DELETE" }),
  searchKnowledgeBase: (id: string, query: string, topK?: number) =>
    request<unknown>(`/knowledge-bases/${id}/search`, {
      method: "POST",
      body: JSON.stringify({ query, topK }),
    }),

  // LLM
  getModels: () => request<unknown[]>("/llm/models"),
  chat: (data: { model: string; messages: { role: string; content: string }[]; temperature?: number }) =>
    request<unknown>("/llm/chat", { method: "POST", body: JSON.stringify(data) }),
  getUsage: (days?: number) =>
    request<{ data: unknown[]; summary: Record<string, number> }>(`/llm/usage?days=${days || 7}`),

  // Users
  getCurrentUser: () => request<unknown>("/users"),

  // Auth
  login: (email: string, password: string) =>
    request<{ user: unknown; token: string }>("/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    }),
  register: (email: string, password: string, name: string) =>
    request<{ user: unknown; token: string }>("/auth/register", {
      method: "POST",
      body: JSON.stringify({ email, password, name }),
    }),
  getMe: () => request<unknown>("/auth/me"),
  logout: () =>
    request<{ success: boolean }>("/auth/logout", { method: "POST" }),

  // Audit Logs
  getAuditLogs: (params?: { action?: string; resource?: string; limit?: number; offset?: number }) => {
    const search = new URLSearchParams();
    if (params?.action) search.set("action", params.action);
    if (params?.resource) search.set("resource", params.resource);
    if (params?.limit) search.set("limit", String(params.limit));
    if (params?.offset) search.set("offset", String(params.offset));
    return request<unknown[]>(`/audit-logs?${search.toString()}`);
  },

  // Document Upload (FormData, no JSON content-type)
  uploadDocument: (file: File, knowledgeBaseId: string) => {
    const formData = new FormData();
    formData.append("file", file);
    formData.append("knowledgeBaseId", knowledgeBaseId);
    return request<unknown>("/documents/upload", {
      method: "POST",
      headers: { ...getAuthHeaders() },
      body: formData,
    });
  },

  // Observability
  getTraces: (params?: { source?: string; status?: string; model?: string; limit?: number; offset?: number; hours?: number }) => {
    const search = new URLSearchParams();
    if (params?.source) search.set("source", params.source);
    if (params?.status) search.set("status", params.status);
    if (params?.model) search.set("model", params.model);
    if (params?.limit) search.set("limit", String(params.limit));
    if (params?.offset) search.set("offset", String(params.offset));
    if (params?.hours) search.set("hours", String(params.hours));
    return request<Record<string, unknown>>(`/traces?${search.toString()}`);
  },
  getTrace: (id: string) => request<Record<string, unknown>>(`/traces/${id}`),
  getObservabilityOverview: (hours?: number) =>
    request<Record<string, unknown>>(`/observability/overview?hours=${hours || 24}`),

  // Guardrails
  getGuardrailPolicies: () => request<unknown[]>("/guardrails/policies"),
  createGuardrailPolicy: (data: Record<string, unknown>) =>
    request<unknown>("/guardrails/policies", { method: "POST", body: JSON.stringify(data) }),
  updateGuardrailPolicy: (id: string, data: Record<string, unknown>) =>
    request<unknown>(`/guardrails/policies/${id}`, { method: "PUT", body: JSON.stringify(data) }),
  deleteGuardrailPolicy: (id: string) =>
    request<void>(`/guardrails/policies/${id}`, { method: "DELETE" }),
  evaluateGuardrails: (text: string, scope?: string) =>
    request<Record<string, unknown>>("/guardrails/evaluate", { method: "POST", body: JSON.stringify({ text, scope }) }),
};