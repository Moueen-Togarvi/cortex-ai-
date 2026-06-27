import { NextResponse } from "next/server";
import { db } from "@/lib/db";

// GET /api/users — Return the current user (first user or create default)
export async function GET() {
  try {
    let user = await db.user.findFirst();

    if (!user) {
      user = await db.user.create({
        data: {
          email: "admin@aiplatform.com",
          name: "Ahmed Khan",
          role: "admin",
          avatar: null,
        },
      });
    }

    return NextResponse.json({
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      avatar: user.avatar,
      tenantName: "TechCorp Inc.",
      createdAt: user.createdAt,
      lastLogin: user.updatedAt,
    });
  } catch (error) {
    console.error("Error fetching user:", error);
    return NextResponse.json(
      { error: "Failed to fetch user" },
      { status: 500 }
    );
  }
}
