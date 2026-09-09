import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { requireMembership } from "@/server/authorization/require-session";
import { db } from "@/server/db/client";
import { getIndustryConfig } from "@/config/industries";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { QuotationStatusActions } from "./quotation-status-actions";
import { QuotationItems } from "./quotation-items";

export const metadata: Metadata = { title: "Quotation" };

export default async function QuotationDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { membership } = await requireMembership();
  const business = membership.organization.businesses[0];
  if (!business) redirect("/onboarding");

  const industryConfig = getIndustryConfig(business.industry);

  const quotation = await db.quotation.findFirst({
    where: { id, businessId: business.id },
    include: { customer: true, lead: true, items: true, order: true },
  });
  if (!quotation) notFound();

  const catalogueItems =
    industryConfig.catalogueType === "services"
      ? await db.service.findMany({ where: { businessId: business.id, status: "ACTIVE" }, orderBy: { name: "asc" } })
      : await db.product.findMany({ where: { businessId: business.id, status: "ACTIVE" }, orderBy: { name: "asc" } });

  const total = quotation.items.reduce((sum, item) => sum + Number(item.unitPrice) * item.quantity, 0);

  return (
    <ScrollArea className="h-full">
      <div className="mx-auto max-w-2xl space-y-8 px-6 py-8">
        <div>
          <Link href="/dashboard/quotations" className="text-sm text-muted-foreground hover:underline">
            ← Quotations
          </Link>
          <h1 className="mt-2 text-xl font-semibold">{quotation.customer?.name ?? "Unknown customer"}</h1>
          {quotation.lead ? (
            <p className="mt-1 text-sm text-muted-foreground">For: {quotation.lead.intent}</p>
          ) : null}
        </div>

        <section>
          <h2 className="text-xs font-medium tracking-wide text-muted-foreground uppercase">Status</h2>
          <div className="mt-3">
            <QuotationStatusActions
              quotationId={quotation.id}
              status={quotation.status}
              hasOrder={!!quotation.order}
            />
          </div>
        </section>

        <Separator />

        <section>
          <h2 className="text-xs font-medium tracking-wide text-muted-foreground uppercase">Items</h2>
          <div className="mt-3">
            <QuotationItems
              quotationId={quotation.id}
              items={quotation.items}
              total={total}
              catalogueItems={catalogueItems}
              editable={quotation.status === "DRAFT"}
            />
          </div>
        </section>

        {quotation.notes ? (
          <>
            <Separator />
            <section>
              <h2 className="text-xs font-medium tracking-wide text-muted-foreground uppercase">Notes</h2>
              <p className="mt-3 text-sm text-pretty">{quotation.notes}</p>
            </section>
          </>
        ) : null}

        {quotation.order ? (
          <>
            <Separator />
            <section>
              <h2 className="text-xs font-medium tracking-wide text-muted-foreground uppercase">Order</h2>
              <Link
                href={`/dashboard/orders/${quotation.order.id}`}
                className="mt-3 inline-block text-sm text-brand hover:underline"
              >
                View order →
              </Link>
            </section>
          </>
        ) : null}
      </div>
    </ScrollArea>
  );
}
