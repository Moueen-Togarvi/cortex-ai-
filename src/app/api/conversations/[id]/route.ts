import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

// GET /api/conversations/:id — Get conversation with all messages
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const conversation = await db.conversation.findUnique({
      where: { id },
      include: {
        messages: {
          orderBy: { createdAt: "asc" },
        },
      },
    });

    if (!conversation) {
      return NextResponse.json(
        { error: "Conversation not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(conversation);
  } catch (error) {
    console.error("Failed to get conversation:", error);
    return NextResponse.json(
      { error: "Failed to get conversation" },
      { status: 500 }
    );
  }
}

// DELETE /api/conversations/:id — Delete conversation (cascade deletes messages)
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const existing = await db.conversation.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json(
        { error: "Conversation not found" },
        { status: 404 }
      );
    }

    await db.conversation.delete({ where: { id } });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to delete conversation:", error);
    return NextResponse.json(
      { error: "Failed to delete conversation" },
      { status: 500 }
    );
  }
}
