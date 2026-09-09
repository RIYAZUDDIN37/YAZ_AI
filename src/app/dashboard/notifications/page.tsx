import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { requireMembership } from "@/server/authorization/require-session";
import { db } from "@/server/db/client";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Bell } from "lucide-react";
import { NotificationList } from "./notification-list";

export const metadata: Metadata = { title: "Notifications" };

export default async function NotificationsPage() {
  const { session, membership } = await requireMembership();
  const business = membership.organization.businesses[0];
  if (!business) redirect("/onboarding");

  const notifications = await db.notification.findMany({
    where: { businessId: business.id, userId: session.user.id },
    orderBy: { createdAt: "desc" },
    take: 50,
  });

  return (
    <ScrollArea className="h-full">
      <div className="mx-auto max-w-2xl px-6 py-8">
        <div className="mb-6">
          <h1 className="text-xl font-semibold">Notifications</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Real alerts from your automations — nothing here unless something actually fired.
          </p>
        </div>

        {notifications.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border py-16 text-center">
            <Bell className="size-8 text-muted-foreground" />
            <p className="mt-3 text-sm font-medium">No notifications yet</p>
            <p className="mt-1 max-w-xs text-sm text-muted-foreground text-pretty">
              Set up an automation with a &ldquo;Notify the team&rdquo; action to see one land here.
            </p>
          </div>
        ) : (
          <NotificationList notifications={notifications} />
        )}
      </div>
    </ScrollArea>
  );
}
