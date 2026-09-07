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
    // Registration always creates a membership transactionally alongside
    // the user, so a signed-in user with none means the session cookie is
    // orphaned — it references a userId that no longer exists in this
    // database (e.g. the dev DB was reset while a browser still held an
    // old session). Redirecting to /onboarding here would loop forever
    // when this is called *from* the onboarding layout, since it would
    // immediately fail the same check again. Send them to sign back in
    // instead — a stale cookie is just replaced on next successful login.
    redirect("/sign-in");
  }

  return { session, membership };
}
