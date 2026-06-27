import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;

    const trace = await db.trace.findUnique({
      where: { id },
      include: {
        guardrailEvals: true,
      },
    });

    if (!trace) {
      return NextResponse.json({ error: "Trace not found" }, { status: 404 });
    }

    return NextResponse.json({ data: trace });
  } catch (error) {
    console.error("Trace detail error:", error);
    return NextResponse.json({ error: "Failed to fetch trace" }, { status: 500 });
  }
}