import { redirect } from "next/navigation";
import { requireMembership } from "@/server/authorization/require-session";
import { Logo } from "@/components/shared/logo";

export default async function OnboardingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { membership } = await requireMembership();

  // Already set up — onboarding is a one-time flow per organization.
  if (membership.organization.businesses.length > 0) {
    redirect("/dashboard");
  }

  return (
    <div className="min-h-screen bg-secondary/30">
      <header className="border-b border-border/60 bg-background">
        <div className="mx-auto max-w-2xl px-6 py-5">
          <Logo />
        </div>
      </header>
      <main className="mx-auto max-w-2xl px-6 py-12">{children}</main>
    </div>
  );
}
