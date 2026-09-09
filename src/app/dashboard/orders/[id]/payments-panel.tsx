"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import type { Payment, User } from "@prisma/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Plus } from "lucide-react";
import { paymentMethodValues } from "@/lib/validation/orders";
import { recordPaymentAction } from "../actions";

const METHOD_LABEL: Record<(typeof paymentMethodValues)[number], string> = {
  CASH: "Cash",
  UPI: "UPI",
  BANK_TRANSFER: "Bank transfer",
  CARD: "Card",
  OTHER: "Other",
};

type PaymentWithUser = Payment & { recordedBy: User | null };

export function PaymentsPanel({
  orderId,
  payments,
  balanceDue,
}: {
  orderId: string;
  payments: PaymentWithUser[];
  balanceDue: number;
}) {
  const [pending, startTransition] = useTransition();
  const [amount, setAmount] = useState(balanceDue > 0 ? String(balanceDue) : "");
  const [method, setMethod] = useState<(typeof paymentMethodValues)[number]>("CASH");
  const [reference, setReference] = useState("");

  function record() {
    if (!amount || Number(amount) <= 0) {
      toast.error("Enter a valid amount.");
      return;
    }
    startTransition(async () => {
      const result = await recordPaymentAction({
        orderId,
        amount: Number(amount),
        method,
        reference,
      });
      if (result?.error) {
        toast.error(result.error);
        return;
      }
      setAmount("");
      setReference("");
      toast.success("Payment recorded.");
    });
  }

  return (
    <div className="space-y-3">
      {payments.length === 0 ? (
        <p className="text-sm text-muted-foreground">No payments recorded yet.</p>
      ) : (
        <ul className="space-y-2">
          {payments.map((payment) => (
            <li key={payment.id} className="flex items-center justify-between rounded-lg border border-border p-3">
              <div>
                <p className="text-sm font-medium">₹{Number(payment.amount).toLocaleString("en-IN")}</p>
                <p className="text-xs text-muted-foreground">
                  {METHOD_LABEL[payment.method]}
                  {payment.reference ? ` · ${payment.reference}` : ""} · {payment.recordedBy?.name ?? "Unknown"}
                </p>
              </div>
              <span className="text-[11px] text-muted-foreground">
                {new Date(payment.createdAt).toLocaleDateString(undefined, { month: "short", day: "numeric" })}
              </span>
            </li>
          ))}
        </ul>
      )}

      <div className="flex flex-wrap items-end gap-2 border-t border-border pt-3">
        <div className="w-28">
          <Input
            type="number"
            placeholder="Amount"
            value={amount}
            onChange={(event) => setAmount(event.target.value)}
          />
        </div>
        <Select value={method} onValueChange={(value) => setMethod(value as (typeof paymentMethodValues)[number])}>
          <SelectTrigger className="w-36">
            <SelectValue>{(value) => METHOD_LABEL[value as (typeof paymentMethodValues)[number]]}</SelectValue>
          </SelectTrigger>
          <SelectContent>
            {paymentMethodValues.map((value) => (
              <SelectItem key={value} value={value}>
                {METHOD_LABEL[value]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Input
          placeholder="Reference (optional)"
          value={reference}
          onChange={(event) => setReference(event.target.value)}
          className="w-40"
        />
        <Button type="button" disabled={pending} onClick={record}>
          {pending ? <Loader2 className="size-4 animate-spin" /> : <Plus className="size-4" />}
          Record payment
        </Button>
      </div>
    </div>
  );
}
