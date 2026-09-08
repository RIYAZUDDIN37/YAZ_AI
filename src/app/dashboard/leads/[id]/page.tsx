import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { requireMembership } from "@/server/authorization/require-session";
import { db } from "@/server/db/client";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { LeadStatusPicker } from "./lead-status-picker";
import { LeadNotes } from "./lead-notes";

export const metadata: Metadata = { title: "Lead" };

export default async function LeadDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { membership } = await requireMembership();
  const business = membership.organization.businesses[0];
  if (!business) redirect("/onboarding");

  const lead = await db.lead.findFirst({
    where: { id, businessId: business.id },
    include: {
      customer: true,
      activities: { orderBy: { createdAt: "desc" } },
    },
  });
  if (!lead) notFound();

  return (
    <ScrollArea className="h-full">
      <div className="mx-auto max-w-2xl space-y-8 px-6 py-8">
        <div>
          <Link href="/dashboard/leads" className="text-sm text-muted-foreground hover:underline">
            ← Leads
          </Link>
          <div className="mt-2 flex items-start justify-between gap-4">
            <div>
              <h1 className="text-xl font-semibold">{lead.intent ?? "Lead"}</h1>
              {lead.customer ? (
                <Link
                  href={`/dashboard/customers/${lead.customer.id}`}
                  className="mt-1 inline-block text-sm text-muted-foreground hover:underline"
                >
                  {lead.customer.name}
                </Link>
              ) : null}
            </div>
            {lead.value ? (
              <p className="shrink-0 text-lg font-semibold tabular-nums">
                ₹{Number(lead.value).toLocaleString("en-IN")}
              </p>
            ) : null}
          </div>
          <div className="mt-2 flex items-center gap-2">
            {lead.source === "AI conversation" ? (
              <Badge variant="secondary" className="text-[10px]">
                Created by AI
              </Badge>
            ) : lead.source ? (
              <Badge variant="outline" className="text-[10px]">
                {lead.source}
              </Badge>
            ) : null}
          </div>
        </div>

        <section>
          <h2 className="text-xs font-medium tracking-wide text-muted-foreground uppercase">Status</h2>
          <div className="mt-3">
            <LeadStatusPicker leadId={lead.id} status={lead.status} />
          </div>
        </section>

        <Separator />

        <section>
          <h2 className="text-xs font-medium tracking-wide text-muted-foreground uppercase">Activity</h2>
          <div className="mt-3">
            <LeadNotes leadId={lead.id} activities={lead.activities} />
          </div>
        </section>
      </div>
    </ScrollArea>
  );
}
