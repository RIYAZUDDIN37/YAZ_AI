import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { requireMembership } from "@/server/authorization/require-session";
import { db } from "@/server/db/client";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Users } from "lucide-react";
import { NewCustomerDialog } from "./new-customer-dialog";

export const metadata: Metadata = { title: "Customers" };

export default async function CustomersPage() {
  const { membership } = await requireMembership();
  const business = membership.organization.businesses[0];
  if (!business) redirect("/onboarding");

  const customers = await db.customer.findMany({
    where: { businessId: business.id },
    orderBy: { createdAt: "desc" },
    include: {
      tags: true,
      _count: { select: { leads: true } },
    },
  });

  return (
    <ScrollArea className="h-full">
      <div className="mx-auto max-w-5xl px-6 py-8">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-xl font-semibold">Customers</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Everyone who&apos;s contacted {business.name}.
            </p>
          </div>
          <NewCustomerDialog />
        </div>

        {customers.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border py-16 text-center">
            <Users className="size-8 text-muted-foreground" />
            <p className="mt-3 text-sm font-medium">No customers yet</p>
            <p className="mt-1 max-w-xs text-sm text-muted-foreground text-pretty">
              Add your first customer to start tracking conversations and leads.
            </p>
          </div>
        ) : (
          <div className="overflow-hidden rounded-xl border border-border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Contact</TableHead>
                  <TableHead>Source</TableHead>
                  <TableHead>Tags</TableHead>
                  <TableHead className="text-right">Leads</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {customers.map((customer) => (
                  <TableRow key={customer.id} className="cursor-pointer">
                    <TableCell className="font-medium">
                      <Link href={`/dashboard/customers/${customer.id}`} className="hover:underline">
                        {customer.name}
                      </Link>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {customer.email ?? customer.phone ?? "—"}
                    </TableCell>
                    <TableCell className="text-muted-foreground">{customer.source ?? "—"}</TableCell>
                    <TableCell>
                      {customer.tags.length === 0 ? (
                        <span className="text-muted-foreground">—</span>
                      ) : (
                        <div className="flex flex-wrap gap-1">
                          {customer.tags.map((tag) => (
                            <Badge key={tag.id} variant="outline" className="text-[10px]">
                              {tag.name}
                            </Badge>
                          ))}
                        </div>
                      )}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">{customer._count.leads}</TableCell>
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
