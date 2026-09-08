import { db } from "@/server/db/client";
import { ForbiddenError, NotFoundError } from "@/lib/errors";
import { can } from "@/server/authorization/permissions";
import type { OrgRole } from "@prisma/client";
import { writeAuditLog } from "@/services/audit/log";
import type { CreateLeadInput } from "@/lib/validation/leads";

/**
 * A staff member manually recording a lead — distinct from the AI's
 * createLead tool (src/services/ai/tools/create-lead.ts), which does the
 * same underlying write but from a conversation and is source-tagged
 * "AI conversation" rather than whatever the staff member picks here.
 */
export async function createLead(
  businessId: string,
  actorRole: OrgRole,
  input: CreateLeadInput,
) {
  if (!can(actorRole, "customers:manage")) {
    throw new ForbiddenError("You don't have access to manage leads.");
  }

  const customer = await db.customer.findFirst({
    where: { id: input.customerId, businessId },
  });
  if (!customer) {
    throw new NotFoundError("That customer couldn't be found.");
  }

  const lead = await db.lead.create({
    data: {
      businessId,
      customerId: customer.id,
      status: "NEW",
      source: input.source || customer.source,
      intent: input.intent,
      value: input.value,
      activities: {
        create: { type: "created", body: "Lead created." },
      },
    },
  });

  await writeAuditLog({
    action: "lead.created",
    businessId,
    metadata: { leadId: lead.id, customerId: customer.id },
  });

  return lead;
}
