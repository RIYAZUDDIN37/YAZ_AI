import { db } from "@/server/db/client";
import { ForbiddenError, NotFoundError } from "@/lib/errors";
import { can } from "@/server/authorization/permissions";
import type { OrgRole } from "@prisma/client";
import type { AddCustomerNoteInput } from "@/lib/validation/customers";

export async function addCustomerNote(
  businessId: string,
  actorUserId: string,
  actorRole: OrgRole,
  input: AddCustomerNoteInput,
) {
  if (!can(actorRole, "customers:manage")) {
    throw new ForbiddenError("You don't have access to manage customers.");
  }

  const customer = await db.customer.findFirst({
    where: { id: input.customerId, businessId },
  });
  if (!customer) {
    throw new NotFoundError("That customer couldn't be found.");
  }

  return db.customerNote.create({
    data: {
      customerId: customer.id,
      authorUserId: actorUserId,
      body: input.body,
    },
  });
}
