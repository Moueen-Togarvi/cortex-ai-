import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

// GET /api/conversations — List conversations with message count & last message preview
export async function GET() {
  try {
    const conversations = await db.conversation.findMany({
      include: {
        _count: { select: { messages: true } },
        messages: {
          take: 1,
          orderBy: { createdAt: "desc" },
          select: { content: true, createdAt: true },
        },
      },
      orderBy: { updatedAt: "desc" },
    });

    const result = conversations.map((c) => {
      const lastMsg = c.messages[0];
      return {
        id: c.id,
        title: c.title,
        model: c.model,
        knowledgeBaseId: c.knowledgeBaseId,
        temperature: c.temperature,
        userId: c.userId,
        createdAt: c.createdAt,
        updatedAt: c.updatedAt,
        messageCount: c._count.messages,
        lastMessage: lastMsg
          ? {
              content:
                lastMsg.content.length > 100
                  ? lastMsg.content.slice(0, 100) + "..."
                  : lastMsg.content,
              createdAt: lastMsg.createdAt,
            }
          : null,
      };
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error("Failed to list conversations:", error);
    return NextResponse.json(
      { error: "Failed to list conversations" },
      { status: 500 }
    );
  }
}

// POST /api/conversations — Create a new conversation
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { title, model, knowledgeBaseId, temperature } = body;

    // Default userId: first user (admin@aiplatform.com)
    const defaultUser = await db.user.findFirst({
      where: { email: "admin@aiplatform.com" },
      select: { id: true },
    });

    if (!defaultUser) {
      return NextResponse.json(
        { error: "Default user not found" },
        { status: 400 }
      );
    }

    const conversation = await db.conversation.create({
      data: {
        title: title ?? "New Chat",
        model: model ?? "gpt-4o",
        knowledgeBaseId: knowledgeBaseId ?? null,
        temperature: temperature ?? 0.7,
        userId: defaultUser.id,
      },
    });

    return NextResponse.json(conversation, { status: 201 });
  } catch (error) {
    console.error("Failed to create conversation:", error);
    return NextResponse.json(
      { error: "Failed to create conversation" },
      { status: 500 }
    );
  }
}
