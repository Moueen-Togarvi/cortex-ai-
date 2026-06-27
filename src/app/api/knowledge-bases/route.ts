import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

async function getDefaultUser() {
  let user = await db.user.findFirst();
  if (!user) {
    user = await db.user.create({
      data: { email: "admin@aiplatform.com", name: "Ahmed Khan", role: "admin" },
    });
  }
  return user;
}

// GET /api/knowledge-bases — List all knowledge bases with document & conversation counts
export async function GET() {
  try {
    const kbs = await db.knowledgeBase.findMany({
      include: {
        _count: { select: { documents: true, conversations: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(kbs);
  } catch (error) {
    console.error("Error fetching knowledge bases:", error);
    return NextResponse.json(
      { error: "Failed to fetch knowledge bases" },
      { status: 500 }
    );
  }
}

// POST /api/knowledge-bases — Create a new knowledge base
export async function POST(request: NextRequest) {
  try {
    const user = await getDefaultUser();
    const body = await request.json();

    const { name, description, embeddingModel } = body;

    if (!name) {
      return NextResponse.json(
        { error: "name is required" },
        { status: 400 }
      );
    }

    const knowledgeBase = await db.knowledgeBase.create({
      data: {
        name,
        description: description ?? null,
        embeddingModel: embeddingModel ?? "text-embedding-3-small",
        status: "active",
        userId: user.id,
      },
    });

    return NextResponse.json(knowledgeBase, { status: 201 });
  } catch (error) {
    console.error("Error creating knowledge base:", error);
    return NextResponse.json(
      { error: "Failed to create knowledge base" },
      { status: 500 }
    );
  }
}
