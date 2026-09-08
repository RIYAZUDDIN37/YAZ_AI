import { db } from "@/server/db/client";
import { ForbiddenError, NotFoundError } from "@/lib/errors";
import { can } from "@/server/authorization/permissions";
import type { OrgRole } from "@prisma/client";
import { writeAuditLog } from "@/services/audit/log";
import type { UpdateLeadStatusInput } from "@/lib/validation/leads";

const STATUS_LABEL: Record<UpdateLeadStatusInput["status"], string> = {
  NEW: "New",
  QUALIFIED: "Qualified",
  CONTACTED: "Contacted",
  APPOINTMENT: "Appointment",
  PROPOSAL: "Proposal",
  WON: "Won",
  LOST: "Lost",
};

export async function updateLeadStatus(
  businessId: string,
  actorRole: OrgRole,
  input: UpdateLeadStatusInput,
) {
  if (!can(actorRole, "customers:manage")) {
    throw new ForbiddenError("You don't have access to manage leads.");
  }

  const lead = await db.lead.findFirst({ where: { id: input.leadId, businessId } });
  if (!lead) {
    throw new NotFoundError("That lead couldn't be found.");
  }
  if (lead.status === input.status) {
    return lead;
  }

  const updated = await db.lead.update({
    where: { id: lead.id },
    data: {
      status: input.status,
      activities: {
        create: {
          type: "status_change",
          body: `Status changed from ${STATUS_LABEL[lead.status]} to ${STATUS_LABEL[input.status]}.`,
        },
      },
    },
  });

  await writeAuditLog({
    action: "lead.status_changed",
    businessId,
    metadata: { leadId: lead.id, from: lead.status, to: input.status },
  });

  return updated;
}
