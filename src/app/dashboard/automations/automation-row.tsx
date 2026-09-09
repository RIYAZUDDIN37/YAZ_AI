"use client";

import { useTransition } from "react";
import { toast } from "sonner";
import type { Automation } from "@prisma/client";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Trash2 } from "lucide-react";
import { toggleAutomationAction, deleteAutomationAction } from "./actions";

const TRIGGER_LABEL: Record<string, string> = {
  LEAD_CREATED: "A lead is created",
  LEAD_STATUS_CHANGED: "A lead's status changes",
  CONVERSATION_ESCALATED: "The AI escalates a conversation",
  APPOINTMENT_BOOKED: "An appointment is booked",
};

const ACTION_LABEL: Record<string, string> = {
  NOTIFY_TEAM: "notify the team",
  ADD_LEAD_NOTE: "add a note to the lead",
  CHANGE_LEAD_STATUS: "change the lead's status",
};

export function AutomationRow({ automation }: { automation: Automation }) {
  const [pending, startTransition] = useTransition();

  const triggerConfig = automation.triggerConfig as { status?: string } | null;
  const triggerLabel =
    automation.triggerEvent === "LEAD_STATUS_CHANGED" && triggerConfig?.status
      ? `A lead's status changes to ${triggerConfig.status}`
      : TRIGGER_LABEL[automation.triggerEvent];

  function toggle(isActive: boolean) {
    startTransition(async () => {
      const result = await toggleAutomationAction({ automationId: automation.id, isActive });
      if (result?.error) toast.error(result.error);
    });
  }

  function remove() {
    startTransition(async () => {
      const result = await deleteAutomationAction({ automationId: automation.id });
      if (result?.error) toast.error(result.error);
    });
  }

  return (
    <li className="flex items-center justify-between gap-3 rounded-lg border border-border p-3.5">
      <div className="flex items-start gap-3">
        <Switch checked={automation.isActive} onCheckedChange={toggle} disabled={pending} className="mt-0.5" />
        <div>
          <p className={automation.isActive ? "text-sm font-medium" : "text-sm font-medium text-muted-foreground"}>
            {automation.name}
          </p>
          <p className="mt-0.5 text-xs text-muted-foreground">
            When {triggerLabel.toLowerCase()}, {ACTION_LABEL[automation.actionType]}.
          </p>
        </div>
      </div>
      <Button size="icon" variant="ghost" disabled={pending} onClick={remove} aria-label="Delete automation">
        <Trash2 className="size-4" />
      </Button>
    </li>
  );
}
