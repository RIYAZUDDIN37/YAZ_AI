"use client";

import { useTransition } from "react";
import { toast } from "sonner";
import type { Notification } from "@prisma/client";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { markNotificationReadAction, markAllNotificationsReadAction } from "./actions";

export function NotificationList({ notifications }: { notifications: Notification[] }) {
  const [pending, startTransition] = useTransition();
  const hasUnread = notifications.some((n) => !n.readAt);

  function markAllRead() {
    startTransition(async () => {
      const result = await markAllNotificationsReadAction();
      if (result?.error) toast.error(result.error);
    });
  }

  function markRead(id: string) {
    startTransition(async () => {
      const result = await markNotificationReadAction(id);
      if (result?.error) toast.error(result.error);
    });
  }

  return (
    <div className="space-y-3">
      {hasUnread ? (
        <div className="flex justify-end">
          <Button size="sm" variant="outline" disabled={pending} onClick={markAllRead}>
            Mark all read
          </Button>
        </div>
      ) : null}
      <ul className="space-y-2">
        {notifications.map((notification) => (
          <li
            key={notification.id}
            className={cn(
              "flex items-start justify-between gap-3 rounded-lg border p-3.5",
              notification.readAt ? "border-border" : "border-brand/30 bg-brand/5",
            )}
          >
            <div>
              <p className="text-sm font-medium">{notification.title}</p>
              <p className="mt-1 text-sm text-muted-foreground text-pretty">{notification.body}</p>
              <p className="mt-1.5 text-[11px] text-muted-foreground">
                {new Date(notification.createdAt).toLocaleString(undefined, {
                  month: "short",
                  day: "numeric",
                  hour: "numeric",
                  minute: "2-digit",
                })}
              </p>
            </div>
            {!notification.readAt ? (
              <Button
                size="sm"
                variant="ghost"
                disabled={pending}
                onClick={() => markRead(notification.id)}
              >
                Mark read
              </Button>
            ) : null}
          </li>
        ))}
      </ul>
    </div>
  );
}
