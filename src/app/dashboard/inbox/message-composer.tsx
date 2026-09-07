"use client";

import { useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { SendHorizontal, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { sendMessageSchema, type SendMessageInput } from "@/lib/validation/conversations";
import { sendMessageAction } from "./actions";

export function MessageComposer({ conversationId }: { conversationId: string }) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string>();

  const form = useForm<SendMessageInput>({
    resolver: zodResolver(sendMessageSchema),
    defaultValues: { conversationId, body: "" },
  });

  function onSubmit(values: SendMessageInput) {
    setError(undefined);
    startTransition(async () => {
      const result = await sendMessageAction(values);
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
      <div className="flex items-end gap-2">
        <Textarea
          rows={2}
          placeholder="Reply as yourself…"
          className="resize-none"
          {...form.register("body")}
        />
        <Button type="submit" size="icon" disabled={pending} aria-label="Send message">
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
