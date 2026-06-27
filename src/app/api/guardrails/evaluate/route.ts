import { NextRequest, NextResponse } from "next/server";
import { evaluateGuardrails } from "@/lib/guardrails";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { text, scope } = body;

    if (!text || typeof text !== "string") {
      return NextResponse.json(
        { error: "text is required and must be a string" },
        { status: 400 },
      );
    }

    const result = await evaluateGuardrails(text, scope);

    return NextResponse.json({ data: result });
  } catch (error) {
    console.error("Guardrail evaluate error:", error);
    return NextResponse.json(
      { error: "Failed to evaluate guardrails" },
      { status: 500 },
    );
  }
}