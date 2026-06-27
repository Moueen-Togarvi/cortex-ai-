import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET() {
  try {
    const webhooks = await db.webhook.findMany({
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json(webhooks);
  } catch (error) {
    console.error("Failed to fetch webhooks:", error);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const { name, url, events } = await request.json();
    if (!name || !url) return NextResponse.json({ error: "Name and URL are required" }, { status: 400 });

    const user = await db.user.findFirst();
    if (!user) return NextResponse.json({ error: "No user found" }, { status: 400 });

    const webhook = await db.webhook.create({
      data: {
        name,
        url,
        events: JSON.stringify(events || []),
        userId: user.id,
      },
    });

    return NextResponse.json(webhook, { status: 201 });
  } catch (error) {
    console.error("Failed to create webhook:", error);
    return NextResponse.json({ error: "Failed to create webhook" }, { status: 500 });
  }
}
