import { db } from "@/server/db/client";
import { ForbiddenError, NotFoundError } from "@/lib/errors";
import { can } from "@/server/authorization/permissions";
import type { OrgRole } from "@prisma/client";
import { writeAuditLog } from "@/services/audit/log";
import type { UpdateServiceInput } from "@/lib/validation/services";

export async function updateService(
  businessId: string,
  actorRole: OrgRole,
  input: UpdateServiceInput,
) {
  if (!can(actorRole, "catalogue:manage")) {
    throw new ForbiddenError("You don't have access to manage the catalogue.");
  }

  const existing = await db.service.findFirst({
    where: { id: input.serviceId, businessId },
  });
  if (!existing) {
    throw new NotFoundError("That service couldn't be found.");
  }

  const service = await db.service.update({
    where: { id: existing.id },
    data: {
      categoryId: input.categoryId || null,
      name: input.name,
      description: input.description || null,
      price: input.price,
      durationMinutes: input.durationMinutes,
      status: input.status,
    },
  });

  await writeAuditLog({
    action: "service.updated",
    businessId,
    metadata: { serviceId: service.id },
  });

  return service;
}
