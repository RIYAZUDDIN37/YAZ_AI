import { db } from "@/server/db/client";
import { ForbiddenError, NotFoundError } from "@/lib/errors";
import { can } from "@/server/authorization/permissions";
import type { OrgRole } from "@prisma/client";
import { writeAuditLog } from "@/services/audit/log";
import type { UpdateProductInput } from "@/lib/validation/products";

export async function updateProduct(
  businessId: string,
  actorRole: OrgRole,
  input: UpdateProductInput,
) {
  if (!can(actorRole, "catalogue:manage")) {
    throw new ForbiddenError("You don't have access to manage the catalogue.");
  }

  const existing = await db.product.findFirst({
    where: { id: input.productId, businessId },
  });
  if (!existing) {
    throw new NotFoundError("That product couldn't be found.");
  }

  const product = await db.product.update({
    where: { id: existing.id },
    data: {
      categoryId: input.categoryId || null,
      name: input.name,
      description: input.description || null,
      price: input.price,
      status: input.status,
    },
  });

  await writeAuditLog({
    action: "product.updated",
    businessId,
    metadata: { productId: product.id },
  });

  return product;
}
