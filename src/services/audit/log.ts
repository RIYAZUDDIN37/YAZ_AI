import type { Prisma } from "@prisma/client";
import { db } from "@/server/db/client";

interface WriteAuditLogInput {
  action: string;
  userId?: string;
  organizationId?: string;
  businessId?: string;
  metadata?: Prisma.InputJsonValue;
}

/**
 * Every consequential action in the app (signup, onboarding, and — from
 * Phase 7 onward — every agent decision and tool execution) writes one row
 * here. This is the backbone of the "AI Activity" / audit trail feature
 * (spec section 18) and of security accountability (section 33) — it is
 * intentionally the one place that writes to AuditLog.
 */
export async function writeAuditLog(input: WriteAuditLogInput): Promise<void> {
  await db.auditLog.create({
    data: {
      action: input.action,
      userId: input.userId,
      organizationId: input.organizationId,
      businessId: input.businessId,
      metadata: input.metadata,
    },
  });
}
