import { redirect } from "next/navigation";
import { auth } from "@/server/auth";
import { db } from "@/server/db/client";

/** Server component/action helper: bounce to /sign-in with nothing further to check. */
export async function requireSession() {
  const session = await auth();
  if (!session?.user) {
    redirect("/sign-in");
  }
  return session;
}

/**
 * Resolves the signed-in user's organization membership. v1 assumes one
 * organization per user (onboarding creates exactly one); the shape here
 * already returns a list so multi-org support can land later without
 * changing call sites.
 */
export async function requireMembership() {
  const session = await requireSession();
  const membership = await db.organizationMember.findFirst({
    where: { userId: session.user.id },
    include: { organization: { include: { businesses: true } } },
    orderBy: { createdAt: "asc" },
  });

  if (!membership) {
    // Should not happen — registration always creates a membership — but
    // fail safe rather than crash if it ever does.
    redirect("/onboarding");
  }

  return { session, membership };
}
