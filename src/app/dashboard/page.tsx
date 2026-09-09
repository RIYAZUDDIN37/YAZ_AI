import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { requireMembership } from "@/server/authorization/require-session";
import { db } from "@/server/db/client";
import { getIndustryConfig } from "@/config/industries";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

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
    <div className="mx-auto h-full max-w-6xl space-y-8 overflow-y-auto px-6 py-10">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Overview</h1>
        <p className="mt-1 text-muted-foreground">
          What your AI employee is doing at {business.name}.
        </p>
      </div>

      {agent ? (
        <Card>
          <CardHeader className="flex-row items-center justify-between space-y-0">
            <div>
              <CardTitle className="text-base">{agent.name}</CardTitle>
              <p className="text-sm text-muted-foreground">{agent.title}</p>
            </div>
            <Badge
              variant={agent.status === "ONLINE" ? "default" : "secondary"}
              className="gap-1.5"
            >
              <span
                className={
                  agent.status === "ONLINE"
                    ? "size-1.5 rounded-full bg-success"
                    : "size-1.5 rounded-full bg-muted-foreground"
                }
              />
              {agent.status === "ONLINE" ? "Online" : "Offline"}
            </Badge>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4 border-t border-border pt-4 sm:grid-cols-4">
              <Stat label="Conversations" value={String(conversationCount)} href="/dashboard/inbox" />
              <Stat label="Leads" value={String(leadCount)} href="/dashboard/leads" />
              <Stat
                label={`${industryConfig.appointmentLabel}s`}
                value={String(appointmentCount)}
                href="/dashboard/appointments"
              />
              <Stat label="Escalations" value={String(escalationCount)} />
            </div>
          </CardContent>
        </Card>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Business at a glance</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4 border-t border-border pt-4 sm:grid-cols-4">
            <Stat
              label={industryConfig.catalogueLabel}
              value={String(catalogueCount)}
              href={catalogueHref}
            />
            <Stat label="Customers" value={String(customerCount)} href="/dashboard/customers" />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function Stat({ label, value, href }: { label: string; value: string; href?: string }) {
  const content = (
    <>
      <p className="text-2xl font-semibold tabular-nums">{value}</p>
      <p className="text-xs text-muted-foreground">{label}</p>
    </>
  );

  if (href) {
    return (
      <Link href={href} className="block rounded-md transition-opacity hover:opacity-70">
        {content}
      </Link>
    );
  }

  return <div>{content}</div>;
}
