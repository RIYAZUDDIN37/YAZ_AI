import { db } from "@/server/db/client";
import { ForbiddenError, NotFoundError, AppError } from "@/lib/errors";
import { can } from "@/server/authorization/permissions";
import type { OrgRole } from "@prisma/client";
import { lookupCatalogueItem } from "@/services/commerce/catalogue-lookup";
import type { AddOrderItemInput, RemoveOrderItemInput } from "@/lib/validation/orders";

function requireAccess(actorRole: OrgRole) {
  if (!can(actorRole, "customers:manage")) {
    throw new ForbiddenError("You don't have access to manage orders.");
  }
}

async function requireEditableOrder(businessId: string, orderId: string) {
  const order = await db.order.findFirst({ where: { id: orderId, businessId } });
  if (!order) {
    throw new NotFoundError("That order couldn't be found.");
  }
  if (order.status === "CANCELLED") {
    throw new AppError("This order is cancelled — its items are locked.");
  }
  return order;
}

export async function addOrderItem(
  businessId: string,
  actorRole: OrgRole,
  input: AddOrderItemInput,
) {
  requireAccess(actorRole);
  await requireEditableOrder(businessId, input.orderId);

  const item = await lookupCatalogueItem(businessId, input.catalogueItemId);

  return db.orderItem.create({
    data: {
      orderId: input.orderId,
      productId: item.productId,
      serviceId: item.serviceId,
      description: item.description,
      quantity: input.quantity,
      unitPrice: item.unitPrice,
    },
  });
}

export async function removeOrderItem(
  businessId: string,
  actorRole: OrgRole,
  input: RemoveOrderItemInput,
) {
  requireAccess(actorRole);

  const item = await db.orderItem.findFirst({
    where: { id: input.itemId, order: { businessId } },
    include: { order: true },
  });
  if (!item) {
    throw new NotFoundError("That item couldn't be found.");
  }
  if (item.order.status === "CANCELLED") {
    throw new AppError("This order is cancelled — its items are locked.");
  }

  await db.orderItem.delete({ where: { id: item.id } });
}
