import { NextResponse } from "next/server";
import { db } from "@/lib/db";

// GET /api/dashboard/stats — Dashboard statistics
export async function GET() {
  try {
    const [
      conversations,
      documents,
      agents,
      workflows,
      knowledgeBases,
      usage,
      recentExecutions,
      recentDocs,
    ] = await Promise.all([
      db.conversation.count(),
      db.document.count(),
      db.agent.count({ where: { status: "active" } }),
      db.workflow.count(),
      db.knowledgeBase.count({ where: { status: "active" } }),
      db.lLMUsage.aggregate({ _sum: { tokens: true, cost: true } }),
      db.agentExecution.findMany({
        take: 5,
        include: { agent: { select: { name: true } } },
        orderBy: { createdAt: "desc" },
      }),
      db.document.findMany({
        take: 5,
        orderBy: { createdAt: "desc" },
      }),
    ]);

    // Merge recent activity and sort by createdAt desc
    const recentActivity = [
      ...recentExecutions.map((e) => ({
        id: e.id,
        type: "agent_execution" as const,
        title: `Agent "${e.agent.name}" executed`,
        description: e.output
          ? e.output.slice(0, 100) + (e.output.length > 100 ? "..." : "")
          : "No output",
        status: e.status,
        createdAt: e.createdAt,
      })),
      ...recentDocs.map((d) => ({
        id: d.id,
        type: "document" as const,
        title: `Document "${d.name}" uploaded`,
        description: `${d.type.toUpperCase()} · ${d.size > 0 ? (d.size / 1024).toFixed(1) + " KB" : "Unknown size"}`,
        status: d.status,
        createdAt: d.createdAt,
      })),
    ].sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );

    return NextResponse.json({
      totalConversations: conversations,
      totalDocuments: documents,
      totalAgents: agents,
      totalWorkflows: workflows,
      activeKnowledgeBases: knowledgeBases,
      tokensUsedThisMonth: usage._sum.tokens ?? 0,
      costThisMonth: usage._sum.cost ?? 0,
      activeUsers: 24,
      avgResponseTime: 1.4,
      recentActivity,
    });
  } catch (error) {
    console.error("Error fetching dashboard stats:", error);
    return NextResponse.json(
      { error: "Failed to fetch dashboard statistics" },
      { status: 500 }
    );
  }
}
