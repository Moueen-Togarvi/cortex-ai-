// ─── Mock Data for Enterprise AI Platform UI ───

export interface MockUser {
  id: string;
  name: string;
  email: string;
  role: string;
  avatar?: string;
  tenantId: string;
  tenantName: string;
  createdAt: string;
  lastLogin: string;
}

export interface MockConversation {
  id: string;
  title: string;
  model: string;
  messages: MockMessage[];
  createdAt: string;
  updatedAt: string;
  knowledgeBaseId?: string;
}

export interface MockMessage {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  timestamp: string;
  model?: string;
  tokens?: number;
  attachments?: { name: string; type: string; size: number }[];
}

export interface MockDocument {
  id: string;
  name: string;
  type: string;
  size: number;
  status: "processing" | "ready" | "error" | "queued";
  knowledgeBase: string;
  chunks: number;
  uploadedAt: string;
  uploadedBy: string;
}

export interface MockKnowledgeBase {
  id: string;
  name: string;
  description: string;
  documentCount: number;
  totalChunks: number;
  embeddingModel: string;
  createdAt: string;
  updatedAt: string;
  status: "active" | "building" | "error";
}

export interface MockAgent {
  id: string;
  name: string;
  description: string;
  model: string;
  systemPrompt: string;
  tools: string[];
  temperature: number;
  maxTokens: number;
  status: "active" | "draft" | "archived";
  createdAt: string;
  executions: number;
  avgLatency: number;
}

export interface MockWorkflow {
  id: string;
  name: string;
  description: string;
  status: "active" | "draft" | "paused";
  nodes: WorkflowNode[];
  edges: WorkflowEdge[];
  executions: number;
  lastRun: string;
  createdAt: string;
}

export interface WorkflowNode {
  id: string;
  type: "llm" | "tool" | "condition" | "input" | "output" | "rag" | "human";
  label: string;
  config: Record<string, unknown>;
  position: { x: number; y: number };
}

export interface WorkflowEdge {
  id: string;
  source: string;
  target: string;
  label?: string;
}

