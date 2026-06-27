import { PrismaClient } from "@prisma/client";

const db = new PrismaClient();

async function seed() {
  console.log("Seeding database...");

  // Create default user
  const user = await db.user.upsert({
    where: { email: "admin@aiplatform.com" },
    update: {},
    create: {
      email: "admin@aiplatform.com",
      name: "Ahmed Khan",
      role: "admin",
    },
  });
  console.log(`User: ${user.email}`);

  // Create knowledge bases
  const kbs = await Promise.all([
    db.knowledgeBase.create({
      data: {
        name: "Finance KB",
        description: "Financial reports, revenue data, and accounting documents",
        status: "active",
        documentCount: 12,
        totalChunks: 487,
        userId: user.id,
      },
    }),
    db.knowledgeBase.create({
      data: {
        name: "Product Docs",
        description: "Product specifications, API docs, and technical guides",
        status: "active",
        documentCount: 24,
        totalChunks: 832,
        userId: user.id,
      },
    }),
    db.knowledgeBase.create({
      data: {
        name: "Support KB",
        description: "Customer support documentation, FAQs, and troubleshooting guides",
        status: "building",
        documentCount: 8,
        totalChunks: 234,
        userId: user.id,
      },
    }),
    db.knowledgeBase.create({
      data: {
        name: "Engineering KB",
        description: "Architecture docs, infrastructure diagrams, and runbooks",
        status: "active",
        documentCount: 15,
        totalChunks: 567,
        userId: user.id,
      },
    }),
  ]);
  console.log(`Knowledge Bases: ${kbs.length}`);

  // Create documents
  const docs = await Promise.all([
    db.document.create({ data: { name: "Q4-Financial-Report.pdf", type: "pdf", size: 2450000, status: "ready", chunks: 87, knowledgeBaseId: kbs[0].id, userId: user.id } }),
    db.document.create({ data: { name: "Product-Specification-v3.docx", type: "docx", size: 890000, status: "ready", chunks: 45, knowledgeBaseId: kbs[1].id, userId: user.id } }),
    db.document.create({ data: { name: "API-Documentation.md", type: "txt", size: 156000, status: "ready", chunks: 32, knowledgeBaseId: kbs[1].id, userId: user.id } }),
    db.document.create({ data: { name: "Customer-FAQ-2025.pdf", type: "pdf", size: 1200000, status: "processing", chunks: 0, knowledgeBaseId: kbs[2].id, userId: user.id } }),
    db.document.create({ data: { name: "Security-Audit-Report.pdf", type: "pdf", size: 3200000, status: "ready", chunks: 112, knowledgeBaseId: kbs[0].id, userId: user.id } }),
    db.document.create({ data: { name: "Sales-Training-Material.pdf", type: "pdf", size: 8900000, status: "error", chunks: 0, knowledgeBaseId: kbs[2].id, userId: user.id } }),
    db.document.create({ data: { name: "Infrastructure-Diagrams.pdf", type: "pdf", size: 4100000, status: "queued", chunks: 0, knowledgeBaseId: kbs[3].id, userId: user.id } }),
    db.document.create({ data: { name: "Marketing-Campaign-Data.xlsx", type: "xlsx", size: 340000, status: "ready", chunks: 18, knowledgeBaseId: kbs[1].id, userId: user.id } }),
  ]);
  console.log(`Documents: ${docs.length}`);

  // Create agents
  const agents = await Promise.all([
    db.agent.create({
      data: {
        name: "Customer Support Agent",
        description: "Handles customer inquiries with knowledge base search and ticket creation",
        model: "gpt-4o",
        systemPrompt: "You are a helpful customer support agent. Use the knowledge base to find accurate answers.",
        tools: JSON.stringify(["search_knowledge_base", "get_customer_info", "create_support_ticket", "check_order_status"]),
        temperature: 0.3,
        maxTokens: 4096,
        status: "active",
        userId: user.id,
      },
    }),
    db.agent.create({
      data: {
        name: "Code Review Bot",
        description: "Reviews pull requests, identifies bugs, and suggests improvements",
        model: "claude-sonnet-4-20250514",
        systemPrompt: "You are an expert code reviewer. Analyze code for bugs and best practices.",
        tools: JSON.stringify(["read_file", "search_codebase", "get_pr_details", "post_comment"]),
        temperature: 0.2,
        maxTokens: 8192,
        status: "active",
        userId: user.id,
      },
    }),
    db.agent.create({
      data: {
        name: "Data Analyst Agent",
        description: "Generates SQL queries, creates charts, and provides data insights",
        model: "gpt-4o",
        systemPrompt: "You are a data analyst. Help users query databases and visualize data.",
        tools: JSON.stringify(["execute_sql", "generate_chart", "export_csv"]),
        temperature: 0.1,
        maxTokens: 4096,
        status: "active",
        userId: user.id,
      },
    }),
    db.agent.create({
      data: {
        name: "Document Summarizer",
        description: "Summarizes long documents and extracts key information",
        model: "deepseek-chat",
        systemPrompt: "Summarize documents concisely, extracting key points and action items.",
        tools: JSON.stringify(["read_document", "extract_entities", "generate_summary"]),
        temperature: 0.3,
        maxTokens: 4096,
        status: "draft",
        userId: user.id,
      },
    }),
  ]);
  console.log(`Agents: ${agents.length}`);

  // Create agent executions
  for (const agent of agents.slice(0, 3)) {
    const count = agent.id === agents[0].id ? 20 : agent.id === agents[1].id ? 10 : 5;
    for (let i = 0; i < count; i++) {
      await db.agentExecution.create({
        data: {
          agentId: agent.id,
          userId: user.id,
          input: "Test query " + (i + 1),
          output: "Agent response for query " + (i + 1),
          toolsUsed: JSON.stringify(agent.id === agents[0].id ? ["search_knowledge_base"] : []),
          tokens: Math.floor(Math.random() * 500) + 100,
          latencyMs: Math.floor(Math.random() * 3000) + 500,
          status: "success",
        },
      });
    }
  }
  console.log("Agent executions seeded");

  // Create workflows
  const workflows = await Promise.all([
    db.workflow.create({
      data: {
        name: "Customer Onboarding Pipeline",
        description: "Automated onboarding flow: verify customer, create account, send welcome email",
        status: "active",
        nodes: JSON.stringify([
          { id: "n1", type: "input", label: "New Customer", config: {}, position: { x: 50, y: 100 } },
          { id: "n2", type: "tool", label: "Verify Identity", config: { tool: "verify_customer" }, position: { x: 250, y: 100 } },
          { id: "n3", type: "condition", label: "Verified?", config: {}, position: { x: 450, y: 100 } },
          { id: "n4", type: "tool", label: "Create Account", config: { tool: "create_account" }, position: { x: 650, y: 60 } },
          { id: "n5", type: "llm", label: "Welcome Email", config: { model: "gpt-4o" }, position: { x: 850, y: 60 } },
          { id: "n6", type: "output", label: "Onboarded", config: {}, position: { x: 1050, y: 60 } },
        ]),
        edges: JSON.stringify([
          { id: "e1", source: "n1", target: "n2" },
          { id: "e2", source: "n2", target: "n3" },
          { id: "e3", source: "n3", target: "n4", label: "Yes" },
          { id: "e4", source: "n4", target: "n5" },
          { id: "e5", source: "n5", target: "n6" },
        ]),
        userId: user.id,
      },
    }),
    db.workflow.create({
      data: {
        name: "Document Processing Pipeline",
        description: "Upload, extract, chunk, embed, index, notify",
        status: "active",
        nodes: JSON.stringify([
          { id: "w2n1", type: "input", label: "Document Upload", config: {}, position: { x: 50, y: 100 } },
          { id: "w2n2", type: "tool", label: "Extract Text", config: { tool: "extract_text" }, position: { x: 250, y: 100 } },
          { id: "w2n3", type: "tool", label: "Chunk Document", config: { tool: "chunk_text" }, position: { x: 450, y: 100 } },
          { id: "w2n4", type: "tool", label: "Generate Embeddings", config: { tool: "embed" }, position: { x: 650, y: 100 } },
          { id: "w2n5", type: "output", label: "Indexed", config: {}, position: { x: 850, y: 100 } },
        ]),
        edges: JSON.stringify([
          { id: "w2e1", source: "w2n1", target: "w2n2" },
          { id: "w2e2", source: "w2n2", target: "w2n3" },
          { id: "w2e3", source: "w2n3", target: "w2n4" },
          { id: "w2e4", source: "w2n4", target: "w2n5" },
        ]),
        userId: user.id,
      },
    }),
    db.workflow.create({
      data: {
        name: "Multi-Agent Research Pipeline",
        description: "Research agent, fact-checker, summarizer, report generator",
        status: "draft",
        nodes: JSON.stringify([
          { id: "w3n1", type: "input", label: "Research Topic", config: {}, position: { x: 50, y: 100 } },
          { id: "w3n2", type: "llm", label: "Research Agent", config: { model: "gpt-4o" }, position: { x: 250, y: 100 } },
          { id: "w3n3", type: "llm", label: "Fact Checker", config: { model: "claude-sonnet-4-20250514" }, position: { x: 500, y: 100 } },
          { id: "w3n4", type: "output", label: "Report", config: {}, position: { x: 750, y: 100 } },
        ]),
        edges: JSON.stringify([
          { id: "w3e1", source: "w3n1", target: "w3n2" },
          { id: "w3e2", source: "w3n2", target: "w3n3" },
          { id: "w3e3", source: "w3n3", target: "w3n4" },
        ]),
        userId: user.id,
      },
    }),
  ]);
  console.log(`Workflows: ${workflows.length}`);

  // Create workflow executions
  const execStatuses = ["success", "success", "success", "failed", "success"];
  for (let i = 0; i < 5; i++) {
    await db.workflowExecution.create({
      data: {
        workflowId: workflows[0].id,
        userId: user.id,
        status: execStatuses[i],
        durationMs: Math.floor(Math.random() * 5000) + 1000,
        triggeredBy: "manual",
        result: execStatuses[i] === "success" ? JSON.stringify({ processed: true }) : null,
        error: execStatuses[i] === "failed" ? "Timeout at node n3" : null,
      },
    });
  }
  console.log("Workflow executions seeded");

  // Create conversations
  const convos = await Promise.all([
    db.conversation.create({
      data: {
        title: "Q4 Revenue Analysis",
        model: "gpt-4o",
        knowledgeBaseId: kbs[0].id,
        userId: user.id,
      },
    }),
    db.conversation.create({
      data: {
        title: "API Integration Help",
        model: "claude-sonnet-4-20250514",
        userId: user.id,
      },
    }),
    db.conversation.create({
      data: {
        title: "Agent Configuration",
        model: "deepseek-chat",
        userId: user.id,
      },
    }),
    db.conversation.create({
      data: {
        title: "Security Compliance Review",
        model: "gpt-4o",
        userId: user.id,
      },
    }),
    db.conversation.create({
      data: {
        title: "Product Roadmap Planning",
        model: "claude-sonnet-4-20250514",
        userId: user.id,
      },
    }),
    db.conversation.create({
      data: {
        title: "Data Pipeline Optimization",
        model: "gemini-2.0-flash",
        userId: user.id,
      },
    }),
  ]);
  console.log(`Conversations: ${convos.length}`);

  // Create messages for first conversation
  await db.message.createMany({
    data: [
      { conversationId: convos[0].id, role: "user", content: "Can you analyze our Q4 revenue data and compare it with Q3?", tokens: 24 },
      { conversationId: convos[0].id, role: "assistant", content: "Based on the financial data, here's the Q4 revenue analysis:\n\n## Q4 2024 Revenue Summary\n\n| Metric | Q3 2024 | Q4 2024 | Change |\n|--------|---------|---------|--------|\n| Total Revenue | $2.4M | $3.1M | **+29.2%** |\n| New Customers | 142 | 189 | **+33.1%** |\n| MRR | $820K | $1.03M | **+25.6%** |\n\n### Key Insights\n\n1. **Strong growth trajectory** — Q4 saw the highest quarterly revenue\n2. **Customer acquisition** improved significantly with 33% more new customers\n3. **Enterprise segment** now accounts for 62% of total revenue", model: "gpt-4o", tokens: 287 },
      { conversationId: convos[0].id, role: "user", content: "What were the top 3 deals that closed in Q4?", tokens: 12 },
      { conversationId: convos[0].id, role: "assistant", content: "Here are the top 3 deals:\n\n1. **GlobalTech Solutions** — $480K ARR (Financial Services)\n2. **MediCare Analytics** — $320K ARR (Healthcare)\n3. **RetailMax Corp** — $210K ARR (E-commerce)\n\nCombined: **$1.01M ARR** — about **33%** of total Q4 revenue.", model: "gpt-4o", tokens: 198 },
    ],
  });

  // Messages for second conversation
  await db.message.createMany({
    data: [
      { conversationId: convos[1].id, role: "user", content: "How do I set up the RAG pipeline for our product docs?", tokens: 18 },
      { conversationId: convos[1].id, role: "assistant", content: "Here's how to set up the RAG pipeline:\n\n### Step 1: Create a Knowledge Base\n```bash\ncurl -X POST /api/rag/knowledge-bases \\\n  -H \"Authorization: Bearer $API_KEY\" \\\n  -d '{\"name\": \"Product Docs\"}'\n```\n\n### Step 2: Upload Documents\n```bash\ncurl -X POST /api/documents/upload \\\n  -F \"file=@product-docs.pdf\"\n```\n\n### Step 3: Configure Your Agent\nSet the knowledge_base_id in your agent configuration.", model: "claude-sonnet-4-20250514", tokens: 156 },
    ],
  });
  console.log("Messages seeded");

  // Create LLM usage data
  const usageData = [
    { date: "2025-01-14", tokens: 245000, cost: 12.5, requests: 320, model: "gpt-4o" },
    { date: "2025-01-15", tokens: 312000, cost: 16.8, requests: 410, model: "gpt-4o" },
    { date: "2025-01-16", tokens: 287000, cost: 14.2, requests: 380, model: "gpt-4o" },
    { date: "2025-01-17", tokens: 356000, cost: 19.1, requests: 450, model: "claude-sonnet" },
    { date: "2025-01-18", tokens: 198000, cost: 10.3, requests: 260, model: "deepseek-chat" },
    { date: "2025-01-19", tokens: 423000, cost: 22.7, requests: 520, model: "gpt-4o" },
    { date: "2025-01-20", tokens: 389000, cost: 20.5, requests: 490, model: "gpt-4o" },
  ];
  await db.lLMUsage.createMany({ data: usageData });
  console.log("LLM usage seeded");

  console.log("\n✅ Seed complete!");
}

seed()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());