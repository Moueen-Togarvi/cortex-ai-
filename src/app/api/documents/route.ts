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

// GET /api/documents — List all documents with knowledge base name
export async function GET() {
  try {
    const documents = await db.document.findMany({
      include: { knowledgeBase: { select: { name: true } } },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(documents);
  } catch (error) {
    console.error("Error fetching documents:", error);
    return NextResponse.json(
      { error: "Failed to fetch documents" },
      { status: 500 }
    );
  }
}

// POST /api/documents — Upload / create a document
export async function POST(request: NextRequest) {
  try {
    const user = await getDefaultUser();
    const body = await request.json();

    const { name, type, size, knowledgeBaseId } = body;

    if (!name || !type || !knowledgeBaseId) {
      return NextResponse.json(
        { error: "name, type, and knowledgeBaseId are required" },
        { status: 400 }
      );
    }

    // Verify knowledge base exists
    const kb = await db.knowledgeBase.findUnique({ where: { id: knowledgeBaseId } });
    if (!kb) {
      return NextResponse.json(
        { error: "Knowledge base not found" },
        { status: 404 }
      );
    }

    const document = await db.document.create({
      data: {
        name,
        type,
        size: size ?? 0,
        status: "processing",
        knowledgeBaseId,
        userId: user.id,
      },
    });

    // Simulate async processing — after 3s mark as ready with random chunks
    const docId = document.id;
    setTimeout(async () => {
      try {
        const chunks = Math.floor(Math.random() * 131) + 20; // 20-150
        await db.document.update({
          where: { id: docId },
          data: { status: "ready", chunks },
        });
      } catch {
        // Silently ignore update errors (e.g. doc deleted before timeout)
      }
    }, 3000);

    return NextResponse.json(document, { status: 201 });
  } catch (error) {
    console.error("Error creating document:", error);
    return NextResponse.json(
      { error: "Failed to create document" },
      { status: 500 }
    );
  }
}
