"use client";

import { useTransition } from "react";
import { toast } from "sonner";
import type { OrderStatus } from "@prisma/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2 } from "lucide-react";
import { updateOrderStatusAction } from "../actions";

export function OrderStatusActions({ orderId, status }: { orderId: string; status: OrderStatus }) {
  const [pending, startTransition] = useTransition();

  function setStatus(next: OrderStatus) {
    startTransition(async () => {
      const result = await updateOrderStatusAction({ orderId, status: next });
      if (result?.error) toast.error(result.error);
    });
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Badge variant="outline">{status}</Badge>
      {pending ? <Loader2 className="size-4 animate-spin text-muted-foreground" /> : null}
      {status === "PENDING" ? (
        <Button size="sm" variant="outline" disabled={pending} onClick={() => setStatus("CONFIRMED")}>
          Confirm
        </Button>
      ) : null}
      {status === "CONFIRMED" ? (
        <Button size="sm" variant="outline" disabled={pending} onClick={() => setStatus("FULFILLED")}>
          Mark fulfilled
        </Button>
      ) : null}
      {status !== "CANCELLED" && status !== "FULFILLED" ? (
        <Button size="sm" variant="ghost" disabled={pending} onClick={() => setStatus("CANCELLED")}>
          Cancel
        </Button>
      ) : null}
    </div>
  );
}
