import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { requireMembership } from "@/server/authorization/require-session";
import { db } from "@/server/db/client";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ShoppingBag } from "lucide-react";
import { NewOrderDialog } from "./new-order-dialog";

export const metadata: Metadata = { title: "Orders" };

const STATUS_VARIANT: Record<string, "default" | "secondary" | "outline"> = {
  PENDING: "secondary",
  CONFIRMED: "outline",
  FULFILLED: "default",
  CANCELLED: "outline",
};

export default async function OrdersPage() {
  const { membership } = await requireMembership();
  const business = membership.organization.businesses[0];
  if (!business) redirect("/onboarding");

  const [orders, customers] = await Promise.all([
    db.order.findMany({
      where: { businessId: business.id },
      orderBy: { createdAt: "desc" },
      include: { customer: true, items: true, payments: true },
    }),
    db.customer.findMany({ where: { businessId: business.id }, orderBy: { name: "asc" } }),
  ]);

  return (
    <ScrollArea className="h-full">
      <div className="mx-auto max-w-4xl px-6 py-8">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-xl font-semibold">Orders</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              What {business.name}&apos;s customers have bought.
            </p>
          </div>
          <NewOrderDialog customers={customers} />
        </div>

        {orders.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border py-16 text-center">
            <ShoppingBag className="size-8 text-muted-foreground" />
            <p className="mt-3 text-sm font-medium">No orders yet</p>
            <p className="mt-1 max-w-xs text-sm text-muted-foreground text-pretty">
              Create one directly, or convert an accepted quotation.
            </p>
          </div>
        ) : (
          <ul className="space-y-2">
            {orders.map((order) => {
              const total = order.items.reduce((sum, item) => sum + Number(item.unitPrice) * item.quantity, 0);
              const paid = order.payments.reduce((sum, payment) => sum + Number(payment.amount), 0);
              return (
                <li key={order.id}>
                  <Link
                    href={`/dashboard/orders/${order.id}`}
                    className="flex items-center justify-between gap-3 rounded-lg border border-border p-3.5 hover:bg-accent/50"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">{order.customer?.name ?? "Unknown customer"}</p>
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        {order.items.length} item{order.items.length === 1 ? "" : "s"} · {paid >= total && total > 0 ? "Paid in full" : `₹${paid.toLocaleString("en-IN")} paid`}
                      </p>
                    </div>
                    <div className="flex shrink-0 items-center gap-3">
                      <span className="text-sm tabular-nums text-muted-foreground">
                        ₹{total.toLocaleString("en-IN")}
                      </span>
                      <Badge variant={STATUS_VARIANT[order.status]} className="text-[10px]">
                        {order.status}
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
