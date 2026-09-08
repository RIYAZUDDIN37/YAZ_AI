import { db } from "@/server/db/client";
import { ForbiddenError } from "@/lib/errors";
import { can } from "@/server/authorization/permissions";
import type { OrgRole } from "@prisma/client";
import { writeAuditLog } from "@/services/audit/log";
import type { CreateCustomerInput } from "@/lib/validation/customers";

export async function createCustomer(
  businessId: string,
  actorRole: OrgRole,
  input: CreateCustomerInput,
) {
  if (!can(actorRole, "customers:manage")) {
    throw new ForbiddenError("You don't have access to manage customers.");
  }

  const customer = await db.customer.create({
    data: {
      businessId,
      name: input.name,
      email: input.email || null,
      phone: input.phone || null,
      source: input.source || null,
    },
  });

  await writeAuditLog({
    action: "customer.created",
    businessId,
    metadata: { customerId: customer.id, name: customer.name },
  });

  return customer;
}
