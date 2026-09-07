"use client";

import { useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { SendHorizontal, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { sendMessageSchema, type SendMessageInput } from "@/lib/validation/conversations";
import { sendMessageAction, logCustomerMessageAction } from "./actions";

type Mode = "staff" | "customer";

export function MessageComposer({ conversationId }: { conversationId: string }) {
  const [mode, setMode] = useState<Mode>("staff");
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string>();

  const form = useForm<SendMessageInput>({
    resolver: zodResolver(sendMessageSchema),
    defaultValues: { conversationId, body: "" },
  });

  function onSubmit(values: SendMessageInput) {
    setError(undefined);
    startTransition(async () => {
      const action = mode === "staff" ? sendMessageAction : logCustomerMessageAction;
      const result = await action(values);
      if (result?.error) {
        setError(result.error);
        return;
      }
      form.reset({ conversationId, body: "" });
    });
  }

  return (
    <form
      onSubmit={form.handleSubmit(onSubmit)}
      onKeyDown={(event) => {
        if (event.key === "Enter" && !event.shiftKey) {
          event.preventDefault();
          form.handleSubmit(onSubmit)();
        }
      }}
    >
      <div className="mb-2 flex gap-1">
        <ModeButton active={mode === "staff"} onClick={() => setMode("staff")}>
          Reply as yourself
        </ModeButton>
        <ModeButton active={mode === "customer"} onClick={() => setMode("customer")}>
          Log what customer said
        </ModeButton>
      </div>

      <div className="flex items-end gap-2">
        <Textarea
          rows={2}
          placeholder={mode === "staff" ? "Reply as yourself…" : "What did the customer say?"}
          className="resize-none"
          {...form.register("body")}
        />
        <Button type="submit" size="icon" disabled={pending} aria-label="Send">
          {pending ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <SendHorizontal className="size-4" />
          )}
        </Button>
      </div>
      {error ? (
        <p role="alert" className="mt-1.5 text-xs text-destructive">
          {error}
        </p>
      ) : null}
    </form>
  );
}

function ModeButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "rounded-md px-2 py-1 text-xs transition-colors",
        active
          ? "bg-accent font-medium text-foreground"
          : "text-muted-foreground hover:bg-accent/50",
      )}
    >
      {children}
    </button>
  );
}
