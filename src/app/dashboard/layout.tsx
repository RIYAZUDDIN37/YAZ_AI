import { redirect } from "next/navigation";
import { requireMembership } from "@/server/authorization/require-session";
import { Logo } from "@/components/shared/logo";
import { Badge } from "@/components/ui/badge";
import { UserMenu } from "@/components/dashboard/user-menu";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { session, membership } = await requireMembership();
  const business = membership.organization.businesses[0];

  if (!business) {
    redirect("/onboarding");
  }

  return (
    <div className="min-h-screen">
      <header className="border-b border-border/60">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
          <div className="flex items-center gap-3">
            <Logo />
            <span className="h-5 w-px bg-border" aria-hidden />
            <span className="text-sm font-medium">{business.name}</span>
            <Badge variant="secondary" className="text-[10px] capitalize">
              {business.industry.toLowerCase()}
            </Badge>
          </div>
          <UserMenu
            name={session.user.name ?? "You"}
            email={session.user.email ?? ""}
          />
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-6 py-10">{children}</main>
    </div>
  );
}
