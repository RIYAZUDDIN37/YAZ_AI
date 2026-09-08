import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { requireMembership } from "@/server/authorization/require-session";
import { db } from "@/server/db/client";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { CustomerProfileForm } from "./customer-profile-form";
import { CustomerNotes } from "./customer-notes";

export const metadata: Metadata = { title: "Customer" };

const LEAD_STATUS_LABEL: Record<string, string> = {
  NEW: "New",
  QUALIFIED: "Qualified",
  CONTACTED: "Contacted",
  APPOINTMENT: "Appointment",
  PROPOSAL: "Proposal",
  WON: "Won",
  LOST: "Lost",
};

export default async function CustomerDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { membership } = await requireMembership();
  const business = membership.organization.businesses[0];
  if (!business) redirect("/onboarding");

  const customer = await db.customer.findFirst({
    where: { id, businessId: business.id },
    include: {
      tags: true,
      notes: { orderBy: { createdAt: "desc" }, include: { authorUser: true } },
      leads: { orderBy: { createdAt: "desc" } },
      conversations: { orderBy: { lastMessageAt: "desc" }, take: 5 },
    },
  });
  if (!customer) notFound();

  return (
    <ScrollArea className="h-full">
      <div className="mx-auto max-w-3xl space-y-8 px-6 py-8">
        <div>
          <Link href="/dashboard/customers" className="text-sm text-muted-foreground hover:underline">
            ← Customers
          </Link>
          <h1 className="mt-2 text-xl font-semibold">{customer.name}</h1>
          {customer.tags.length > 0 ? (
            <div className="mt-2 flex flex-wrap gap-1">
              {customer.tags.map((tag) => (
                <Badge key={tag.id} variant="outline" className="text-[10px]">
                  {tag.name}
                </Badge>
              ))}
            </div>
          ) : null}
        </div>

        <section>
          <h2 className="text-xs font-medium tracking-wide text-muted-foreground uppercase">Profile</h2>
          <div className="mt-3">
            <CustomerProfileForm customer={customer} />
          </div>
        </section>

        <Separator />

        <section>
          <h2 className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
            Leads ({customer.leads.length})
          </h2>
          {customer.leads.length === 0 ? (
            <p className="mt-2 text-sm text-muted-foreground">No leads yet.</p>
          ) : (
            <ul className="mt-3 space-y-2">
              {customer.leads.map((lead) => (
                <li key={lead.id}>
                  <Link
                    href={`/dashboard/leads/${lead.id}`}
                    className="flex items-center justify-between rounded-lg border border-border p-3 hover:bg-accent/50"
                  >
                    <div>
                      <p className="text-sm font-medium">{lead.intent ?? "Lead"}</p>
                      {lead.value ? (
                        <p className="text-xs text-muted-foreground">
                          ₹{Number(lead.value).toLocaleString("en-IN")}
                        </p>
                      ) : null}
                    </div>
                    <Badge variant="outline" className="text-[10px]">
                      {LEAD_STATUS_LABEL[lead.status]}
                    </Badge>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>

        <Separator />

        <section>
          <h2 className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
            Recent conversations
          </h2>
          {customer.conversations.length === 0 ? (
            <p className="mt-2 text-sm text-muted-foreground">No conversations yet.</p>
          ) : (
            <ul className="mt-3 space-y-2">
              {customer.conversations.map((conversation) => (
                <li key={conversation.id}>
                  <Link
                    href={`/dashboard/inbox?c=${conversation.id}`}
                    className="block rounded-lg border border-border p-3 text-sm hover:bg-accent/50"
                  >
                    {new Date(conversation.lastMessageAt).toLocaleDateString(undefined, {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                    })}
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>

        <Separator />

        <section>
          <h2 className="text-xs font-medium tracking-wide text-muted-foreground uppercase">Notes</h2>
          <div className="mt-3">
            <CustomerNotes customerId={customer.id} notes={customer.notes} />
          </div>
        </section>
      </div>
    </ScrollArea>
  );
}
