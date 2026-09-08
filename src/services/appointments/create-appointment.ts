import { db } from "@/server/db/client";
import { ForbiddenError, NotFoundError, AppError } from "@/lib/errors";
import { can } from "@/server/authorization/permissions";
import type { OrgRole } from "@prisma/client";
import { writeAuditLog } from "@/services/audit/log";
import type { CreateAppointmentInput } from "@/lib/validation/appointments";

/**
 * A staff member booking an appointment directly — distinct from the
 * AI's createAppointment tool (src/services/ai/tools/create-appointment.ts),
 * which does the same underlying write but from a conversation, always
 * source-tagged "AI conversation".
 */
export async function createAppointment(
  businessId: string,
  actorUserId: string,
  actorRole: OrgRole,
  input: CreateAppointmentInput,
) {
  if (!can(actorRole, "customers:manage")) {
    throw new ForbiddenError("You don't have access to manage appointments.");
  }

  const customer = await db.customer.findFirst({
    where: { id: input.customerId, businessId },
  });
  if (!customer) {
    throw new NotFoundError("That customer couldn't be found.");
  }

  const scheduledAt = new Date(input.scheduledAt);
  if (Number.isNaN(scheduledAt.getTime())) {
    throw new AppError("Enter a valid date and time.");
  }

  const appointment = await db.appointment.create({
    data: {
      businessId,
      customerId: customer.id,
      assignedToUserId: actorUserId,
      purpose: input.purpose,
      scheduledAt,
      status: "SCHEDULED",
    },
  });

  await writeAuditLog({
    action: "appointment.created",
    businessId,
    userId: actorUserId,
    metadata: { appointmentId: appointment.id, customerId: customer.id },
  });

  return appointment;
}
