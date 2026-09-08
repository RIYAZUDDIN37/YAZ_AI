import { db } from "@/server/db/client";
import { ForbiddenError, NotFoundError } from "@/lib/errors";
import { can } from "@/server/authorization/permissions";
import type { OrgRole } from "@prisma/client";
import type { AddLeadNoteInput } from "@/lib/validation/leads";

export async function addLeadNote(
  businessId: string,
  actorRole: OrgRole,
  input: AddLeadNoteInput,
) {
  if (!can(actorRole, "customers:manage")) {
    throw new ForbiddenError("You don't have access to manage leads.");
  }

  const lead = await db.lead.findFirst({ where: { id: input.leadId, businessId } });
  if (!lead) {
    throw new NotFoundError("That lead couldn't be found.");
  }

  return db.leadActivity.create({
    data: { leadId: lead.id, type: "note", body: input.body },
  });
}
