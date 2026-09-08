import { db } from "@/server/db/client";
import { ForbiddenError, NotFoundError } from "@/lib/errors";
import { can } from "@/server/authorization/permissions";
import type { OrgRole } from "@prisma/client";
import { writeAuditLog } from "@/services/audit/log";
import type { AdjustInventoryInput } from "@/lib/validation/products";

/**
 * checkInventory (the AI tool) only ever reads InventoryItem — this is
 * the one write path, same "single source of truth" reasoning as
 * AuditLog's writeAuditLog().
 */
export async function adjustInventory(
  businessId: string,
  actorRole: OrgRole,
  input: AdjustInventoryInput,
) {
  if (!can(actorRole, "catalogue:manage")) {
    throw new ForbiddenError("You don't have access to manage the catalogue.");
  }

  const item = await db.inventoryItem.findFirst({
    where: { id: input.inventoryItemId, businessId },
  });
  if (!item) {
    throw new NotFoundError("That inventory record couldn't be found.");
  }

  const updated = await db.inventoryItem.update({
    where: { id: item.id },
    data: { quantityOnHand: input.quantityOnHand },
  });

  await writeAuditLog({
    action: "inventory.adjusted",
    businessId,
    metadata: { inventoryItemId: item.id, from: item.quantityOnHand, to: input.quantityOnHand },
  });

  return updated;
}
