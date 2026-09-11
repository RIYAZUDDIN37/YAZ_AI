import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { requireMembership } from "@/server/authorization/require-session";
import { db } from "@/server/db/client";
import { getIndustryConfig } from "@/config/industries";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Overview" };

export default async function DashboardOverviewPage() {
  const { membership } = await requireMembership();
  const business = membership.organization.businesses[0];
  if (!business) redirect("/onboarding");

  const industryConfig = getIndustryConfig(business.industry);

  const [agent, conversationCount, leadCount, catalogueCount, customerCount, escalationCount, appointmentCount] =
    await Promise.all([
      db.aIAgent.findFirst({
        where: { businessId: business.id },
        orderBy: { createdAt: "asc" },
      }),
      db.conversation.count({ where: { businessId: business.id, isTest: false } }),
      db.lead.count({ where: { businessId: business.id } }),
      industryConfig.catalogueType === "services"
        ? db.service.count({ where: { businessId: business.id } })
        : db.product.count({ where: { businessId: business.id } }),
      db.customer.count({ where: { businessId: business.id } }),
      db.agentExecution.count({ where: { businessId: business.id, status: "ESCALATED" } }),
      db.appointment.count({ where: { businessId: business.id } }),
    ]);
  const catalogueHref = industryConfig.catalogueType === "services" ? "/dashboard/services" : "/dashboard/products";

  return (
    <div className="relative mx-auto h-full max-w-6xl space-y-8 overflow-y-auto px-6 py-10">
      {/* Ambient glow — "Indigo Glow" UI direction's signature background
          treatment, chosen from mockup comparison. Purely decorative. */}
      <div
        aria-hidden
        className="pointer-events-none absolute -top-24 -right-16 -z-10 size-[420px] rounded-full bg-brand/20 blur-3xl"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute top-48 -left-24 -z-10 size-[360px] rounded-full bg-brand-2/10 blur-3xl"
      />

      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Overview</h1>
        <p className="mt-1 text-muted-foreground">
          What your AI employee is doing at {business.name}.
        </p>
      </div>

      {agent ? (
        <div className="overflow-hidden rounded-2xl shadow-[0_20px_40px_-20px_oklch(0.56_0.21_280_/_35%)] ring-1 ring-foreground/10">
          <div className="flex items-center justify-between bg-gradient-to-r from-brand-2 via-brand to-brand-2/80 px-7 py-6">
            <div className="flex items-center gap-4">
              <div className="flex size-11 items-center justify-center rounded-xl bg-white/20 text-lg font-bold text-white backdrop-blur-sm">
                {agent.name.charAt(0)}
              </div>
              <div>
                <p className="text-lg font-bold text-white">{agent.name}</p>
                <p className="text-sm font-medium text-white/85">{agent.title}</p>
              </div>
            </div>
            <span className="flex items-center gap-1.5 rounded-full bg-white/20 px-3.5 py-1.5 text-xs font-bold text-white">
              <span
                className={cn(
                  "size-1.5 rounded-full",
                  agent.status === "ONLINE" ? "bg-white" : "bg-white/50",
                )}
              />
              {agent.status === "ONLINE" ? "Online" : "Offline"}
            </span>
          </div>
          <div className="grid grid-cols-2 bg-card sm:grid-cols-4">
            <Stat label="Conversations" value={String(conversationCount)} href="/dashboard/inbox" bordered />
            <Stat label="Leads" value={String(leadCount)} href="/dashboard/leads" bordered accent />
            <Stat
              label={`${industryConfig.appointmentLabel}s`}
              value={String(appointmentCount)}
              href="/dashboard/appointments"
              bordered
            />
            <Stat label="Escalations" value={String(escalationCount)} warn />
          </div>
        </div>
      ) : null}

      <Card className="rounded-2xl ring-1 ring-foreground/10">
        <CardHeader>
          <CardTitle className="text-base font-bold">Business at a glance</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 border-t border-border sm:grid-cols-4">
            <Stat
              label={industryConfig.catalogueLabel}
              value={String(catalogueCount)}
              href={catalogueHref}
              bordered
            />
            <Stat label="Customers" value={String(customerCount)} href="/dashboard/customers" bordered />
            <div className="hidden border-t border-border sm:block" />
            <div className="hidden border-t border-border sm:block" />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function Stat({
  label,
  value,
  href,
  bordered,
  accent,
  warn,
}: {
  label: string;
  value: string;
  href?: string;
  bordered?: boolean;
  accent?: boolean;
  warn?: boolean;
}) {
  const content = (
    <>
      <p
        className={cn(
          "text-3xl font-bold tracking-tight tabular-nums",
          accent && "text-brand",
          warn && "text-destructive",
        )}
      >
        {value}
      </p>
      <p className="mt-0.5 text-xs font-medium text-muted-foreground">{label}</p>
    </>
  );

  return (
    <div
      className={cn(
        "px-6 py-5",
        bordered && "border-t border-border sm:border-t-0 sm:border-r",
      )}
    >
      {href ? (
        <Link href={href} className="block transition-opacity hover:opacity-70">
          {content}
        </Link>
      ) : (
        content
      )}
    </div>
  );
}
