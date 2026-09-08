import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { requireMembership } from "@/server/authorization/require-session";
import { db } from "@/server/db/client";
import { getIndustryConfig } from "@/config/industries";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Package } from "lucide-react";
import { NewProductDialog } from "./new-product-dialog";

export const metadata: Metadata = { title: "Products" };

const STATUS_VARIANT: Record<string, "default" | "secondary" | "outline"> = {
  ACTIVE: "default",
  DRAFT: "secondary",
  ARCHIVED: "outline",
};

export default async function ProductsPage() {
  const { membership } = await requireMembership();
  const business = membership.organization.businesses[0];
  if (!business) redirect("/onboarding");

  const industryConfig = getIndustryConfig(business.industry);

  const [products, categories] = await Promise.all([
    db.product.findMany({
      where: { businessId: business.id },
      orderBy: { createdAt: "desc" },
      include: {
        category: true,
        inventoryItems: true,
      },
    }),
    db.productCategory.findMany({ where: { businessId: business.id }, orderBy: { name: "asc" } }),
  ]);

  return (
    <ScrollArea className="h-full">
      <div className="mx-auto max-w-5xl px-6 py-8">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-xl font-semibold">{industryConfig.catalogueLabel}</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              What {business.name} sells, and what&apos;s in stock.
            </p>
          </div>
          <NewProductDialog categories={categories} />
        </div>

        {products.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border py-16 text-center">
            <Package className="size-8 text-muted-foreground" />
            <p className="mt-3 text-sm font-medium">No {industryConfig.catalogueLabel.toLowerCase()} yet</p>
            <p className="mt-1 max-w-xs text-sm text-muted-foreground text-pretty">
              Add your first product to start selling and let your AI employee search real stock.
            </p>
          </div>
        ) : (
          <div className="overflow-hidden rounded-xl border border-border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead className="text-right">Price</TableHead>
                  <TableHead className="text-right">Stock</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {products.map((product) => {
                  const totalStock = product.inventoryItems.reduce(
                    (sum, item) => sum + item.quantityOnHand,
                    0,
                  );
                  return (
                    <TableRow key={product.id}>
                      <TableCell className="font-medium">
                        <Link href={`/dashboard/products/${product.id}`} className="hover:underline">
                          {product.name}
                        </Link>
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {product.category?.name ?? "—"}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        ₹{Number(product.price).toLocaleString("en-IN")}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {totalStock}
                        {totalStock === 0 ? (
                          <span className="ml-1.5 text-xs text-destructive">Out of stock</span>
                        ) : null}
                      </TableCell>
                      <TableCell>
                        <Badge variant={STATUS_VARIANT[product.status]} className="text-[10px]">
                          {product.status.charAt(0) + product.status.slice(1).toLowerCase()}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </div>
    </ScrollArea>
  );
}
