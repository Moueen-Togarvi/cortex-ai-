import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { extractToken, verifyToken } from "@/lib/auth";
import { logAudit } from "@/lib/audit";

// POST /api/auth/logout — Invalidate the current session
export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get("authorization");
    const token = extractToken(authHeader);

    if (token) {
      // Try to identify user for audit logging
      const payload = verifyToken(token);
      const userId = payload?.userId;

      // Delete the session record from DB
      await db.session.deleteMany({ where: { token } });

      // Log audit event
      await logAudit({
        userId,
        action: "logout",
        resource: "sessions",
        ipAddress: request.headers.get("x-forwarded-for") ?? undefined,
        userAgent: request.headers.get("user-agent") ?? undefined,
      });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to logout:", error);
    return NextResponse.json(
      { error: "Failed to logout" },
      { status: 500 },
    );
  }
}
