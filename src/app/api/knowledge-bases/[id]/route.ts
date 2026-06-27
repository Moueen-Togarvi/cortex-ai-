import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

// GET /api/knowledge-bases/:id — Get a KB with its documents
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const kb = await db.knowledgeBase.findUnique({
      where: { id },
      include: {
        documents: {
          orderBy: { createdAt: "desc" },
        },
        _count: { select: { conversations: true } },
        user: { select: { name: true, email: true } },
      },
    });

    if (!kb) {
      return NextResponse.json(
        { error: "Knowledge base not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(kb);
  } catch (error) {
    console.error("Error fetching knowledge base:", error);
    return NextResponse.json(
      { error: "Failed to fetch knowledge base" },
      { status: 500 }
    );
  }
}

// PUT /api/knowledge-bases/:id — Update a KB
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();

    const { name, description, embeddingModel, status } = body;

    // Verify the KB exists
    const existing = await db.knowledgeBase.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json(
        { error: "Knowledge base not found" },
        { status: 404 }
      );
    }

    const updated = await db.knowledgeBase.update({
      where: { id },
      data: {
        ...(name && { name }),
        ...(description !== undefined && { description }),
        ...(embeddingModel && { embeddingModel }),
        ...(status && { status }),
      },
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error("Error updating knowledge base:", error);
    return NextResponse.json(
      { error: "Failed to update knowledge base" },
      { status: 500 }
    );
  }
}

// DELETE /api/knowledge-bases/:id — Delete a KB (cascade deletes documents)
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const kb = await db.knowledgeBase.findUnique({ where: { id } });
    if (!kb) {
      return NextResponse.json(
        { error: "Knowledge base not found" },
        { status: 404 }
      );
    }

    await db.knowledgeBase.delete({ where: { id } });

    return NextResponse.json({ message: "Knowledge base deleted successfully" });
  } catch (error) {
    console.error("Error deleting knowledge base:", error);
    return NextResponse.json(
      { error: "Failed to delete knowledge base" },
      { status: 500 }
    );
  }
}
