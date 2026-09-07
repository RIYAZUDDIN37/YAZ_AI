import { redirect } from "next/navigation";
import { requireMembership } from "@/server/authorization/require-session";
import { Logo } from "@/components/shared/logo";
import { Badge } from "@/components/ui/badge";
import { UserMenu } from "@/components/dashboard/user-menu";
import { NavLink } from "@/components/dashboard/nav-link";

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
    <div className="flex h-screen flex-col">
      <header className="border-b border-border/60">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-6">
          <div className="flex items-center gap-3">
            <Logo />
            <span className="h-5 w-px bg-border" aria-hidden />
            <span className="text-sm font-medium">{business.name}</span>
            <Badge variant="secondary" className="text-[10px] capitalize">
              {business.industry.toLowerCase()}
            </Badge>
          </div>

          <nav className="hidden items-center gap-6 sm:flex">
            <NavLink href="/dashboard" exact>
              Overview
            </NavLink>
            <NavLink href="/dashboard/inbox">Inbox</NavLink>
          </nav>

          <UserMenu
            name={session.user.name ?? "You"}
            email={session.user.email ?? ""}
          />
        </div>
      </header>
      <main className="min-h-0 flex-1">{children}</main>
    </div>
  );
}
