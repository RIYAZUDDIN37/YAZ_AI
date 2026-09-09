import { db } from "@/server/db/client";
import { NotFoundError } from "@/lib/errors";

/**
 * Notifications aren't gated by a permission — everyone who can see the
 * dashboard sees their own (`userId` set) plus the business-wide ones
 * (`userId: null`). Marking read only ever touches rows that already
 * satisfy that same visibility rule for this user.
 */
export async function markNotificationRead(businessId: string, userId: string, notificationId: string) {
  const notification = await db.notification.findFirst({
    where: { id: notificationId, businessId, OR: [{ userId }, { userId: null }] },
  });
  if (!notification) {
    throw new NotFoundError("That notification couldn't be found.");
  }

  if (notification.readAt) return notification;

  return db.notification.update({
    where: { id: notification.id },
    data: { readAt: new Date() },
  });
}

export async function markAllNotificationsRead(businessId: string, userId: string) {
  await db.notification.updateMany({
    where: { businessId, OR: [{ userId }, { userId: null }], readAt: null },
    data: { readAt: new Date() },
  });
}
