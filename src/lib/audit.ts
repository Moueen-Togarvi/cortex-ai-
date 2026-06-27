import { db } from "./db";

export async function logAudit(params: {
  userId?: string;
  action: string;
  resource?: string;
  resourceId?: string;
  details?: Record<string, unknown>;
  ipAddress?: string;
  userAgent?: string;
}) {
  try {
    await db.auditLog.create({
      data: {
        userId: params.userId,
        action: params.action,
        resource: params.resource,
        resourceId: params.resourceId,
        details: params.details ? JSON.stringify(params.details) : null,
        ipAddress: params.ipAddress,
        userAgent: params.userAgent,
      },
    });
  } catch (error) {
    console.error("Failed to write audit log:", error);
  }
}
