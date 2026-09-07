import type { BusinessIndustry } from "@prisma/client";
import { db } from "@/server/db/client";
import { AppError, ForbiddenError } from "@/lib/errors";
import { can } from "@/server/authorization/permissions";
import { slugify } from "@/lib/slug";
import { writeAuditLog } from "@/services/audit/log";
import type { OnboardingInput } from "@/lib/validation/onboarding";

/**
 * Creates the first Business for an Organization, along with its first
 * AI employee. Authorization is re-checked here even though the caller
 * (the onboarding server action) already has a session — a browser-supplied
 * organizationId is never trusted on its own (see docs/SECURITY.md).
 */
export async function completeOnboarding(
  userId: string,
  input: OnboardingInput,
) {
  const membership = await db.organizationMember.findUnique({
    where: {
      organizationId_userId: {
        organizationId: input.organizationId,
        userId,
      },
    },
  });

  if (!membership) {
    throw new ForbiddenError("You don't belong to this workspace.");
  }
  if (!can(membership.role, "business:onboard")) {
    throw new ForbiddenError(
      "Only an owner or admin can set up the business.",
    );
  }

  const existingBusiness = await db.business.findFirst({
    where: { organizationId: input.organizationId },
  });
  if (existingBusiness) {
    throw new AppError(
      "This workspace has already been set up.",
      "ALREADY_ONBOARDED",
    );
  }

  const slug = await uniqueBusinessSlug(input.businessName);

  const business = await db.business.create({
    data: {
      organizationId: input.organizationId,
      name: input.businessName,
      slug,
      // `input.industry` is validated against INDUSTRIES (which enumerates
      // BusinessIndustry) by onboardingSchema before this is ever called.
      industry: input.industry as BusinessIndustry,
      onboardedAt: new Date(),
      agents: {
        create: {
          name: input.agentName,
          title: input.agentTitle,
          status: "ONLINE",
        },
      },
    },
    include: { agents: true },
  });

  await writeAuditLog({
    action: "business.onboarded",
    userId,
    organizationId: input.organizationId,
    businessId: business.id,
    metadata: {
      industry: input.industry,
      agentName: input.agentName,
      agentTitle: input.agentTitle,
    },
  });

  return business;
}

async function uniqueBusinessSlug(name: string): Promise<string> {
  const root = slugify(name);
  let candidate = root;
  let suffix = 1;

  while (await db.business.findUnique({ where: { slug: candidate } })) {
    suffix += 1;
    candidate = `${root}-${suffix}`;
  }

  return candidate;
}
