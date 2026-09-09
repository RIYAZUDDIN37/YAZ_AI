import { db } from "@/server/db/client";
import { ForbiddenError, NotFoundError, AppError } from "@/lib/errors";
import { can } from "@/server/authorization/permissions";
import type { OrgRole } from "@prisma/client";
import { writeAuditLog } from "@/services/audit/log";

export async function convertQuotationToOrder(
  businessId: string,
  actorRole: OrgRole,
  quotationId: string,
) {
  if (!can(actorRole, "customers:manage")) {
    throw new ForbiddenError("You don't have access to manage quotations.");
  }

  const quotation = await db.quotation.findFirst({
    where: { id: quotationId, businessId },
    include: { items: true, order: true },
  });
  if (!quotation) {
    throw new NotFoundError("That quotation couldn't be found.");
  }
  if (quotation.status !== "ACCEPTED") {
    throw new AppError("Only an accepted quotation can be converted to an order.");
  }
  if (quotation.order) {
    throw new AppError("This quotation already has an order.");
  }
  if (quotation.items.length === 0) {
    throw new AppError("This quotation has no items to order.");
  }

  const order = await db.order.create({
    data: {
      businessId,
      customerId: quotation.customerId,
      quotationId: quotation.id,
      status: "PENDING",
      items: {
        create: quotation.items.map((item) => ({
          productId: item.productId,
          serviceId: item.serviceId,
          description: item.description,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
        })),
      },
    },
  });

  await writeAuditLog({
    action: "order.created_from_quotation",
    businessId,
    metadata: { orderId: order.id, quotationId: quotation.id },
  });

  return order;
}
