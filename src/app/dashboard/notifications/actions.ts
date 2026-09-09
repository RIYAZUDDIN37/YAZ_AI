"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireMembership } from "@/server/authorization/require-session";
import { markNotificationRead, markAllNotificationsRead } from "@/services/notifications/mark-read";
import { toActionError } from "@/lib/handle-error";

async function currentContext() {
  const { session, membership } = await requireMembership();
  const business = membership.organization.businesses[0];
  if (!business) redirect("/onboarding");
  return { session, business };
}

export async function markNotificationReadAction(notificationId: string): Promise<{ error?: string }> {
  const { session, business } = await currentContext();
  try {
    await markNotificationRead(business.id, session.user.id, notificationId);
    revalidatePath("/dashboard/notifications");
    revalidatePath("/dashboard");
    return {};
  } catch (error) {
    return toActionError(error);
  }
}

export async function markAllNotificationsReadAction(): Promise<{ error?: string }> {
  const { session, business } = await currentContext();
  try {
    await markAllNotificationsRead(business.id, session.user.id);
    revalidatePath("/dashboard/notifications");
    revalidatePath("/dashboard");
    return {};
  } catch (error) {
    return toActionError(error);
  }
}
