import { db } from "@/server/db/client";
import { ForbiddenError } from "@/lib/errors";
import { can } from "@/server/authorization/permissions";
import type { OrgRole } from "@prisma/client";
import { slugify } from "@/lib/slug";
import { writeAuditLog } from "@/services/audit/log";
import type { CreateServiceInput } from "@/lib/validation/services";

async function uniqueServiceSlug(businessId: string, name: string): Promise<string> {
  const root = slugify(name);
  let candidate = root;
  let suffix = 1;

  while (
    await db.service.findUnique({
      where: { businessId_slug: { businessId, slug: candidate } },
    })
  ) {
    suffix += 1;
    candidate = `${root}-${suffix}`;
  }

  return candidate;
}

export async function createService(
  businessId: string,
  actorRole: OrgRole,
  input: CreateServiceInput,
) {
  if (!can(actorRole, "catalogue:manage")) {
    throw new ForbiddenError("You don't have access to manage the catalogue.");
  }

  const slug = await uniqueServiceSlug(businessId, input.name);

  const service = await db.service.create({
    data: {
      businessId,
      categoryId: input.categoryId || null,
      name: input.name,
      slug,
      description: input.description || null,
      price: input.price,
      durationMinutes: input.durationMinutes,
      status: input.status,
    },
  });

  await writeAuditLog({
    action: "service.created",
    businessId,
    metadata: { serviceId: service.id, name: service.name },
  });

  return service;
}
