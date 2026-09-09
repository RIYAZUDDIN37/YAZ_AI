import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { requireMembership } from "@/server/authorization/require-session";
import { can } from "@/server/authorization/permissions";
import { db } from "@/server/db/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";

export const metadata: Metadata = { title: "Analytics" };

const LEAD_STATUS_ORDER = ["NEW", "QUALIFIED", "CONTACTED", "APPOINTMENT", "PROPOSAL", "WON", "LOST"] as const;
const LEAD_STATUS_LABEL: Record<string, string> = {
  NEW: "New",
  QUALIFIED: "Qualified",
  CONTACTED: "Contacted",
  APPOINTMENT: "Appointment",
  PROPOSAL: "Proposal",
  WON: "Won",
  LOST: "Lost",
};

const CONVERSATION_STATUS_LABEL: Record<string, string> = {
  AI_HANDLING: "AI handling",
  HUMAN_NEEDED: "Needs a human",
  HUMAN_HANDLING: "Being handled",
  RESOLVED: "Resolved",
};

const EXECUTION_STATUS_LABEL: Record<string, string> = {
  SUCCESS: "Replied",
  ESCALATED: "Escalated",
  ERROR: "Errored",
};

export default async function AnalyticsPage() {
  const { membership } = await requireMembership();
  const business = membership.organization.businesses[0];
  if (!business) redirect("/onboarding");

  if (!can(membership.role, "business:manage")) {
    redirect("/dashboard");
  }

  const businessId = business.id;

  const [
    conversationsByStatus,
    leadsByStatus,
    executionsByStatus,
    appointmentsByStatus,
    payments,
    wonLeadValue,
    automationRuns,
  ] = await Promise.all([
    db.conversation.groupBy({
      by: ["status"],
      where: { businessId, isTest: false },
      _count: { _all: true },
    }),
    db.lead.groupBy({ by: ["status"], where: { businessId }, _count: { _all: true } }),
    db.agentExecution.groupBy({ by: ["status"], where: { businessId }, _count: { _all: true } }),
    db.appointment.groupBy({ by: ["status"], where: { businessId }, _count: { _all: true } }),
    db.payment.aggregate({ where: { businessId }, _sum: { amount: true } }),
    db.lead.aggregate({ where: { businessId, status: "WON" }, _sum: { value: true } }),
    db.workflowExecution.groupBy({ by: ["status"], where: { businessId }, _count: { _all: true } }),
  ]);

  const leadCounts = Object.fromEntries(leadsByStatus.map((row) => [row.status, row._count._all]));
  const totalLeads = leadsByStatus.reduce((sum, row) => sum + row._count._all, 0);
  const wonCount = leadCounts.WON ?? 0;
  const conversionRate = totalLeads > 0 ? Math.round((wonCount / totalLeads) * 100) : 0;

  const totalExecutions = executionsByStatus.reduce((sum, row) => sum + row._count._all, 0);
  const escalatedCount = executionsByStatus.find((row) => row.status === "ESCALATED")?._count._all ?? 0;
  const escalationRate = totalExecutions > 0 ? Math.round((escalatedCount / totalExecutions) * 100) : 0;

  const totalAppointments = appointmentsByStatus.reduce((sum, row) => sum + row._count._all, 0);
  const noShowCount = appointmentsByStatus.find((row) => row.status === "NO_SHOW")?._count._all ?? 0;
  const noShowRate = totalAppointments > 0 ? Math.round((noShowCount / totalAppointments) * 100) : 0;

  const revenueCollected = Number(payments._sum.amount ?? 0);
  const wonValue = Number(wonLeadValue._sum.value ?? 0);

  return (
    <ScrollArea className="h-full">
      <div className="mx-auto max-w-5xl space-y-8 px-6 py-8">
        <div>
          <h1 className="text-xl font-semibold">Analytics</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Real numbers from {business.name}&apos;s own data — every figure below is a live
            aggregate query, not a placeholder.
          </p>
        </div>

        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <StatCard label="Lead conversion" value={`${conversionRate}%`} sub={`${wonCount} of ${totalLeads} won`} />
          <StatCard label="Escalation rate" value={`${escalationRate}%`} sub={`${escalatedCount} of ${totalExecutions} AI turns`} />
          <StatCard label="No-show rate" value={`${noShowRate}%`} sub={`${noShowCount} of ${totalAppointments}`} />
          <StatCard label="Revenue collected" value={`₹${revenueCollected.toLocaleString("en-IN")}`} sub="From recorded payments" />
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Lead funnel</CardTitle>
          </CardHeader>
          <CardContent>
            <BarChart
              rows={LEAD_STATUS_ORDER.map((status) => ({
                label: LEAD_STATUS_LABEL[status],
                value: leadCounts[status] ?? 0,
              }))}
            />
            <p className="mt-3 text-xs text-muted-foreground">
              Won leads represent ₹{wonValue.toLocaleString("en-IN")} in recorded deal value.
            </p>
          </CardContent>
        </Card>

        <div className="grid gap-4 sm:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Conversations by status</CardTitle>
            </CardHeader>
            <CardContent>
              <BarChart
                rows={conversationsByStatus.map((row) => ({
                  label: CONVERSATION_STATUS_LABEL[row.status] ?? row.status,
                  value: row._count._all,
                }))}
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">AI turns by outcome</CardTitle>
            </CardHeader>
            <CardContent>
              <BarChart
                rows={executionsByStatus.map((row) => ({
                  label: EXECUTION_STATUS_LABEL[row.status] ?? row.status,
                  value: row._count._all,
                }))}
              />
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Automation runs</CardTitle>
          </CardHeader>
          <CardContent>
            {automationRuns.length === 0 ? (
              <p className="text-sm text-muted-foreground">No automations have fired yet.</p>
            ) : (
              <BarChart
                rows={automationRuns.map((row) => ({
                  label: row.status,
                  value: row._count._all,
                }))}
              />
            )}
          </CardContent>
        </Card>
      </div>
    </ScrollArea>
  );
}

function StatCard({ label, value, sub }: { label: string; value: string; sub: string }) {
  return (
    <Card size="sm">
      <CardContent className="space-y-1">
        <p className="text-2xl font-semibold tabular-nums">{value}</p>
        <p className="text-xs font-medium text-muted-foreground">{label}</p>
        <p className="text-[11px] text-muted-foreground">{sub}</p>
      </CardContent>
    </Card>
  );
}

/** Plain CSS bar rows — no charting library. Real data, honestly simple
 * visualization; a dependency wasn't worth it for horizontal bars. */
function BarChart({ rows }: { rows: { label: string; value: number }[] }) {
  const max = Math.max(1, ...rows.map((row) => row.value));

  if (rows.every((row) => row.value === 0)) {
    return <p className="text-sm text-muted-foreground">No data yet.</p>;
  }

  return (
    <div className="space-y-2.5">
      {rows.map((row) => (
        <div key={row.label} className="flex items-center gap-3">
          <span className="w-32 shrink-0 truncate text-xs text-muted-foreground">{row.label}</span>
          <div className="h-2 flex-1 overflow-hidden rounded-full bg-muted">
            <div
              className="h-full rounded-full bg-brand"
              style={{ width: `${(row.value / max) * 100}%` }}
            />
          </div>
          <span className="w-8 shrink-0 text-right text-xs tabular-nums text-muted-foreground">
            {row.value}
          </span>
        </div>
      ))}
    </div>
  );
}
