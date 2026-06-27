import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { seedDefaultGuardrailPolicies } from "@/lib/guardrails";

let seeded = false;

export async function GET(_request: NextRequest) {
  try {
    // Lazy seed on first request (fire-and-forget)
    if (!seeded) {
      seeded = true;
      seedDefaultGuardrailPolicies().catch(() => {});
    }

    const policies = await db.guardrailPolicy.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        _count: { select: { evals: true } },
      },
    });

    return NextResponse.json({ data: policies });
  } catch (error) {
    console.error("Guardrail policies list error:", error);
    return NextResponse.json(
      { error: "Failed to fetch guardrail policies" },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const { name, description, type, enabled, scope, config, severity, action } = body;

    if (!name || !type) {
      return NextResponse.json(
        { error: "name and type are required" },
        { status: 400 },
      );
    }

    const policy = await db.guardrailPolicy.create({
      data: {
        name,
        description: description ?? null,
        type,
        enabled: enabled ?? true,
        scope: scope ?? "all",
        config: typeof config === "object" ? JSON.stringify(config) : (config ?? "{}"),
        severity: severity ?? "medium",
        action: action ?? "flag",
      },
    });

    return NextResponse.json({ data: policy }, { status: 201 });
  } catch (error) {
    console.error("Create guardrail policy error:", error);
    return NextResponse.json(
      { error: "Failed to create guardrail policy" },
      { status: 500 },
    );
  }
}