import { db } from "@/server/db/client";
import { ForbiddenError } from "@/lib/errors";
import { can } from "@/server/authorization/permissions";
import type { OrgRole } from "@prisma/client";
import { slugify } from "@/lib/slug";
import { writeAuditLog } from "@/services/audit/log";
import type { CreateProductInput } from "@/lib/validation/products";

async function uniqueProductSlug(businessId: string, name: string): Promise<string> {
  const root = slugify(name);
  let candidate = root;
  let suffix = 1;

  while (
    await db.product.findUnique({
      where: { businessId_slug: { businessId, slug: candidate } },
    })
  ) {
    suffix += 1;
    candidate = `${root}-${suffix}`;
  }

  return candidate;
}

export async function createProduct(
  businessId: string,
  actorRole: OrgRole,
  input: CreateProductInput,
) {
  if (!can(actorRole, "catalogue:manage")) {
    throw new ForbiddenError("You don't have access to manage the catalogue.");
  }

  const slug = await uniqueProductSlug(businessId, input.name);

  const product = await db.product.create({
    data: {
      businessId,
      categoryId: input.categoryId || null,
      name: input.name,
      slug,
      description: input.description || null,
      price: input.price,
      status: input.status,
      inventoryItems: {
        create: {
          businessId,
          sku: `${slug.toUpperCase()}-DEFAULT`,
          quantityOnHand: input.initialQuantity ?? 0,
        },
      },
    },
  });

  await writeAuditLog({
    action: "product.created",
    businessId,
    metadata: { productId: product.id, name: product.name },
  });

  return product;
}
