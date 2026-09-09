import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { requireMembership } from "@/server/authorization/require-session";
import { db } from "@/server/db/client";
import { getIndustryConfig } from "@/config/industries";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { OrderStatusActions } from "./order-status-actions";
import { OrderItems } from "./order-items";
import { PaymentsPanel } from "./payments-panel";

export const metadata: Metadata = { title: "Order" };

export default async function OrderDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { membership } = await requireMembership();
  const business = membership.organization.businesses[0];
  if (!business) redirect("/onboarding");

  const industryConfig = getIndustryConfig(business.industry);

  const order = await db.order.findFirst({
    where: { id, businessId: business.id },
    include: {
      customer: true,
      quotation: true,
      items: true,
      payments: { include: { recordedBy: true }, orderBy: { createdAt: "desc" } },
    },
  });
  if (!order) notFound();

  const catalogueItems =
    industryConfig.catalogueType === "services"
      ? await db.service.findMany({ where: { businessId: business.id, status: "ACTIVE" }, orderBy: { name: "asc" } })
      : await db.product.findMany({ where: { businessId: business.id, status: "ACTIVE" }, orderBy: { name: "asc" } });

  const total = order.items.reduce((sum, item) => sum + Number(item.unitPrice) * item.quantity, 0);
  const paid = order.payments.reduce((sum, payment) => sum + Number(payment.amount), 0);

  return (
    <ScrollArea className="h-full">
      <div className="mx-auto max-w-2xl space-y-8 px-6 py-8">
        <div>
          <Link href="/dashboard/orders" className="text-sm text-muted-foreground hover:underline">
            ← Orders
          </Link>
          <h1 className="mt-2 text-xl font-semibold">{order.customer?.name ?? "Unknown customer"}</h1>
          {order.quotation ? (
            <Link
              href={`/dashboard/quotations/${order.quotation.id}`}
              className="mt-1 inline-block text-sm text-muted-foreground hover:underline"
            >
              From quotation →
            </Link>
          ) : null}
        </div>

        <section>
          <h2 className="text-xs font-medium tracking-wide text-muted-foreground uppercase">Status</h2>
          <div className="mt-3">
            <OrderStatusActions orderId={order.id} status={order.status} />
          </div>
        </section>

        <Separator />

        <section>
          <h2 className="text-xs font-medium tracking-wide text-muted-foreground uppercase">Items</h2>
          <div className="mt-3">
            <OrderItems
              orderId={order.id}
              items={order.items}
              total={total}
              catalogueItems={catalogueItems}
              editable={order.status !== "CANCELLED"}
            />
          </div>
        </section>

        <Separator />

        <section>
          <h2 className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
            Payments — ₹{paid.toLocaleString("en-IN")} of ₹{total.toLocaleString("en-IN")}
          </h2>
          <div className="mt-3">
            <PaymentsPanel orderId={order.id} payments={order.payments} balanceDue={Math.max(0, total - paid)} />
          </div>
        </section>
      </div>
    </ScrollArea>
  );
}
