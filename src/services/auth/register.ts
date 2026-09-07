import bcrypt from "bcryptjs";
import { db } from "@/server/db/client";
import { AppError } from "@/lib/errors";
import { slugify } from "@/lib/slug";
import { writeAuditLog } from "@/services/audit/log";
import type { RegisterInput } from "@/lib/validation/auth";

const PASSWORD_HASH_ROUNDS = 12;

/**
 * Registers a new user AND their first Organization in one transaction —
 * every user needs a workspace to land in, and the two must never exist
 * without each other. Business creation happens separately in onboarding
 * (services/onboarding/complete-onboarding.ts).
 */
export async function registerUser(input: Omit<RegisterInput, "confirmPassword">) {
  const email = input.email.toLowerCase().trim();
  const name = input.name.trim();

  const existing = await db.user.findUnique({ where: { email } });
  if (existing) {
    throw new AppError(
      "An account with this email already exists.",
      "EMAIL_TAKEN",
    );
  }

  const passwordHash = await bcrypt.hash(input.password, PASSWORD_HASH_ROUNDS);
  const organizationSlug = await uniqueOrganizationSlug(`${name}-workspace`);

  const result = await db.$transaction(async (tx) => {
    const user = await tx.user.create({
      data: { name, email, passwordHash },
    });

    const organization = await tx.organization.create({
      data: {
        name: `${name}'s Workspace`,
        slug: organizationSlug,
        members: {
          create: { userId: user.id, role: "OWNER" },
        },
      },
    });

    return { user, organizationId: organization.id };
  });

  await writeAuditLog({
    action: "user.registered",
    userId: result.user.id,
    organizationId: result.organizationId,
    metadata: { email },
  });

  return result;
}

async function uniqueOrganizationSlug(base: string): Promise<string> {
  const root = slugify(base);
  let candidate = root;
  let suffix = 1;

  // Collisions are rare (would require two identically-named signups) but
  // must still resolve deterministically rather than throwing a unique
  // constraint error at the user.
  while (await db.organization.findUnique({ where: { slug: candidate } })) {
    suffix += 1;
    candidate = `${root}-${suffix}`;
  }

  return candidate;
}
