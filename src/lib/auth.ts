import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { db } from "./db";

const JWT_SECRET = process.env.JWT_SECRET || (
  process.env.NODE_ENV === "production"
    ? (() => { throw new Error("JWT_SECRET environment variable is required in production!"); })()
    : "enterprise-ai-platform-secret-key-2024"
);
const JWT_EXPIRES_IN = "7d";

// Hash password
export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 12);
}

// Compare password
export async function comparePassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

// Generate JWT token
export function generateToken(userId: string, role: string): string {
  return jwt.sign({ userId, role }, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
}

// Verify JWT token - returns payload or null
export function verifyToken(token: string): { userId: string; role: string } | null {
  try {
    return jwt.verify(token, JWT_SECRET) as { userId: string; role: string };
  } catch {
    return null;
  }
}

// Extract Bearer token from request header
export function extractToken(authHeader: string | null): string | null {
  if (!authHeader?.startsWith("Bearer ")) return null;
  return authHeader.slice(7);
}

// Get authenticated user from request - used in API routes
export async function getAuthUser(authHeader: string | null) {
  const token = extractToken(authHeader);
  if (!token) return null;
  const payload = verifyToken(token);
  if (!payload) return null;
  const user = await db.user.findUnique({
    where: { id: payload.userId },
    select: { id: true, email: true, name: true, role: true, avatar: true },
  });
  return user;
}

// Seed default admin user if none exists (call on app startup)
export async function seedDefaultUser() {
  const existing = await db.user.findFirst();
  if (existing) return;
  const adminEmail = process.env.DEFAULT_ADMIN_EMAIL || "admin@aiplatform.com";
  const adminPassword = process.env.DEFAULT_ADMIN_PASSWORD || "admin123";
  const hashedPassword = await hashPassword(adminPassword);
  await db.user.create({
    data: {
      email: adminEmail,
      name: "Admin User",
      password: hashedPassword,
      role: "admin",
    },
  });
}
