import { db } from "@/server/db/client";
import { ForbiddenError, NotFoundError } from "@/lib/errors";
import { can } from "@/server/authorization/permissions";
import type { OrgRole } from "@prisma/client";
import { writeAuditLog } from "@/services/audit/log";
import type { UpdateOrderStatusInput } from "@/lib/validation/orders";

export async function updateOrderStatus(
  businessId: string,
  actorRole: OrgRole,
  input: UpdateOrderStatusInput,
) {
  if (!can(actorRole, "customers:manage")) {
    throw new ForbiddenError("You don't have access to manage orders.");
  }

  const order = await db.order.findFirst({ where: { id: input.orderId, businessId } });
  if (!order) {
    throw new NotFoundError("That order couldn't be found.");
  }

  const updated = await db.order.update({
    where: { id: order.id },
    data: { status: input.status },
  });

  await writeAuditLog({
    action: "order.status_changed",
    businessId,
    metadata: { orderId: order.id, from: order.status, to: input.status },
  });

  return updated;
}
