import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { requireMembership } from "@/server/authorization/require-session";
import { db } from "@/server/db/client";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { ProductEditForm } from "./product-edit-form";
import { InventoryList } from "./inventory-list";

export const metadata: Metadata = { title: "Product" };

export default async function ProductDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { membership } = await requireMembership();
  const business = membership.organization.businesses[0];
  if (!business) redirect("/onboarding");

  const [product, categories] = await Promise.all([
    db.product.findFirst({
      where: { id, businessId: business.id },
      include: {
        inventoryItems: { include: { variant: true } },
      },
    }),
    db.productCategory.findMany({ where: { businessId: business.id }, orderBy: { name: "asc" } }),
  ]);
  if (!product) notFound();

  return (
    <ScrollArea className="h-full">
      <div className="mx-auto max-w-2xl space-y-8 px-6 py-8">
        <div>
          <Link href="/dashboard/products" className="text-sm text-muted-foreground hover:underline">
            ← Products
          </Link>
          <h1 className="mt-2 text-xl font-semibold">{product.name}</h1>
        </div>

        <section>
          <h2 className="text-xs font-medium tracking-wide text-muted-foreground uppercase">Details</h2>
          <div className="mt-3">
            <ProductEditForm product={product} categories={categories} />
          </div>
        </section>

        <Separator />

        <section>
          <h2 className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
            Inventory
          </h2>
          <div className="mt-3">
            <InventoryList items={product.inventoryItems} />
          </div>
        </section>
      </div>
    </ScrollArea>
  );
}
