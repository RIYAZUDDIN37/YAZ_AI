import type { Metadata } from "next";
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

  const [agent, conversationCount, leadCount, productCount, customerCount] =
    await Promise.all([
      db.aIAgent.findFirst({
        where: { businessId: business.id },
        orderBy: { createdAt: "asc" },
      }),
      db.conversation.count({ where: { businessId: business.id } }),
      db.lead.count({ where: { businessId: business.id } }),
      db.product.count({ where: { businessId: business.id } }),
      db.customer.count({ where: { businessId: business.id } }),
    ]);
  const industryConfig = getIndustryConfig(business.industry);

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
              <Stat label="Conversations" value={String(conversationCount)} />
              <Stat label="Leads" value={String(leadCount)} />
              <Stat
                label={`${industryConfig.appointmentLabel}s`}
                value="0"
              />
              <Stat label="Escalations" value="0" />
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
            <Stat label={industryConfig.catalogueLabel} value={String(productCount)} />
            <Stat label="Customers" value={String(customerCount)} />
          </div>
        </CardContent>
      </Card>

      <Card className="border-dashed">
        <CardContent className="py-10 text-center">
          <p className="font-medium">Conversations are real — the AI isn&apos;t, yet.</p>
          <p className="mx-auto mt-1.5 max-w-md text-sm text-muted-foreground text-pretty">
            <a href="/dashboard/inbox" className="underline underline-offset-2">
              Inbox
            </a>{" "}
            is a working conversation system — persisted messages, human
            replies, real state. What&apos;s next is the AI orchestration
            engine that lets Maya actually handle these instead of a human
            doing it manually every time.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-2xl font-semibold tabular-nums">{value}</p>
      <p className="text-xs text-muted-foreground">{label}</p>
    </div>
  );
}
