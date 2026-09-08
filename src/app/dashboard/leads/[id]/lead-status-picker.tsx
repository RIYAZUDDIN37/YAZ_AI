"use client";

import { useTransition } from "react";
import { toast } from "sonner";
import type { LeadStatus } from "@prisma/client";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { updateLeadStatusAction } from "../actions";

const STATUSES: { value: LeadStatus; label: string }[] = [
  { value: "NEW", label: "New" },
  { value: "QUALIFIED", label: "Qualified" },
  { value: "CONTACTED", label: "Contacted" },
  { value: "APPOINTMENT", label: "Appointment" },
  { value: "PROPOSAL", label: "Proposal" },
  { value: "WON", label: "Won" },
  { value: "LOST", label: "Lost" },
];

export function LeadStatusPicker({ leadId, status }: { leadId: string; status: LeadStatus }) {
  const [pending, startTransition] = useTransition();

  function setStatus(next: LeadStatus) {
    if (next === status) return;
    startTransition(async () => {
      const result = await updateLeadStatusAction({ leadId, status: next });
      if (result?.error) toast.error(result.error);
    });
  }

  return (
    <div className="flex flex-wrap gap-1.5">
      {STATUSES.map((option) => (
        <Button
          key={option.value}
          type="button"
          size="sm"
          variant={option.value === status ? "default" : "outline"}
          disabled={pending}
          onClick={() => setStatus(option.value)}
          className={cn(option.value === status && "pointer-events-none")}
        >
          {option.label}
        </Button>
      ))}
    </div>
  );
}
