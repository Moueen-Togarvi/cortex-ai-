import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { comparePassword, generateToken } from "@/lib/auth";
import { logAudit } from "@/lib/audit";

// POST /api/auth/login — Authenticate user and return JWT
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, password } = body as { email?: string; password?: string };

    if (!email || !password) {
      return NextResponse.json(
        { error: "Email and password are required" },
        { status: 400 },
      );
    }

    const user = await db.user.findUnique({ where: { email } });

    if (!user || !user.password) {
      return NextResponse.json(
        { error: "Invalid credentials" },
        { status: 401 },
      );
    }

    const valid = await comparePassword(password, user.password);
    if (!valid) {
      return NextResponse.json(
        { error: "Invalid credentials" },
        { status: 401 },
      );
    }

    const token = generateToken(user.id, user.role);

    // Create session record in DB
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    await db.session.create({
      data: {
        userId: user.id,
        token,
        expiresAt,
      },
    });

    // Log audit event
    await logAudit({
      userId: user.id,
      action: "login",
      resource: "sessions",
      ipAddress: request.headers.get("x-forwarded-for") ?? undefined,
      userAgent: request.headers.get("user-agent") ?? undefined,
    });

    return NextResponse.json({
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        avatar: user.avatar,
      },
      token,
    });
  } catch (error) {
    console.error("Failed to login:", error);
    return NextResponse.json(
      { error: "Failed to login" },
      { status: 500 },
    );
  }
}
