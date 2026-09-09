"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import type { QuotationStatus } from "@prisma/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2 } from "lucide-react";
import { updateQuotationStatusAction, convertQuotationToOrderAction } from "../actions";

export function QuotationStatusActions({
  quotationId,
  status,
  hasOrder,
}: {
  quotationId: string;
  status: QuotationStatus;
  hasOrder: boolean;
}) {
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  function setStatus(next: QuotationStatus) {
    startTransition(async () => {
      const result = await updateQuotationStatusAction({ quotationId, status: next });
      if (result?.error) toast.error(result.error);
    });
  }

  function convertToOrder() {
    startTransition(async () => {
      const result = await convertQuotationToOrderAction(quotationId);
      if (result?.error) {
        toast.error(result.error);
        return;
      }
      if (result.orderId) {
        toast.success("Order created.");
        router.push(`/dashboard/orders/${result.orderId}`);
      }
    });
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Badge variant="outline">{status}</Badge>
      {pending ? <Loader2 className="size-4 animate-spin text-muted-foreground" /> : null}
      {status === "DRAFT" ? (
        <Button size="sm" variant="outline" disabled={pending} onClick={() => setStatus("SENT")}>
          Mark sent
        </Button>
      ) : null}
      {status === "SENT" ? (
        <>
          <Button size="sm" variant="outline" disabled={pending} onClick={() => setStatus("ACCEPTED")}>
            Mark accepted
          </Button>
          <Button size="sm" variant="ghost" disabled={pending} onClick={() => setStatus("DECLINED")}>
            Mark declined
          </Button>
        </>
      ) : null}
      {status === "ACCEPTED" && !hasOrder ? (
        <Button size="sm" disabled={pending} onClick={convertToOrder}>
          Convert to order
        </Button>
      ) : null}
    </div>
  );
}
