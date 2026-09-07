import type { AgentAction, AgentExecution, Conversation, Customer, Lead } from "@prisma/client";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";

const LEAD_STATUS_LABEL: Record<Lead["status"], string> = {
  NEW: "New",
  QUALIFIED: "Qualified",
  CONTACTED: "Contacted",
  APPOINTMENT: "Appointment",
  PROPOSAL: "Proposal",
  WON: "Won",
  LOST: "Lost",
};

type ExecutionWithActions = AgentExecution & { actions: AgentAction[] };

export function ContextPanel({
  conversation,
  leads,
  executions,
}: {
  conversation: Conversation & { customer: Customer | null };
  leads: Lead[];
  executions: ExecutionWithActions[];
}) {
  const { customer } = conversation;

  return (
    <ScrollArea className="h-full">
      <div className="space-y-6 p-4">
        <div>
          <h3 className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
            Customer
          </h3>
          {customer ? (
            <div className="mt-2 space-y-1 text-sm">
              <p className="font-medium">{customer.name}</p>
              {customer.email ? (
                <p className="text-muted-foreground">{customer.email}</p>
              ) : null}
              {customer.phone ? (
                <p className="text-muted-foreground">{customer.phone}</p>
              ) : null}
            </div>
          ) : (
            <p className="mt-2 text-sm text-muted-foreground">No linked customer.</p>
          )}
        </div>

        <Separator />

        <div>
          <h3 className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
            Leads
          </h3>
          {leads.length === 0 ? (
            <p className="mt-2 text-sm text-muted-foreground">No leads yet.</p>
          ) : (
            <ul className="mt-2 space-y-2">
              {leads.map((lead) => (
                <li key={lead.id} className="rounded-lg border border-border p-2.5">
                  <div className="flex items-center justify-between gap-2">
                    <Badge variant="outline" className="text-[10px]">
                      {LEAD_STATUS_LABEL[lead.status]}
                    </Badge>
                    {lead.value ? (
                      <span className="text-xs text-muted-foreground">
                        ₹{Number(lead.value).toLocaleString("en-IN")}
                      </span>
                    ) : null}
                  </div>
                  {lead.intent ? (
                    <p className="mt-1.5 text-xs text-muted-foreground text-pretty">
                      {lead.intent}
                    </p>
                  ) : null}
                </li>
              ))}
            </ul>
          )}
        </div>

        <Separator />

        <div>
          <h3 className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
            AI activity
          </h3>
          {executions.length === 0 ? (
            <p className="mt-2 text-sm text-muted-foreground text-pretty">
              No AI activity on this conversation yet.
            </p>
          ) : (
            <ul className="mt-2 space-y-3">
              {executions.map((execution) => (
                <li key={execution.id} className="rounded-lg border border-border p-2.5">
                  <div className="flex items-center gap-1.5">
                    <span
                      className={cn(
                        "size-1.5 rounded-full",
                        execution.status === "SUCCESS"
                          ? "bg-success"
                          : execution.status === "ESCALATED"
                            ? "bg-warning"
                            : "bg-destructive",
                      )}
                    />
                    <p className="text-xs font-medium">{execution.summary}</p>
                  </div>
                  {execution.actions.length > 0 ? (
                    <div className="mt-1.5 flex flex-wrap gap-1">
                      {execution.actions.map((action) => (
                        <Badge key={action.id} variant="outline" className="text-[10px]">
                          {action.toolName}
                        </Badge>
                      ))}
                    </div>
                  ) : null}
                  <p className="mt-1.5 text-[11px] text-muted-foreground">
                    {new Date(execution.createdAt).toLocaleString(undefined, {
                      hour: "numeric",
                      minute: "2-digit",
                      month: "short",
                      day: "numeric",
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
