import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;

    const policy = await db.guardrailPolicy.findUnique({
      where: { id },
      include: {
        _count: { select: { evals: true } },
      },
    });

    if (!policy) {
      return NextResponse.json(
        { error: "Guardrail policy not found" },
        { status: 404 },
      );
    }

    return NextResponse.json({ data: policy });
  } catch (error) {
    console.error("Get guardrail policy error:", error);
    return NextResponse.json(
      { error: "Failed to fetch guardrail policy" },
      { status: 500 },
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const body = await request.json();

    const existing = await db.guardrailPolicy.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json(
        { error: "Guardrail policy not found" },
        { status: 404 },
      );
    }

    const { name, description, type, enabled, scope, config, severity, action } = body;

    const policy = await db.guardrailPolicy.update({
      where: { id },
      data: {
        ...(name !== undefined && { name }),
        ...(description !== undefined && { description: description ?? null }),
        ...(type !== undefined && { type }),
        ...(enabled !== undefined && { enabled }),
        ...(scope !== undefined && { scope }),
        ...(config !== undefined && {
          config: typeof config === "object" ? JSON.stringify(config) : config,
        }),
        ...(severity !== undefined && { severity }),
        ...(action !== undefined && { action }),
      },
    });

    return NextResponse.json({ data: policy });
  } catch (error) {
    console.error("Update guardrail policy error:", error);
    return NextResponse.json(
      { error: "Failed to update guardrail policy" },
      { status: 500 },
    );
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;

    const existing = await db.guardrailPolicy.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json(
        { error: "Guardrail policy not found" },
        { status: 404 },
      );
    }

    // Note: GuardrailEval records are deleted via cascade on the schema relation
    // If cascade is not configured at DB level, delete evals first
    try {
      await db.guardrailEval.deleteMany({ where: { policyId: id } });
    } catch {
      // evals may already be cascaded
    }

    await db.guardrailPolicy.delete({ where: { id } });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Delete guardrail policy error:", error);
    return NextResponse.json(
      { error: "Failed to delete guardrail policy" },
      { status: 500 },
    );
  }
}