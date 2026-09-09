import { db } from "@/server/db/client";
import { ForbiddenError, NotFoundError, AppError } from "@/lib/errors";
import { can } from "@/server/authorization/permissions";
import type { OrgRole } from "@prisma/client";
import { lookupCatalogueItem } from "@/services/commerce/catalogue-lookup";
import type { AddQuotationItemInput, RemoveQuotationItemInput } from "@/lib/validation/quotations";

function requireAccess(actorRole: OrgRole) {
  if (!can(actorRole, "customers:manage")) {
    throw new ForbiddenError("You don't have access to manage quotations.");
  }
}

async function requireEditableQuotation(businessId: string, quotationId: string) {
  const quotation = await db.quotation.findFirst({ where: { id: quotationId, businessId } });
  if (!quotation) {
    throw new NotFoundError("That quotation couldn't be found.");
  }
  if (quotation.status !== "DRAFT") {
    throw new AppError("Only a draft quotation can be edited — its items are locked once sent.");
  }
  return quotation;
}

export async function addQuotationItem(
  businessId: string,
  actorRole: OrgRole,
  input: AddQuotationItemInput,
) {
  requireAccess(actorRole);
  await requireEditableQuotation(businessId, input.quotationId);

  const item = await lookupCatalogueItem(businessId, input.catalogueItemId);

  return db.quotationItem.create({
    data: {
      quotationId: input.quotationId,
      productId: item.productId,
      serviceId: item.serviceId,
      description: item.description,
      quantity: input.quantity,
      unitPrice: item.unitPrice,
    },
  });
}

export async function removeQuotationItem(
  businessId: string,
  actorRole: OrgRole,
  input: RemoveQuotationItemInput,
) {
  requireAccess(actorRole);

  const item = await db.quotationItem.findFirst({
    where: { id: input.itemId, quotation: { businessId } },
    include: { quotation: true },
  });
  if (!item) {
    throw new NotFoundError("That item couldn't be found.");
  }
  if (item.quotation.status !== "DRAFT") {
    throw new AppError("Only a draft quotation can be edited — its items are locked once sent.");
  }

  await db.quotationItem.delete({ where: { id: item.id } });
}
