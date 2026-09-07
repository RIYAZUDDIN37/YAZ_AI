"use client";

import { useTransition } from "react";
import { CheckCircle2, RotateCcw, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import type { ConversationStatus } from "@prisma/client";
import { updateConversationStatusAction } from "./actions";

export function StatusActions({
  conversationId,
  status,
}: {
  conversationId: string;
  status: ConversationStatus;
}) {
  const [pending, startTransition] = useTransition();

  function updateStatus(next: "RESOLVED" | "HUMAN_HANDLING") {
    startTransition(async () => {
      const result = await updateConversationStatusAction({
        conversationId,
        status: next,
      });
      if (result?.error) toast.error(result.error);
    });
  }

  if (status === "RESOLVED") {
    return (
      <Button
        size="sm"
        variant="outline"
        disabled={pending}
        onClick={() => updateStatus("HUMAN_HANDLING")}
      >
        {pending ? <Loader2 className="size-4 animate-spin" /> : <RotateCcw className="size-4" />}
        Reopen
      </Button>
    );
  }

  return (
    <Button size="sm" variant="outline" disabled={pending} onClick={() => updateStatus("RESOLVED")}>
      {pending ? <Loader2 className="size-4 animate-spin" /> : <CheckCircle2 className="size-4" />}
      Mark resolved
    </Button>
  );
}
