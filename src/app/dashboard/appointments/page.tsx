import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { requireMembership } from "@/server/authorization/require-session";
import { db } from "@/server/db/client";
import { getIndustryConfig } from "@/config/industries";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { CalendarClock } from "lucide-react";
import { NewAppointmentDialog } from "./new-appointment-dialog";
import { AppointmentStatusBadge } from "./appointment-status-badge";
import { AppointmentStatusActions } from "./appointment-status-actions";

export const metadata: Metadata = { title: "Appointments" };

export default async function AppointmentsPage() {
  const { membership } = await requireMembership();
  const business = membership.organization.businesses[0];
  if (!business) redirect("/onboarding");

  const industryConfig = getIndustryConfig(business.industry);

  const [appointments, customers] = await Promise.all([
    db.appointment.findMany({
      where: { businessId: business.id },
      orderBy: { scheduledAt: "asc" },
      include: { customer: true },
    }),
    db.customer.findMany({ where: { businessId: business.id }, orderBy: { name: "asc" } }),
  ]);

  return (
    <ScrollArea className="h-full">
      <div className="mx-auto max-w-5xl px-6 py-8">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-xl font-semibold">{industryConfig.appointmentLabel}s</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Real appointments for {business.name}, human- and AI-booked.
            </p>
          </div>
          <NewAppointmentDialog customers={customers} appointmentLabel={industryConfig.appointmentLabel} />
        </div>

        {appointments.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border py-16 text-center">
            <CalendarClock className="size-8 text-muted-foreground" />
            <p className="mt-3 text-sm font-medium">No {industryConfig.appointmentLabel.toLowerCase()}s yet</p>
            <p className="mt-1 max-w-xs text-sm text-muted-foreground text-pretty">
              {customers.length === 0
                ? "Add a customer first, then you can book one."
                : `Book your first ${industryConfig.appointmentLabel.toLowerCase()}, or let your AI employee book one from a conversation.`}
            </p>
          </div>
        ) : (
          <div className="overflow-hidden rounded-xl border border-border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Customer</TableHead>
                  <TableHead>Purpose</TableHead>
                  <TableHead>When</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {appointments.map((appointment) => (
                  <TableRow key={appointment.id}>
                    <TableCell className="font-medium">
                      {appointment.customer?.name ?? "Unknown"}
                    </TableCell>
                    <TableCell className="max-w-xs truncate text-muted-foreground">
                      {appointment.purpose}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {new Date(appointment.scheduledAt).toLocaleString(undefined, {
                        month: "short",
                        day: "numeric",
                        hour: "numeric",
                        minute: "2-digit",
                      })}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1.5">
                        <AppointmentStatusBadge status={appointment.status} />
                        {appointment.source === "AI conversation" ? (
                          <Badge variant="secondary" className="text-[10px]">
                            AI
                          </Badge>
                        ) : null}
                      </div>
                    </TableCell>
                    <TableCell>
                      <AppointmentStatusActions appointmentId={appointment.id} status={appointment.status} />
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
