import { db } from "@/server/db/client";
import { ForbiddenError, NotFoundError } from "@/lib/errors";
import { can } from "@/server/authorization/permissions";
import type { OrgRole } from "@prisma/client";
import { writeAuditLog } from "@/services/audit/log";
import type { CreateOrderInput } from "@/lib/validation/orders";

export async function createOrder(
  businessId: string,
  actorRole: OrgRole,
  input: CreateOrderInput,
) {
  if (!can(actorRole, "customers:manage")) {
    throw new ForbiddenError("You don't have access to manage orders.");
  }

  const customer = await db.customer.findFirst({ where: { id: input.customerId, businessId } });
  if (!customer) {
    throw new NotFoundError("That customer couldn't be found.");
  }

  const order = await db.order.create({
    data: { businessId, customerId: customer.id, status: "PENDING" },
  });

  await writeAuditLog({
    action: "order.created",
    businessId,
    metadata: { orderId: order.id, customerId: customer.id },
  });

  return order;
}
