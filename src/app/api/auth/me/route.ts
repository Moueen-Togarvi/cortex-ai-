import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth";

// GET /api/auth/me — Get the currently authenticated user
export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get("authorization");
    const user = await getAuthUser(authHeader);

    if (!user) {
      return NextResponse.json(
        { error: "Invalid or expired token" },
        { status: 401 },
      );
    }

    return NextResponse.json(user);
  } catch (error) {
    console.error("Failed to get current user:", error);
    return NextResponse.json(
      { error: "Failed to get current user" },
      { status: 500 },
    );
  }
}
