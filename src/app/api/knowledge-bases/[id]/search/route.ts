import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { semanticSearch } from "@/lib/rag-pipeline";

// POST /api/knowledge-bases/:id/search — RAG semantic search
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { query } = body;
    const topK = body.topK ?? 5;

    if (!query || typeof query !== "string") {
      return NextResponse.json(
        { error: "query is required" },
        { status: 400 }
      );
    }

    // Verify the knowledge base exists
    const kb = await db.knowledgeBase.findUnique({
      where: { id },
      include: {
        _count: { select: { documents: true, chunks: true } },
      },
    });

    if (!kb) {
      return NextResponse.json(
        { error: "Knowledge base not found" },
        { status: 404 }
      );
    }

    // Perform real RAG semantic search
    const results = await semanticSearch(id, query, topK);

    return NextResponse.json({
      results,
      query,
      knowledgeBase: {
        id: kb.id,
        name: kb.name,
        documentCount: kb._count.documents,
        totalChunks: kb._count.chunks,
      },
    });
  } catch (error) {
    console.error("Error performing search:", error);
    return NextResponse.json(
      { error: "Failed to perform search" },
      { status: 500 }
    );
  }
}
