// Tool Registry - defines all available tools for agents

export interface ToolDefinition {
  id: string;
  name: string;
  description: string;
  category: string;
  parameters: ToolParameter[];
  handler?: (params: Record<string, unknown>) => Promise<unknown>;
}

export interface ToolParameter {
  name: string;
  type: "string" | "number" | "boolean" | "object" | "array";
  description: string;
  required: boolean;
  default?: unknown;
}

export const toolRegistry: ToolDefinition[] = [
  {
    id: "search_knowledge_base",
    name: "Search Knowledge Base",
    description: "Search across all knowledge bases for relevant information using semantic similarity",
    category: "RAG",
    parameters: [
      { name: "query", type: "string", description: "Search query", required: true },
      { name: "knowledgeBaseId", type: "string", description: "Specific KB to search (optional)", required: false },
      { name: "topK", type: "number", description: "Number of results", required: false, default: 5 },
    ],
  },
  {
    id: "get_customer_info",
    name: "Get Customer Info",
    description: "Retrieve customer details from the CRM system",
    category: "CRM",
    parameters: [
      { name: "customerId", type: "string", description: "Customer ID or email", required: true },
    ],
  },
  {
    id: "create_support_ticket",
    name: "Create Support Ticket",
    description: "Create a new support ticket in the system",
    category: "Support",
    parameters: [
      { name: "title", type: "string", description: "Ticket title", required: true },
      { name: "description", type: "string", description: "Ticket description", required: true },
      { name: "priority", type: "string", description: "Priority: low, medium, high, urgent", required: false, default: "medium" },
      { name: "customerId", type: "string", description: "Associated customer ID", required: false },
    ],
  },
  {
    id: "check_order_status",
    name: "Check Order Status",
    description: "Look up order status and tracking information",
    category: "Commerce",
    parameters: [
      { name: "orderId", type: "string", description: "Order ID", required: true },
    ],
  },
  {
    id: "execute_sql",
    name: "Execute SQL",
    description: "Run SQL queries against the database (read-only)",
    category: "Data",
    parameters: [
      { name: "query", type: "string", description: "SQL query to execute", required: true },
      { name: "database", type: "string", description: "Target database", required: false, default: "main" },
    ],
  },
  {
    id: "generate_chart",
    name: "Generate Chart",
    description: "Create charts and visualizations from data",
    category: "Data",
    parameters: [
      { name: "data", type: "array", description: "Data points for the chart", required: true },
      { name: "chartType", type: "string", description: "Chart type: bar, line, pie, area", required: false, default: "bar" },
      { name: "title", type: "string", description: "Chart title", required: false },
    ],
  },
  {
    id: "read_file",
    name: "Read File",
    description: "Read file contents from a repository or storage",
    category: "Development",
    parameters: [
      { name: "path", type: "string", description: "File path", required: true },
      { name: "repository", type: "string", description: "Repository name", required: false },
    ],
  },
  {
    id: "search_codebase",
    name: "Search Codebase",
    description: "Search code across repositories",
    category: "Development",
    parameters: [
      { name: "query", type: "string", description: "Search query", required: true },
      { name: "language", type: "string", description: "Programming language filter", required: false },
      { name: "repository", type: "string", description: "Repository name", required: false },
    ],
  },
  {
    id: "get_pr_details",
    name: "Get PR Details",
    description: "Get pull request details and diff",
    category: "Development",
    parameters: [
      { name: "prNumber", type: "number", description: "PR number", required: true },
      { name: "repository", type: "string", description: "Repository name", required: false },
    ],
  },
  {
    id: "post_comment",
    name: "Post Comment",
    description: "Post a comment on a pull request or issue",
    category: "Development",
    parameters: [
      { name: "body", type: "string", description: "Comment body", required: true },
      { name: "prNumber", type: "number", description: "PR or issue number", required: true },
    ],
  },
  {
    id: "web_search",
    name: "Web Search",
    description: "Search the web for current information",
    category: "Utility",
    parameters: [
      { name: "query", type: "string", description: "Search query", required: true },
      { name: "numResults", type: "number", description: "Number of results", required: false, default: 5 },
    ],
  },
  {
    id: "send_email",
    name: "Send Email",
    description: "Send emails to specified recipients",
    category: "Communication",
    parameters: [
      { name: "to", type: "string", description: "Recipient email", required: true },
      { name: "subject", type: "string", description: "Email subject", required: true },
      { name: "body", type: "string", description: "Email body", required: true },
    ],
  },
  {
    id: "extract_entities",
    name: "Extract Entities",
    description: "Extract named entities from text",
    category: "NLP",
    parameters: [
      { name: "text", type: "string", description: "Text to extract entities from", required: true },
      { name: "entityTypes", type: "array", description: "Entity types to extract", required: false, default: ["person", "org", "date", "location"] },
    ],
  },
  {
    id: "generate_summary",
    name: "Generate Summary",
    description: "Generate concise summaries of long text",
    category: "NLP",
    parameters: [
      { name: "text", type: "string", description: "Text to summarize", required: true },
      { name: "maxLength", type: "number", description: "Max summary length in words", required: false, default: 200 },
    ],
  },
  {
    id: "read_document",
    name: "Read Document",
    description: "Read a document from the knowledge base",
    category: "RAG",
    parameters: [
      { name: "documentId", type: "string", description: "Document ID", required: true },
    ],
  },
  {
    id: "export_csv",
    name: "Export CSV",
    description: "Export query results as CSV file",
    category: "Data",
    parameters: [
      { name: "data", type: "array", description: "Data to export", required: true },
      { name: "filename", type: "string", description: "Output filename", required: false, default: "export.csv" },
    ],
  },
];

