import { prisma } from "@/lib/prisma";
import { createFallbackAuditLog, listFallbackAuditLogs } from "./fallback-db";

export interface AuditLogInput {
  entityType: string;
  entityId: string;
  action: "CREATE" | "UPDATE" | "DELETE" | "COMPLIANCE_REVIEW" | "COMPLIANCE_OVERRIDE" | string;
  userId: string;
  userName: string;
  userRole: string;
  changes: Record<string, any>;
  ipAddress?: string | null;
}

export interface AuditLogRecord {
  id: string;
  entityType: string;
  entityId: string;
  action: string;
  userId: string;
  userName: string;
  userRole: string;
  changes: Record<string, any>;
  ipAddress: string | null;
  createdAt: string;
}

/**
 * Computes a field-by-field diff between two states, ignoring volatile timestamps.
 * Suitable for FDA 21 CFR Part 11 electronic records tracking.
 */
export function computeDiff(
  before: Record<string, any> | null | undefined,
  after: Record<string, any> | null | undefined
): { before: Record<string, any>; after: Record<string, any> } {
  const beforeObj = before || {};
  const afterObj = after || {};

  const ignoredKeys = new Set(["id", "created_at", "createdAt", "updated_at", "updatedAt"]);
  const allKeys = Array.from(new Set([...Object.keys(beforeObj), ...Object.keys(afterObj)]));

  const diffBefore: Record<string, any> = {};
  const diffAfter: Record<string, any> = {};

  for (const key of allKeys) {
    if (ignoredKeys.has(key)) continue;

    const valBefore = beforeObj[key];
    const valAfter = afterObj[key];

    // Normalize date strings vs Date objects for accurate comparison
    const normBefore = valBefore instanceof Date ? valBefore.toISOString().slice(0, 10) : valBefore;
    const normAfter = valAfter instanceof Date ? valAfter.toISOString().slice(0, 10) : valAfter;

    const serializedBefore = JSON.stringify(normBefore ?? null);
    const serializedAfter = JSON.stringify(normAfter ?? null);

    if (serializedBefore !== serializedAfter) {
      diffBefore[key] = normBefore;
      diffAfter[key] = normAfter;
    }
  }

  return { before: diffBefore, after: diffAfter };
}

/**
 * Records an immutable audit log entry in PostgreSQL (or SQLite fallback during dev).
 * In production (NODE_ENV=production), fail-fast is enforced if DB is unreachable.
 */
export async function recordAuditLog(input: AuditLogInput): Promise<AuditLogRecord> {
  try {
    const created = await prisma.auditLog.create({
      data: {
        entityType: input.entityType,
        entityId: input.entityId,
        action: input.action,
        userId: input.userId,
        userName: input.userName,
        userRole: input.userRole,
        changes: input.changes || {},
        ipAddress: input.ipAddress || null,
      },
    });

    return {
      id: created.id,
      entityType: created.entityType,
      entityId: created.entityId,
      action: created.action,
      userId: created.userId,
      userName: created.userName,
      userRole: created.userRole,
      changes: created.changes as Record<string, any>,
      ipAddress: created.ipAddress,
      createdAt: created.createdAt.toISOString(),
    };
  } catch (error) {
    if (process.env.NODE_ENV === "production") {
      console.error("FATAL: Failed to persist regulatory audit log in production:", error);
      throw error;
    }

    console.warn("PostgreSQL unavailable, saving audit log to local fallback store:", error);
    return createFallbackAuditLog(input);
  }
}

/**
 * Lists audit logs with optional filtering by entity and user.
 */
export async function listAuditLogs(filters?: {
  entityType?: string;
  entityId?: string;
  userId?: string;
  limit?: number;
}): Promise<AuditLogRecord[]> {
  try {
    const logs = await prisma.auditLog.findMany({
      where: {
        entityType: filters?.entityType,
        entityId: filters?.entityId,
        userId: filters?.userId,
      },
      orderBy: { createdAt: "desc" },
      take: filters?.limit || 50,
    });

    return logs.map((l) => ({
      id: l.id,
      entityType: l.entityType,
      entityId: l.entityId,
      action: l.action,
      userId: l.userId,
      userName: l.userName,
      userRole: l.userRole,
      changes: l.changes as Record<string, any>,
      ipAddress: l.ipAddress,
      createdAt: l.createdAt.toISOString(),
    }));
  } catch (error) {
    if (process.env.NODE_ENV === "production") {
      throw error;
    }

    return listFallbackAuditLogs(filters);
  }
}
