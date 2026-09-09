import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { requireMembership } from "@/server/authorization/require-session";
import { db } from "@/server/db/client";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { FileText } from "lucide-react";
import { NewQuotationDialog } from "./new-quotation-dialog";

export const metadata: Metadata = { title: "Quotations" };

const STATUS_VARIANT: Record<string, "default" | "secondary" | "outline"> = {
  DRAFT: "secondary",
  SENT: "outline",
  ACCEPTED: "default",
  DECLINED: "outline",
  EXPIRED: "outline",
};

export default async function QuotationsPage() {
  const { membership } = await requireMembership();
  const business = membership.organization.businesses[0];
  if (!business) redirect("/onboarding");

  const [quotations, customers, leads] = await Promise.all([
    db.quotation.findMany({
      where: { businessId: business.id },
      orderBy: { createdAt: "desc" },
      include: { customer: true, items: true },
    }),
    db.customer.findMany({ where: { businessId: business.id }, orderBy: { name: "asc" } }),
    db.lead.findMany({ where: { businessId: business.id }, orderBy: { createdAt: "desc" } }),
  ]);

  return (
    <ScrollArea className="h-full">
      <div className="mx-auto max-w-4xl px-6 py-8">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-xl font-semibold">Quotations</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Priced offers for {business.name}&apos;s customers.
            </p>
          </div>
          <NewQuotationDialog customers={customers} leads={leads} />
        </div>

        {quotations.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border py-16 text-center">
            <FileText className="size-8 text-muted-foreground" />
            <p className="mt-3 text-sm font-medium">No quotations yet</p>
            <p className="mt-1 max-w-xs text-sm text-muted-foreground text-pretty">
              Create one for a customer, add items, and send it.
            </p>
          </div>
        ) : (
          <ul className="space-y-2">
            {quotations.map((quotation) => {
              const total = quotation.items.reduce(
                (sum, item) => sum + Number(item.unitPrice) * item.quantity,
                0,
              );
              return (
                <li key={quotation.id}>
                  <Link
                    href={`/dashboard/quotations/${quotation.id}`}
                    className="flex items-center justify-between gap-3 rounded-lg border border-border p-3.5 hover:bg-accent/50"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">
                        {quotation.customer?.name ?? "Unknown customer"}
                      </p>
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        {quotation.items.length} item{quotation.items.length === 1 ? "" : "s"}
                      </p>
                    </div>
                    <div className="flex shrink-0 items-center gap-3">
                      <span className="text-sm tabular-nums text-muted-foreground">
                        ₹{total.toLocaleString("en-IN")}
                      </span>
                      <Badge variant={STATUS_VARIANT[quotation.status]} className="text-[10px]">
                        {quotation.status}
                      </Badge>
                    </div>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </ScrollArea>
  );
}
