import { db } from "@/server/db/client";
import { getIndustryConfig } from "@/config/industries";
import { AppError } from "@/lib/errors";

/**
 * Quotations and Orders both need "look up a catalogue item and copy its
 * current name/price" regardless of whether the business sells Products
 * or Services (`IndustryConfig.catalogueType`) — one lookup, used by
 * both, instead of duplicating the Product-vs-Service branch in each.
 */
export async function lookupCatalogueItem(businessId: string, catalogueItemId: string) {
  const business = await db.business.findUniqueOrThrow({ where: { id: businessId } });
  const catalogueType = getIndustryConfig(business.industry).catalogueType;

  if (catalogueType === "services") {
    const service = await db.service.findFirst({ where: { id: catalogueItemId, businessId } });
    if (!service) throw new AppError("That item couldn't be found.");
    return {
      productId: null as string | null,
      serviceId: service.id as string | null,
      description: service.name,
      unitPrice: service.price,
    };
  }

  const product = await db.product.findFirst({ where: { id: catalogueItemId, businessId } });
  if (!product) throw new AppError("That item couldn't be found.");
  return {
    productId: product.id as string | null,
    serviceId: null as string | null,
    description: product.name,
    unitPrice: product.price,
  };
}