export interface MockLLMModel {
  id: string;
  name: string;
  provider: "openai" | "anthropic" | "google" | "deepseek";
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

export interface MockTenant {
  id: string;
  name: string;
  slug: string;
  status: "active" | "suspended" | "trial";
  memberCount: number;
  documentCount: number;
  conversationCount: number;
  createdAt: string;
  plan: "free" | "pro" | "enterprise";
}

export interface MockApiKey {
  id: string;
  name: string;
  key: string;
  prefix: string;
  permissions: string[];
  createdAt: string;
  lastUsed: string;
  expiresAt?: string;
  status: "active" | "revoked";
  requestCount: number;
}

export interface MockUsageRecord {
  date: string;
  tokens: number;
  cost: number;
  requests: number;
}

// ─── Data ───

export const mockUser: MockUser = {
  id: "usr_1",
  name: "Ahmed Khan",
  email: "ahmed@company.com",
  role: "admin",
  tenantId: "tnt_1",
  tenantName: "TechCorp Inc.",
  createdAt: "2024-11-15",
  lastLogin: "2025-01-20T09:30:00Z",
};

export const mockConversations: MockConversation[] = [
  {
    id: "conv_1",
    title: "Q4 Revenue Analysis",
    model: "gpt-4o",
    createdAt: "2025-01-20T10:00:00Z",
    updatedAt: "2025-01-20T10:15:00Z",
    knowledgeBaseId: "kb_1",
    messages: [
      {
        id: "msg_1",
        role: "user",
        content: "Can you analyze our Q4 revenue data and compare it with Q3?",
        timestamp: "2025-01-20T10:00:00Z",
      },
      {
        id: "msg_2",
        role: "assistant",
        content: `Based on the financial data in your knowledge base, here's the Q4 revenue analysis:

## Q4 2024 Revenue Summary

| Metric | Q3 2024 | Q4 2024 | Change |
|--------|---------|---------|--------|
| Total Revenue | $2.4M | $3.1M | **+29.2%** |
| New Customers | 142 | 189 | **+33.1%** |
| MRR | $820K | $1.03M | **+25.6%** |
| Churn Rate | 3.2% | 2.8% | **-0.4pp** |

### Key Insights

1. **Strong growth trajectory** — Q4 saw the highest quarterly revenue, driven by enterprise deal closures
2. **Customer acquisition** improved significantly with 33% more new customers
3. **Reduced churn** contributed an additional ~$45K in retained MRR
4. **Enterprise segment** now accounts for 62% of total revenue (up from 54% in Q3)

> Recommendation: The enterprise sales motion is working well. Consider increasing SDR headcount by 2-3 to maintain this pipeline velocity into Q1 2025.`,
        timestamp: "2025-01-20T10:00:30Z",
        model: "gpt-4o",
        tokens: 287,
      },
      {
        id: "msg_3",
        role: "user",
        content: "What were the top 3 deals that closed in Q4?",
        timestamp: "2025-01-20T10:02:00Z",
      },
      {
        id: "msg_4",
        role: "assistant",
        content: `Here are the top 3 deals that closed in Q4:

### 1. GlobalTech Solutions — $480K ARR
- **Industry:** Financial Services
- **Product:** Enterprise Plan + Custom Integration
- **Sales Cycle:** 67 days
- **Key Driver:** Compliance-focused AI capabilities

### 2. MediCare Analytics — $320K ARR
- **Industry:** Healthcare
- **Product:** Pro Plan + HIPAA Add-on
- **Sales Cycle:** 45 days
- **Key Driver:** RAG-powered medical document analysis

### 3. RetailMax Corp — $210K ARR
- **Industry:** E-commerce
- **Product:** Pro Plan + Agent Studio
- **Sales Cycle:** 38 days
- **Key Driver:** Multi-agent customer support automation

Combined, these 3 deals represent **$1.01M ARR** — about **33%** of total Q4 revenue.`,
        timestamp: "2025-01-20T10:02:45Z",
        model: "gpt-4o",
        tokens: 198,
      },
    ],
  },
  {
    id: "conv_2",
    title: "API Integration Help",
    model: "claude-sonnet-4-20250514",
    createdAt: "2025-01-19T14:30:00Z",
    updatedAt: "2025-01-19T14:45:00Z",
    messages: [
      {
        id: "msg_5",
        role: "user",
        content: "How do I set up the RAG pipeline for our product docs?",
        timestamp: "2025-01-19T14:30:00Z",
      },
      {
        id: "msg_6",
        role: "assistant",
        content: `Here's how to set up the RAG pipeline for your product documentation:

### Step 1: Create a Knowledge Base
\`\`\`bash
curl -X POST /api/rag/knowledge-bases \\
  -H "Authorization: Bearer $API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{"name": "Product Docs", "description": "All product documentation"}'
\`\`\`

### Step 2: Upload Documents
\`\`\`bash
curl -X POST /api/documents/upload \\
  -H "Authorization: Bearer $API_KEY" \\
  -F "file=@product-docs.pdf" \\
  -F "knowledge_base_id=kb_123"
\`\`\`

### Step 3: Configure Your Agent
Set the \`knowledge_base_id\` in your agent configuration to enable RAG retrieval during conversations.

The system will automatically:
1. Chunk documents (1000 tokens, 200 overlap)
2. Generate embeddings (text-embedding-3-small)
3. Store vectors in pgvector
4. Retrieve relevant context at query time`,
        timestamp: "2025-01-19T14:30:30Z",
        model: "claude-sonnet-4-20250514",
        tokens: 156,
      },
    ],
  },
  {
    id: "conv_3",
    title: "Agent Configuration",
    model: "deepseek-chat",
    createdAt: "2025-01-18T09:00:00Z",
    updatedAt: "2025-01-18T09:20:00Z",
    messages: [
      {
        id: "msg_7",
        role: "user",
        content: "Help me create a customer support agent with tool calling",
        timestamp: "2025-01-18T09:00:00Z",
      },
      {
        id: "msg_8",
        role: "assistant",
        content: `I'll help you create a customer support agent. Here's the recommended configuration:

**Model:** GPT-4o (best for complex tool calling)
**Temperature:** 0.3 (more consistent responses)
**Tools:**
- \`search_knowledge_base\` — Find relevant docs
- \`get_customer_info\` — Look up customer details
- \`create_support_ticket\` — Escalate issues
- \`check_order_status\` — Track orders

Would you like me to generate the full agent configuration JSON?`,
        timestamp: "2025-01-18T09:00:30Z",
        model: "deepseek-chat",
        tokens: 89,
      },
    ],
  },
  {
    id: "conv_4",
    title: "Security Compliance Review",
    model: "gpt-4o",
    createdAt: "2025-01-17T16:00:00Z",
    updatedAt: "2025-01-17T16:30:00Z",
    messages: [],
  },
  {
    id: "conv_5",
    title: "Product Roadmap Planning",
    model: "claude-sonnet-4-20250514",
    createdAt: "2025-01-16T11:00:00Z",
    updatedAt: "2025-01-16T11:45:00Z",
    messages: [],
  },
  {
    id: "conv_6",
    title: "Data Pipeline Optimization",
    model: "gemini-2.0-flash",
    createdAt: "2025-01-15T13:00:00Z",
    updatedAt: "2025-01-15T13:20:00Z",
    messages: [],
  },
];

export const mockDocuments: MockDocument[] = [
  { id: "doc_1", name: "Q4-Financial-Report.pdf", type: "pdf", size: 2450000, status: "ready", knowledgeBase: "Finance KB", chunks: 87, uploadedAt: "2025-01-20T09:00:00Z", uploadedBy: "Ahmed Khan" },
  { id: "doc_2", name: "Product-Specification-v3.docx", type: "docx", size: 890000, status: "ready", knowledgeBase: "Product Docs", chunks: 45, uploadedAt: "2025-01-19T14:00:00Z", uploadedBy: "Sarah Ali" },
  { id: "doc_3", name: "API-Documentation.md", type: "txt", size: 156000, status: "ready", knowledgeBase: "Product Docs", chunks: 32, uploadedAt: "2025-01-19T10:00:00Z", uploadedBy: "Ahmed Khan" },
  { id: "doc_4", name: "Customer-FAQ-2025.pdf", type: "pdf", size: 1200000, status: "processing", knowledgeBase: "Support KB", chunks: 0, uploadedAt: "2025-01-20T10:30:00Z", uploadedBy: "Mike Chen" },
  { id: "doc_5", name: "Security-Audit-Report.pdf", type: "pdf", size: 3200000, status: "ready", knowledgeBase: "Finance KB", chunks: 112, uploadedAt: "2025-01-18T16:00:00Z", uploadedBy: "Lisa Park" },
  { id: "doc_6", name: "Employee-Handbook.docx", type: "docx", size: 560000, status: "ready", knowledgeBase: "HR KB", chunks: 28, uploadedAt: "2025-01-17T11:00:00Z", uploadedBy: "HR Team" },
  { id: "doc_7", name: "Sales-Training-Material.pdf", type: "pdf", size: 8900000, status: "error", knowledgeBase: "Support KB", chunks: 0, uploadedAt: "2025-01-20T08:00:00Z", uploadedBy: "Sales Team" },
  { id: "doc_8", name: "Infrastructure-Diagrams.pdf", type: "pdf", size: 4100000, status: "queued", knowledgeBase: "Engineering KB", chunks: 0, uploadedAt: "2025-01-20T10:45:00Z", uploadedBy: "DevOps Team" },
  { id: "doc_9", name: "Marketing-Campaign-Data.xlsx", type: "xlsx", size: 340000, status: "ready", knowledgeBase: "Marketing KB", chunks: 18, uploadedAt: "2025-01-16T09:00:00Z", uploadedBy: "Marketing Team" },
  { id: "doc_10", name: "Legal-Contracts-2024.pdf", type: "pdf", size: 6700000, status: "ready", knowledgeBase: "Legal KB", chunks: 95, uploadedAt: "2025-01-15T14:00:00Z", uploadedBy: "Legal Team" },
];

export const mockKnowledgeBases: MockKnowledgeBase[] = [
  { id: "kb_1", name: "Finance KB", description: "Financial reports, revenue data, and accounting documents", documentCount: 12, totalChunks: 487, embeddingModel: "text-embedding-3-small", createdAt: "2024-12-01", updatedAt: "2025-01-20", status: "active" },
  { id: "kb_2", name: "Product Docs", description: "Product specifications, API docs, and technical guides", documentCount: 24, totalChunks: 832, embeddingModel: "text-embedding-3-small", createdAt: "2024-11-15", updatedAt: "2025-01-19", status: "active" },
  { id: "kb_3", name: "Support KB", description: "Customer support documentation, FAQs, and troubleshooting guides", documentCount: 8, totalChunks: 234, embeddingModel: "text-embedding-3-small", createdAt: "2024-12-10", updatedAt: "2025-01-20", status: "building" },
  { id: "kb_4", name: "HR KB", description: "Employee handbook, policies, and onboarding materials", documentCount: 5, totalChunks: 128, embeddingModel: "text-embedding-3-small", createdAt: "2025-01-05", updatedAt: "2025-01-17", status: "active" },
  { id: "kb_5", name: "Engineering KB", description: "Architecture docs, infrastructure diagrams, and runbooks", documentCount: 15, totalChunks: 567, embeddingModel: "text-embedding-3-small", createdAt: "2024-11-20", updatedAt: "2025-01-18", status: "active" },
  { id: "kb_6", name: "Marketing KB", description: "Campaign data, brand guidelines, and content strategy", documentCount: 6, totalChunks: 89, embeddingModel: "text-embedding-3-small", createdAt: "2025-01-10", updatedAt: "2025-01-16", status: "active" },
];

export const mockAgents: MockAgent[] = [
  {
    id: "agent_1",
    name: "Customer Support Agent",
    description: "Handles customer inquiries with knowledge base search and ticket creation",
    model: "gpt-4o",
    systemPrompt: "You are a helpful customer support agent. Use the knowledge base to find accurate answers. Create tickets for complex issues.",
    tools: ["search_knowledge_base", "get_customer_info", "create_support_ticket", "check_order_status"],
    temperature: 0.3,
    maxTokens: 4096,
    status: "active",
    createdAt: "2025-01-05",
    executions: 1247,
    avgLatency: 1.8,
  },
  {
    id: "agent_2",
    name: "Code Review Bot",
    description: "Reviews pull requests, identifies bugs, and suggests improvements",
    model: "claude-sonnet-4-20250514",
    systemPrompt: "You are an expert code reviewer. Analyze code for bugs, performance issues, and best practices.",
    tools: ["read_file", "search_codebase", "get_pr_details", "post_comment"],
    temperature: 0.2,
    maxTokens: 8192,
    status: "active",
    createdAt: "2025-01-08",
    executions: 534,
    avgLatency: 3.2,
  },
  {
    id: "agent_3",
    name: "Data Analyst Agent",
    description: "Generates SQL queries, creates charts, and provides data insights",
    model: "gpt-4o",
    systemPrompt: "You are a data analyst. Help users query databases and visualize data.",
    tools: ["execute_sql", "generate_chart", "export_csv", "search_tables"],
    temperature: 0.1,
    maxTokens: 4096,
    status: "active",
    createdAt: "2025-01-10",
    executions: 312,
    avgLatency: 2.4,
  },
  {
    id: "agent_4",
    name: "Document Summarizer",
    description: "Summarizes long documents and extracts key information",
    model: "deepseek-chat",
    systemPrompt: "Summarize documents concisely, extracting key points and action items.",
    tools: ["read_document", "extract_entities", "generate_summary"],
    temperature: 0.3,
    maxTokens: 4096,
    status: "draft",
    createdAt: "2025-01-18",
    executions: 0,
    avgLatency: 0,
  },
  {
    id: "agent_5",
    name: "Sales Assistant",
    description: "Helps sales team with lead qualification and proposal generation",
    model: "gpt-4o",
    systemPrompt: "You are a sales assistant. Help qualify leads and generate proposals.",
    tools: ["search_crm", "get_lead_info", "generate_proposal", "send_email"],
    temperature: 0.5,
    maxTokens: 4096,
    status: "draft",
    createdAt: "2025-01-19",
    executions: 0,
    avgLatency: 0,
  },
];

export const mockWorkflows: MockWorkflow[] = [
  {
    id: "wf_1",
    name: "Customer Onboarding Pipeline",
    description: "Automated onboarding flow: verify customer → create account → send welcome email → schedule training",
    status: "active",
    nodes: [
      { id: "n1", type: "input", label: "New Customer", config: {}, position: { x: 50, y: 100 } },
      { id: "n2", type: "tool", label: "Verify Identity", config: { tool: "verify_customer" }, position: { x: 250, y: 100 } },
      { id: "n3", type: "condition", label: "Verified?", config: {}, position: { x: 450, y: 100 } },
      { id: "n4", type: "tool", label: "Create Account", config: { tool: "create_account" }, position: { x: 650, y: 60 } },
      { id: "n5", type: "llm", label: "Welcome Email", config: { model: "gpt-4o", prompt: "Generate welcome email" }, position: { x: 850, y: 60 } },
      { id: "n6", type: "tool", label: "Schedule Training", config: { tool: "schedule_training" }, position: { x: 1050, y: 60 } },
      { id: "n7", type: "output", label: "Onboarded", config: {}, position: { x: 1250, y: 60 } },
      { id: "n8", type: "tool", label: "Send Rejection", config: { tool: "send_rejection" }, position: { x: 650, y: 180 } },
    ],
    edges: [
      { id: "e1", source: "n1", target: "n2" },
      { id: "e2", source: "n2", target: "n3" },
      { id: "e3", source: "n3", target: "n4", label: "Yes" },
      { id: "e4", source: "n3", target: "n8", label: "No" },
      { id: "e5", source: "n4", target: "n5" },
      { id: "e6", source: "n5", target: "n6" },
      { id: "e7", source: "n6", target: "n7" },
    ],
    executions: 89,
    lastRun: "2025-01-20T08:30:00Z",
    createdAt: "2025-01-02",
  },
  {
    id: "wf_2",
    name: "Document Processing Pipeline",
    description: "Upload → Extract → Chunk → Embed → Index → Notify",
    status: "active",
    nodes: [
      { id: "w2n1", type: "input", label: "Document Upload", config: {}, position: { x: 50, y: 100 } },
      { id: "w2n2", type: "tool", label: "Extract Text", config: { tool: "extract_text" }, position: { x: 250, y: 100 } },
      { id: "w2n3", type: "tool", label: "Chunk Document", config: { tool: "chunk_text" }, position: { x: 450, y: 100 } },
      { id: "w2n4", type: "tool", label: "Generate Embeddings", config: { tool: "embed" }, position: { x: 650, y: 100 } },
      { id: "w2n5", type: "tool", label: "Store in Vector DB", config: { tool: "store_vectors" }, position: { x: 850, y: 100 } },
      { id: "w2n6", type: "output", label: "Indexed", config: {}, position: { x: 1050, y: 100 } },
    ],
    edges: [
      { id: "w2e1", source: "w2n1", target: "w2n2" },
      { id: "w2e2", source: "w2n2", target: "w2n3" },
      { id: "w2e3", source: "w2n3", target: "w2n4" },
      { id: "w2e4", source: "w2n4", target: "w2n5" },
      { id: "w2e5", source: "w2n5", target: "w2n6" },
    ],
    executions: 456,
    lastRun: "2025-01-20T10:30:00Z",
    createdAt: "2024-12-15",
  },
  {
    id: "wf_3",
    name: "Multi-Agent Research Pipeline",
    description: "Research agent → Fact-checker → Summarizer → Report Generator",
    status: "draft",
    nodes: [
      { id: "w3n1", type: "input", label: "Research Topic", config: {}, position: { x: 50, y: 100 } },
      { id: "w3n2", type: "llm", label: "Research Agent", config: { model: "gpt-4o" }, position: { x: 250, y: 100 } },
      { id: "w3n3", type: "llm", label: "Fact Checker", config: { model: "claude-sonnet-4-20250514" }, position: { x: 500, y: 100 } },
      { id: "w3n4", type: "llm", label: "Summarizer", config: { model: "deepseek-chat" }, position: { x: 750, y: 100 } },
      { id: "w3n5", type: "output", label: "Research Report", config: {}, position: { x: 1000, y: 100 } },
    ],
    edges: [
      { id: "w3e1", source: "w3n1", target: "w3n2" },
      { id: "w3e2", source: "w3n2", target: "w3n3" },
      { id: "w3e3", source: "w3n3", target: "w3n4" },
      { id: "w3e4", source: "w3n4", target: "w3n5" },
    ],
    executions: 0,
    lastRun: "",
    createdAt: "2025-01-19",
  },
];

export const mockModels: MockLLMModel[] = [
  { id: "model_1", name: "GPT-4o", provider: "openai", modelId: "gpt-4o", status: "active", inputPrice: 2.5, outputPrice: 10, contextWindow: 128000, maxOutput: 16384, totalUsage: 4520000, totalCost: 234.5, avgLatency: 1.2 },
  { id: "model_2", name: "GPT-4o Mini", provider: "openai", modelId: "gpt-4o-mini", status: "active", inputPrice: 0.15, outputPrice: 0.6, contextWindow: 128000, maxOutput: 16384, totalUsage: 12800000, totalCost: 89.3, avgLatency: 0.4 },
  { id: "model_3", name: "Claude Sonnet 4", provider: "anthropic", modelId: "claude-sonnet-4-20250514", status: "active", inputPrice: 3, outputPrice: 15, contextWindow: 200000, maxOutput: 16384, totalUsage: 2100000, totalCost: 156.7, avgLatency: 1.8 },
  { id: "model_4", name: "Claude Haiku 3.5", provider: "anthropic", modelId: "claude-3-5-haiku-20241022", status: "active", inputPrice: 0.8, outputPrice: 4, contextWindow: 200000, maxOutput: 8192, totalUsage: 890000, totalCost: 23.1, avgLatency: 0.6 },
  { id: "model_5", name: "Gemini 2.0 Flash", provider: "google", modelId: "gemini-2.0-flash", status: "active", inputPrice: 0.1, outputPrice: 0.4, contextWindow: 1048576, maxOutput: 8192, totalUsage: 3400000, totalCost: 18.9, avgLatency: 0.5 },
  { id: "model_6", name: "Gemini 1.5 Pro", provider: "google", modelId: "gemini-1.5-pro", status: "inactive", inputPrice: 1.25, outputPrice: 5, contextWindow: 2097152, maxOutput: 8192, totalUsage: 560000, totalCost: 34.2, avgLatency: 2.1 },
  { id: "model_7", name: "DeepSeek Chat", provider: "deepseek", modelId: "deepseek-chat", status: "active", inputPrice: 0.14, outputPrice: 0.28, contextWindow: 65536, maxOutput: 8192, totalUsage: 5600000, totalCost: 45.8, avgLatency: 0.9 },
  { id: "model_8", name: "DeepSeek Reasoner", provider: "deepseek", modelId: "deepseek-reasoner", status: "active", inputPrice: 0.55, outputPrice: 2.19, contextWindow: 65536, maxOutput: 16384, totalUsage: 780000, totalCost: 67.3, avgLatency: 4.5 },
];

export const mockTenants: MockTenant[] = [
  { id: "tnt_1", name: "TechCorp Inc.", slug: "techcorp", status: "active", memberCount: 24, documentCount: 156, conversationCount: 1240, createdAt: "2024-11-01", plan: "enterprise" },
  { id: "tnt_2", name: "MediCare Analytics", slug: "medicare", status: "active", memberCount: 12, documentCount: 89, conversationCount: 567, createdAt: "2024-11-15", plan: "pro" },
  { id: "tnt_3", name: "RetailMax Corp", slug: "retailmax", status: "active", memberCount: 8, documentCount: 45, conversationCount: 234, createdAt: "2024-12-01", plan: "pro" },
  { id: "tnt_4", name: "GlobalTech Solutions", slug: "globaltech", status: "trial", memberCount: 3, documentCount: 12, conversationCount: 45, createdAt: "2025-01-10", plan: "free" },
  { id: "tnt_5", name: "EduLearn Platform", slug: "edulearn", status: "suspended", memberCount: 5, documentCount: 23, conversationCount: 78, createdAt: "2024-10-20", plan: "pro" },
];

export const mockApiKeys: MockApiKey[] = [
  { id: "key_1", name: "Production API Key", key: "sk-prod-xxxx...xxxx", prefix: "sk-prod-", permissions: ["chat", "rag", "documents"], createdAt: "2024-11-15", lastUsed: "2025-01-20T10:00:00Z", requestCount: 12450, status: "active" },
  { id: "key_2", name: "Development Key", key: "sk-dev-xxxx...xxxx", prefix: "sk-dev-", permissions: ["chat", "rag"], createdAt: "2024-12-01", lastUsed: "2025-01-19T15:00:00Z", expiresAt: "2025-06-01", requestCount: 4520, status: "active" },
  { id: "key_3", name: "CI/CD Pipeline Key", key: "sk-cicd-xxxx...xxxx", prefix: "sk-cicd-", permissions: ["documents", "rag"], createdAt: "2025-01-05", lastUsed: "2025-01-20T06:00:00Z", requestCount: 890, status: "active" },
  { id: "key_4", name: "Old Staging Key", key: "sk-old-xxxx...xxxx", prefix: "sk-old-", permissions: ["chat"], createdAt: "2024-10-01", lastUsed: "2024-12-15T12:00:00Z", requestCount: 2340, status: "revoked" },
];

export const mockUsageHistory: MockUsageRecord[] = [
  { date: "2025-01-14", tokens: 245000, cost: 12.5, requests: 320 },
  { date: "2025-01-15", tokens: 312000, cost: 16.8, requests: 410 },
  { date: "2025-01-16", tokens: 287000, cost: 14.2, requests: 380 },
  { date: "2025-01-17", tokens: 356000, cost: 19.1, requests: 450 },
  { date: "2025-01-18", tokens: 198000, cost: 10.3, requests: 260 },
  { date: "2025-01-19", tokens: 423000, cost: 22.7, requests: 520 },
  { date: "2025-01-20", tokens: 389000, cost: 20.5, requests: 490 },
];

export const mockDashboardStats = {
  totalConversations: 1240,
  totalDocuments: 156,
  totalAgents: 5,
  totalWorkflows: 3,
  activeKnowledgeBases: 6,
  tokensUsedThisMonth: 7890000,
  costThisMonth: 245.6,
  activeUsers: 24,
  avgResponseTime: 1.4,
};

export const mockActivityFeed = [
  { id: "act_1", type: "chat" as const, message: "New conversation started: Q4 Revenue Analysis", user: "Ahmed Khan", time: "2 min ago" },
  { id: "act_2", type: "document" as const, message: "Document uploaded: Customer-FAQ-2025.pdf", user: "Mike Chen", time: "15 min ago" },
  { id: "act_3", type: "agent" as const, message: "Customer Support Agent executed (latency: 1.2s)", user: "System", time: "23 min ago" },
  { id: "act_4", type: "workflow" as const, message: "Document Processing Pipeline completed (6 documents)", user: "System", time: "1 hr ago" },
  { id: "act_5", type: "document" as const, message: "Knowledge Base 'Support KB' re-indexed", user: "Sarah Ali", time: "2 hr ago" },
  { id: "act_6", type: "chat" as const, message: "New conversation: API Integration Help", user: "Ahmed Khan", time: "3 hr ago" },
  { id: "act_7", type: "agent" as const, message: "Code Review Bot reviewed PR #234", user: "DevOps Bot", time: "4 hr ago" },
  { id: "act_8", type: "workflow" as const, message: "Customer Onboarding Pipeline completed", user: "System", time: "5 hr ago" },
];

export const availableTools = [
  { id: "search_knowledge_base", name: "Search Knowledge Base", description: "Search across all knowledge bases for relevant information", category: "RAG" },
  { id: "get_customer_info", name: "Get Customer Info", description: "Retrieve customer details from CRM", category: "CRM" },
  { id: "create_support_ticket", name: "Create Support Ticket", description: "Create a new support ticket in the system", category: "Support" },
  { id: "check_order_status", name: "Check Order Status", description: "Look up order status and tracking info", category: "Commerce" },
  { id: "execute_sql", name: "Execute SQL", description: "Run SQL queries against the database", category: "Data" },
  { id: "generate_chart", name: "Generate Chart", description: "Create charts and visualizations from data", category: "Data" },
  { id: "read_file", name: "Read File", description: "Read file contents from repository", category: "Development" },
  { id: "search_codebase", name: "Search Codebase", description: "Search code across repositories", category: "Development" },
  { id: "web_search", name: "Web Search", description: "Search the web for current information", category: "Utility" },
  { id: "send_email", name: "Send Email", description: "Send emails to specified recipients", category: "Communication" },
  { id: "extract_entities", name: "Extract Entities", description: "Extract named entities from text", category: "NLP" },
  { id: "generate_summary", name: "Generate Summary", description: "Generate concise summaries of long text", category: "NLP" },
];