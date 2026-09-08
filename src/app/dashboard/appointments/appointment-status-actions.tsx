"use client";

import { useTransition } from "react";
import { toast } from "sonner";
import type { AppointmentStatus } from "@prisma/client";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import { updateAppointmentStatusAction } from "./actions";

export function AppointmentStatusActions({
  appointmentId,
  status,
}: {
  appointmentId: string;
  status: AppointmentStatus;
}) {
  const [pending, startTransition] = useTransition();

  function setStatus(next: AppointmentStatus) {
    startTransition(async () => {
      const result = await updateAppointmentStatusAction({ appointmentId, status: next });
      if (result?.error) toast.error(result.error);
    });
  }

  if (status === "COMPLETED" || status === "CANCELLED" || status === "NO_SHOW") {
    return null;
  }

  return (
    <div className="flex justify-end gap-1.5">
      {status === "SCHEDULED" ? (
        <Button size="sm" variant="outline" disabled={pending} onClick={() => setStatus("CONFIRMED")}>
          {pending ? <Loader2 className="size-3.5 animate-spin" /> : null}
          Confirm
        </Button>
      ) : null}
      <Button size="sm" variant="outline" disabled={pending} onClick={() => setStatus("COMPLETED")}>
        Complete
      </Button>
      <Button size="sm" variant="outline" disabled={pending} onClick={() => setStatus("NO_SHOW")}>
        No-show
      </Button>
      <Button size="sm" variant="ghost" disabled={pending} onClick={() => setStatus("CANCELLED")}>
        Cancel
      </Button>
    </div>
  );
}
