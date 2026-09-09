import { redirect } from "next/navigation";
import { requireMembership } from "@/server/authorization/require-session";
import { can } from "@/server/authorization/permissions";
import { getIndustryConfig } from "@/config/industries";
import { db } from "@/server/db/client";
import { Logo } from "@/components/shared/logo";
import { Badge } from "@/components/ui/badge";
import { UserMenu } from "@/components/dashboard/user-menu";
import { NavLink } from "@/components/dashboard/nav-link";
import { MoreNav } from "@/components/dashboard/more-nav";
import { NotificationBell } from "@/components/dashboard/notification-bell";

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
  const industryConfig = getIndustryConfig(business.industry);
  const unreadCount = await db.notification.count({
    where: { businessId: business.id, userId: session.user.id, readAt: null },
  });

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
            {can(membership.role, "customers:manage") ? (
              <>
                <NavLink href="/dashboard/customers">Customers</NavLink>
                <NavLink href="/dashboard/leads">Leads</NavLink>
              </>
            ) : null}
            {can(membership.role, "catalogue:manage") ? (
              <NavLink
                href={industryConfig.catalogueType === "services" ? "/dashboard/services" : "/dashboard/products"}
              >
                {industryConfig.catalogueLabel}
              </NavLink>
            ) : null}
            <MoreNav
              items={[
                ...(can(membership.role, "customers:manage")
                  ? [
                      { href: "/dashboard/appointments", label: `${industryConfig.appointmentLabel}s` },
                      { href: "/dashboard/quotations", label: "Quotations" },
                      { href: "/dashboard/orders", label: "Orders" },
                    ]
                  : []),
                ...(can(membership.role, "business:manage")
                  ? [
                      { href: "/dashboard/analytics", label: "Analytics" },
                      { href: "/dashboard/agent", label: "Train AI Employee" },
                      { href: "/dashboard/automations", label: "Automations" },
                    ]
                  : []),
              ]}
            />
          </nav>

          <div className="flex items-center gap-3">
            <NotificationBell unreadCount={unreadCount} />
            <UserMenu
              name={session.user.name ?? "You"}
              email={session.user.email ?? ""}
            />
          </div>
        </div>
      </header>
      <main className="min-h-0 flex-1">{children}</main>
    </div>
  );
}
