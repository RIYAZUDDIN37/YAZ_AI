import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { requireMembership } from "@/server/authorization/require-session";
import { db } from "@/server/db/client";
import type { LeadStatus } from "@prisma/client";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { Target } from "lucide-react";
import { NewLeadDialog } from "./new-lead-dialog";

export const metadata: Metadata = { title: "Leads" };

const STATUS_TABS: { value: LeadStatus | "ALL"; label: string }[] = [
  { value: "ALL", label: "All" },
  { value: "NEW", label: "New" },
  { value: "QUALIFIED", label: "Qualified" },
  { value: "CONTACTED", label: "Contacted" },
  { value: "APPOINTMENT", label: "Appointment" },
  { value: "PROPOSAL", label: "Proposal" },
  { value: "WON", label: "Won" },
  { value: "LOST", label: "Lost" },
];

export default async function LeadsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const { membership } = await requireMembership();
  const business = membership.organization.businesses[0];
  if (!business) redirect("/onboarding");

  const { status } = await searchParams;
  const activeStatus = STATUS_TABS.some((tab) => tab.value === status)
    ? (status as LeadStatus | "ALL")
    : "ALL";

  const [leads, customers] = await Promise.all([
    db.lead.findMany({
      where: {
        businessId: business.id,
        ...(activeStatus === "ALL" ? {} : { status: activeStatus }),
      },
      orderBy: { createdAt: "desc" },
      include: { customer: true },
    }),
    db.customer.findMany({ where: { businessId: business.id }, orderBy: { name: "asc" } }),
  ]);

  return (
    <ScrollArea className="h-full">
      <div className="mx-auto max-w-5xl px-6 py-8">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-xl font-semibold">Leads</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Sales opportunities for {business.name}, human- and AI-created.
            </p>
          </div>
          <NewLeadDialog customers={customers} />
        </div>

        <div className="mb-4 flex flex-wrap gap-1">
          {STATUS_TABS.map((tab) => (
            <Link
              key={tab.value}
              href={tab.value === "ALL" ? "/dashboard/leads" : `/dashboard/leads?status=${tab.value}`}
              className={cn(
                "rounded-md px-2.5 py-1 text-xs transition-colors",
                activeStatus === tab.value
                  ? "bg-accent font-medium text-foreground"
                  : "text-muted-foreground hover:bg-accent/50",
              )}
            >
              {tab.label}
            </Link>
          ))}
        </div>

        {leads.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border py-16 text-center">
            <Target className="size-8 text-muted-foreground" />
            <p className="mt-3 text-sm font-medium">No leads {activeStatus === "ALL" ? "yet" : "in this stage"}</p>
            <p className="mt-1 max-w-xs text-sm text-muted-foreground text-pretty">
              Leads show up here once your AI employee qualifies one from a conversation, or you add
              one manually.
            </p>
          </div>
        ) : (
          <ul className="space-y-2">
            {leads.map((lead) => (
              <li key={lead.id}>
                <Link
                  href={`/dashboard/leads/${lead.id}`}
                  className="flex items-center justify-between gap-3 rounded-lg border border-border p-3.5 hover:bg-accent/50"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">
                      {lead.customer?.name ?? "Unknown customer"}
                    </p>
                    <p className="mt-0.5 truncate text-sm text-muted-foreground">
                      {lead.intent ?? "No intent recorded"}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-3">
                    {lead.value ? (
                      <span className="text-sm tabular-nums text-muted-foreground">
                        ₹{Number(lead.value).toLocaleString("en-IN")}
                      </span>
                    ) : null}
                    <Badge variant="outline" className="text-[10px]">
                      {STATUS_TABS.find((tab) => tab.value === lead.status)?.label}
                    </Badge>
                    {lead.source === "AI conversation" ? (
                      <Badge variant="secondary" className="text-[10px]">
                        AI
                      </Badge>
                    ) : null}
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </ScrollArea>
  );
}
