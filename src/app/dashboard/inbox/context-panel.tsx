import type { Conversation, Customer, Lead } from "@prisma/client";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";

const LEAD_STATUS_LABEL: Record<Lead["status"], string> = {
  NEW: "New",
  QUALIFIED: "Qualified",
  CONTACTED: "Contacted",
  APPOINTMENT: "Appointment",
  PROPOSAL: "Proposal",
  WON: "Won",
  LOST: "Lost",
};

export function ContextPanel({
  conversation,
  leads,
}: {
  conversation: Conversation & { customer: Customer | null };
  leads: Lead[];
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
          <p className="mt-2 text-sm text-muted-foreground text-pretty">
            No AI activity — orchestration isn&apos;t built yet.
          </p>
        </div>
      </div>
    </ScrollArea>
  );
}
