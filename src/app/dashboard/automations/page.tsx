import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { requireMembership } from "@/server/authorization/require-session";
import { can } from "@/server/authorization/permissions";
import { db } from "@/server/db/client";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Workflow } from "lucide-react";
import { NewAutomationDialog } from "./new-automation-dialog";
import { AutomationRow } from "./automation-row";

export const metadata: Metadata = { title: "Automations" };

export default async function AutomationsPage() {
  const { membership } = await requireMembership();
  const business = membership.organization.businesses[0];
  if (!business) redirect("/onboarding");

  // Same posture as /dashboard/agent: business:manage territory, quietly
  // redirect rather than show a raw error for a page there's no nav
  // link to for lower roles.
  if (!can(membership.role, "business:manage")) {
    redirect("/dashboard");
  }

  const [automations, recentRuns] = await Promise.all([
    db.automation.findMany({ where: { businessId: business.id }, orderBy: { createdAt: "desc" } }),
    db.workflowExecution.findMany({
      where: { businessId: business.id },
      orderBy: { createdAt: "desc" },
      take: 20,
      include: { automation: true },
    }),
  ]);

  return (
    <ScrollArea className="h-full">
      <div className="mx-auto max-w-3xl space-y-8 px-6 py-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-semibold">Automations</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              When something real happens, do something real — no cron job, these run the instant
              their trigger event does.
            </p>
          </div>
          <NewAutomationDialog />
        </div>

        {automations.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border py-16 text-center">
            <Workflow className="size-8 text-muted-foreground" />
            <p className="mt-3 text-sm font-medium">No automations yet</p>
            <p className="mt-1 max-w-xs text-sm text-muted-foreground text-pretty">
              e.g. notify the team whenever your AI employee escalates a conversation.
            </p>
          </div>
        ) : (
          <ul className="space-y-2">
            {automations.map((automation) => (
              <AutomationRow key={automation.id} automation={automation} />
            ))}
          </ul>
        )}

        <div>
          <h2 className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
            Recent runs
          </h2>
          {recentRuns.length === 0 ? (
            <p className="mt-2 text-sm text-muted-foreground">
              Nothing has fired yet — this fills in the moment a trigger event happens.
            </p>
          ) : (
            <ul className="mt-3 space-y-2">
              {recentRuns.map((run) => (
                <li key={run.id} className="rounded-lg border border-border p-3">
                  <div className="flex items-center gap-1.5">
                    <span
                      className={
                        run.status === "SUCCESS"
                          ? "size-1.5 rounded-full bg-success"
                          : run.status === "SKIPPED"
                            ? "size-1.5 rounded-full bg-muted-foreground"
                            : "size-1.5 rounded-full bg-destructive"
                      }
                    />
                    <p className="text-xs font-medium">{run.automation.name}</p>
                    <Badge variant="outline" className="text-[10px]">
                      {run.status}
                    </Badge>
                  </div>
                  <p className="mt-1.5 text-xs text-muted-foreground text-pretty">{run.summary}</p>
                  <p className="mt-1 text-[11px] text-muted-foreground">
                    {new Date(run.createdAt).toLocaleString(undefined, {
                      month: "short",
                      day: "numeric",
                      hour: "numeric",
                      minute: "2-digit",
                    })}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </ScrollArea>
  );
}
