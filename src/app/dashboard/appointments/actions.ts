"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireMembership } from "@/server/authorization/require-session";
import { createAppointment } from "@/services/appointments/create-appointment";
import { updateAppointmentStatus } from "@/services/appointments/update-status";
import {
  createAppointmentSchema,
  updateAppointmentStatusSchema,
  type CreateAppointmentInput,
  type UpdateAppointmentStatusInput,
} from "@/lib/validation/appointments";
import { toActionError } from "@/lib/handle-error";

async function currentBusiness() {
  const { session, membership } = await requireMembership();
  const business = membership.organization.businesses[0];
  if (!business) redirect("/onboarding");
  return { session, membership, business };
}

export async function createAppointmentAction(
  input: CreateAppointmentInput,
): Promise<{ error?: string; appointmentId?: string }> {
  const parsed = createAppointmentSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid input." };

  const { session, membership, business } = await currentBusiness();
  try {
    const appointment = await createAppointment(business.id, session.user.id, membership.role, parsed.data);
    revalidatePath("/dashboard/appointments");
    return { appointmentId: appointment.id };
  } catch (error) {
    return toActionError(error);
  }
}

export async function updateAppointmentStatusAction(
  input: UpdateAppointmentStatusInput,
): Promise<{ error?: string }> {
  const parsed = updateAppointmentStatusSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid input." };

  const { membership, business } = await currentBusiness();
  try {
    await updateAppointmentStatus(business.id, membership.role, parsed.data);
    revalidatePath("/dashboard/appointments");
    return {};
  } catch (error) {
    return toActionError(error);
  }
}
