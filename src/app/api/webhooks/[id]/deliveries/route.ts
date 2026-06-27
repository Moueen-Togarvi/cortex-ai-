import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const deliveries = await db.webhookDelivery.findMany({
      where: { webhookId: id },
      orderBy: { createdAt: "desc" },
      take: 50,
    });
    return NextResponse.json({ deliveries });
  } catch (error) {
    console.error("Failed to fetch deliveries:", error);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
