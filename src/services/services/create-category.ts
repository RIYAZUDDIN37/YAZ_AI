import { db } from "@/server/db/client";
import { ForbiddenError } from "@/lib/errors";
import { can } from "@/server/authorization/permissions";
import type { OrgRole } from "@prisma/client";
import { slugify } from "@/lib/slug";
import type { CreateServiceCategoryInput } from "@/lib/validation/services";

async function uniqueCategorySlug(businessId: string, name: string): Promise<string> {
  const root = slugify(name);
  let candidate = root;
  let suffix = 1;

  while (
    await db.serviceCategory.findUnique({
      where: { businessId_slug: { businessId, slug: candidate } },
    })
  ) {
    suffix += 1;
    candidate = `${root}-${suffix}`;
  }

  return candidate;
}

export async function createServiceCategory(
  businessId: string,
  actorRole: OrgRole,
  input: CreateServiceCategoryInput,
) {
  if (!can(actorRole, "catalogue:manage")) {
    throw new ForbiddenError("You don't have access to manage the catalogue.");
  }

  const slug = await uniqueCategorySlug(businessId, input.name);

  return db.serviceCategory.create({
    data: { businessId, name: input.name, slug },
  });
}
