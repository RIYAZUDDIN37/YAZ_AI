import { db } from "@/server/db/client";
import { ForbiddenError, NotFoundError } from "@/lib/errors";
import { can } from "@/server/authorization/permissions";
import type { OrgRole } from "@prisma/client";
import { writeAuditLog } from "@/services/audit/log";
import type { UpdateCustomerInput } from "@/lib/validation/customers";

export async function updateCustomer(
  businessId: string,
  actorRole: OrgRole,
  input: UpdateCustomerInput,
) {
  if (!can(actorRole, "customers:manage")) {
    throw new ForbiddenError("You don't have access to manage customers.");
  }

  const existing = await db.customer.findFirst({
    where: { id: input.customerId, businessId },
  });
  if (!existing) {
    throw new NotFoundError("That customer couldn't be found.");
  }

  const customer = await db.customer.update({
    where: { id: existing.id },
    data: {
      name: input.name,
      email: input.email || null,
      phone: input.phone || null,
      source: input.source || null,
    },
  });

  await writeAuditLog({
    action: "customer.updated",
    businessId,
    metadata: { customerId: customer.id },
  });

  return customer;
}
