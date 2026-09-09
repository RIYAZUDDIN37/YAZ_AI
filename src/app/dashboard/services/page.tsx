import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { requireMembership } from "@/server/authorization/require-session";
import { db } from "@/server/db/client";
import { getIndustryConfig } from "@/config/industries";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Sparkles } from "lucide-react";
import { NewServiceDialog } from "./new-service-dialog";

export const metadata: Metadata = { title: "Services" };

const STATUS_VARIANT: Record<string, "default" | "secondary" | "outline"> = {
  ACTIVE: "default",
  DRAFT: "secondary",
  ARCHIVED: "outline",
};

export default async function ServicesPage() {
  const { membership } = await requireMembership();
  const business = membership.organization.businesses[0];
  if (!business) redirect("/onboarding");

  const industryConfig = getIndustryConfig(business.industry);

  const [services, categories] = await Promise.all([
    db.service.findMany({
      where: { businessId: business.id },
      orderBy: { createdAt: "desc" },
      include: { category: true },
    }),
    db.serviceCategory.findMany({ where: { businessId: business.id }, orderBy: { name: "asc" } }),
  ]);

  return (
    <ScrollArea className="h-full">
      <div className="mx-auto max-w-5xl px-6 py-8">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-xl font-semibold">{industryConfig.catalogueLabel}</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              What {business.name} offers, and how long each takes.
            </p>
          </div>
          <NewServiceDialog categories={categories} />
        </div>

        {services.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border py-16 text-center">
            <Sparkles className="size-8 text-muted-foreground" />
            <p className="mt-3 text-sm font-medium">No {industryConfig.catalogueLabel.toLowerCase()} yet</p>
            <p className="mt-1 max-w-xs text-sm text-muted-foreground text-pretty">
              Add your first service so your AI employee — and your team — knows what you offer.
            </p>
          </div>
        ) : (
          <div className="overflow-hidden rounded-xl border border-border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead className="text-right">Duration</TableHead>
                  <TableHead className="text-right">Price</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {services.map((service) => (
                  <TableRow key={service.id}>
                    <TableCell className="font-medium">
                      <Link href={`/dashboard/services/${service.id}`} className="hover:underline">
                        {service.name}
                      </Link>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {service.category?.name ?? "—"}
                    </TableCell>
                    <TableCell className="text-right tabular-nums text-muted-foreground">
                      {service.durationMinutes} min
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      ₹{Number(service.price).toLocaleString("en-IN")}
                    </TableCell>
                    <TableCell>
                      <Badge variant={STATUS_VARIANT[service.status]} className="text-[10px]">
                        {service.status.charAt(0) + service.status.slice(1).toLowerCase()}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </div>
    </ScrollArea>
  );
}
