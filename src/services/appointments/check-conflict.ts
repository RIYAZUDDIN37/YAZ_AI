import { db } from "@/server/db/client";

/**
 * Real overlap checking against existing Appointment rows — no separate
 * AvailabilitySlot table (see the schema.prisma section comment).
 * Treats the business as one implicit resource: two appointments at the
 * same business can't overlap, regardless of who they're assigned to.
 * CANCELLED/NO_SHOW appointments don't occupy a slot.
 */
export async function findAppointmentConflict(
  businessId: string,
  scheduledAt: Date,
  durationMinutes: number,
  excludeAppointmentId?: string,
) {
  const newStart = scheduledAt;
  const newEnd = new Date(scheduledAt.getTime() + durationMinutes * 60_000);

  const candidates = await db.appointment.findMany({
    where: {
      businessId,
      status: { notIn: ["CANCELLED", "NO_SHOW"] },
      id: excludeAppointmentId ? { not: excludeAppointmentId } : undefined,
      // Narrow with a date-range filter before the precise overlap check
      // below — a appointment starting more than a day away can't
      // possibly overlap a same-day slot.
      scheduledAt: {
        gte: new Date(newStart.getTime() - 24 * 60 * 60_000),
        lte: new Date(newEnd.getTime() + 24 * 60 * 60_000),
      },
    },
    include: { customer: true },
  });

  return candidates.find((candidate) => {
    const existingStart = candidate.scheduledAt;
    const existingEnd = new Date(existingStart.getTime() + candidate.durationMinutes * 60_000);
    return existingStart < newEnd && existingEnd > newStart;
  });
}
