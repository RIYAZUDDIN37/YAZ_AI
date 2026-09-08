import { db } from "@/server/db/client";
import { ForbiddenError, NotFoundError } from "@/lib/errors";
import { can } from "@/server/authorization/permissions";
import type { OrgRole } from "@prisma/client";
import { writeAuditLog } from "@/services/audit/log";
import type { UpdateAppointmentStatusInput } from "@/lib/validation/appointments";

export async function updateAppointmentStatus(
  businessId: string,
  actorRole: OrgRole,
  input: UpdateAppointmentStatusInput,
) {
  if (!can(actorRole, "customers:manage")) {
    throw new ForbiddenError("You don't have access to manage appointments.");
  }

  const appointment = await db.appointment.findFirst({
    where: { id: input.appointmentId, businessId },
  });
  if (!appointment) {
    throw new NotFoundError("That appointment couldn't be found.");
  }

  const updated = await db.appointment.update({
    where: { id: appointment.id },
    data: { status: input.status },
  });

  await writeAuditLog({
    action: "appointment.status_changed",
    businessId,
    metadata: { appointmentId: appointment.id, from: appointment.status, to: input.status },
  });

  return updated;
}