export function getToolById(id: string): ToolDefinition | undefined {
  return toolRegistry.find((t) => t.id === id);
}

export function getToolsByCategory(category: string): ToolDefinition[] {
  return toolRegistry.filter((t) => t.category === category);
}

export function getToolCategories(): string[] {
  return [...new Set(toolRegistry.map((t) => t.category))];
}

// Simulate tool execution for demo purposes
export async function executeTool(
  toolId: string,
  params: Record<string, unknown>
): Promise<{ output: string; success: boolean }> {
  const tool = getToolById(toolId);
  if (!tool) return { output: `Tool "${toolId}" not found`, success: false };

  // Simulate different tool responses
  const simulatedResponses: Record<string, string> = {
    search_knowledge_base: `Found 3 relevant results for "${params.query}":\n1. Q4-Financial-Report.pdf (chunk 12, score: 0.92)\n2. Product-Specification-v3.docx (chunk 8, score: 0.85)\n3. API-Documentation.md (chunk 23, score: 0.78)`,
    get_customer_info: `Customer: ${params.customerId}\nName: John Smith\nEmail: john@example.com\nPlan: Enterprise\nStatus: Active\nJoined: 2024-03-15`,
    create_support_ticket: `Ticket #TK-${Math.floor(Math.random() * 9000 + 1000)} created.\nTitle: ${params.title}\nPriority: ${params.priority || "medium"}\nStatus: Open`,
    check_order_status: `Order #${params.orderId}\nStatus: In Transit\nTracking: 1Z999AA10123456784\nEstimated Delivery: 2025-01-25`,
    execute_sql: `Query executed successfully.\nReturned ${Math.floor(Math.random() * 50 + 5)} rows.`,
    web_search: `Top results for "${params.query}":\n1. [Official Docs] Latest documentation\n2. [Stack Overflow] Community answer\n3. [GitHub] Open source implementation`,
    send_email: `Email sent to ${params.to}\nSubject: ${params.subject}`,
    read_file: `File: ${params.path}\n---\n// Sample file content\nexport function main() {\n  console.log("Hello, World!");\n}`,
  };

  await new Promise((r) => setTimeout(r, Math.random() * 500 + 200));

  return {
    output: simulatedResponses[toolId] || `${tool.name} executed with params: ${JSON.stringify(params)}`,
    success: true,
  };
}