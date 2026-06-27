import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { hashPassword, generateToken } from "@/lib/auth";
import { logAudit } from "@/lib/audit";

// POST /api/auth/register — Register a new user
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, password, name } = body as {
      email?: string;
      password?: string;
      name?: string;
    };

    // Validate required fields
    if (!email) {
      return NextResponse.json(
        { error: "Email is required" },
        { status: 400 },
      );
    }

    if (!password || password.length < 6) {
      return NextResponse.json(
        { error: "Password must be at least 6 characters" },
        { status: 400 },
      );
    }

    if (!name) {
      return NextResponse.json(
        { error: "Name is required" },
        { status: 400 },
      );
    }

    // Check if email already exists
    const existing = await db.user.findUnique({ where: { email } });
    if (existing) {
      return NextResponse.json(
        { error: "Email already registered" },
        { status: 409 },
      );
    }

    // Hash password and create user
    const hashedPassword = await hashPassword(password);

    const user = await db.user.create({
      data: {
        email,
        name,
        password: hashedPassword,
        role: "user",
      },
    });

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
      action: "register",
      resource: "users",
      resourceId: user.id,
      ipAddress: request.headers.get("x-forwarded-for") ?? undefined,
      userAgent: request.headers.get("user-agent") ?? undefined,
    });

    return NextResponse.json(
      {
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          avatar: user.avatar,
        },
        token,
      },
      { status: 201 },
    );
  } catch (error) {
    console.error("Failed to register:", error);
    return NextResponse.json(
      { error: "Failed to register" },
      { status: 500 },
    );
  }
}
