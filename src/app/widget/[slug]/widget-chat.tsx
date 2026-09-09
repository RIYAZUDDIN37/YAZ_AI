"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { Bot, Loader2, SendHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

interface WidgetMessage {
  id: string;
  senderType: "CUSTOMER" | "AI" | "STAFF" | "SYSTEM";
  body: string;
}

/** Session-scoped, not persisted across browser restarts — a fresh tab
 * gets a fresh conversation, same as walking into a different chat. */
function storageKey(slug: string) {
  return `yaz-widget-conversation:${slug}`;
}

export function WidgetChat({
  slug,
  businessName,
  agentName,
}: {
  slug: string;
  businessName: string;
  agentName: string;
}) {
  const [messages, setMessages] = useState<WidgetMessage[]>([]);
  const [draft, setDraft] = useState("");
  const [error, setError] = useState<string>();
  const [pending, startTransition] = useTransition();
  const conversationIdRef = useRef<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    try {
      conversationIdRef.current = sessionStorage.getItem(storageKey(slug));
    } catch {
      // Storage unavailable (private browsing, etc.) — a fresh
      // conversation starts every message; still fully functional.
    }
  }, [slug]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  function send() {
    const body = draft.trim();
    if (!body) return;
    setError(undefined);

    const optimisticId = `local-${Date.now()}`;
    setMessages((prev) => [...prev, { id: optimisticId, senderType: "CUSTOMER", body }]);
    setDraft("");

    startTransition(async () => {
      try {
        const response = await fetch(`/api/widget/${slug}/message`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ conversationId: conversationIdRef.current, message: body }),
        });
        const data = await response.json();
        if (!response.ok) {
          setError(data.error ?? "Something went wrong.");
          return;
        }
        conversationIdRef.current = data.conversationId;
        try {
          sessionStorage.setItem(storageKey(slug), data.conversationId);
        } catch {
          // Ignore — the in-memory ref still works for this page load.
        }
        setMessages(data.messages);
      } catch {
        setError("Couldn't reach the server. Check your connection and try again.");
      }
    });
  }

  return (
    <>
      <div className="flex items-center gap-2 border-b border-border px-4 py-3">
        <div className="flex size-8 items-center justify-center rounded-full bg-brand/10">
          <Bot className="size-4 text-brand" />
        </div>
        <div>
          <p className="text-sm font-medium">{agentName}</p>
          <p className="text-xs text-muted-foreground">{businessName}</p>
        </div>
      </div>

      <div className="flex-1 space-y-3 overflow-y-auto p-4">
        {messages.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Hi! Ask {agentName} anything about {businessName} — I&apos;ll do my best to help, and
            bring in a team member if you need one.
          </p>
        ) : (
          messages.map((message) => (
            <div
              key={message.id}
              className={cn(
                "max-w-[85%] rounded-xl px-3 py-2 text-sm",
                message.senderType === "CUSTOMER"
                  ? "ml-auto rounded-tr-sm bg-brand text-brand-foreground"
                  : "mr-auto rounded-tl-sm bg-secondary",
              )}
            >
              {message.body}
            </div>
          ))
        )}
        <div ref={bottomRef} />
      </div>

      {error ? <p className="px-4 pb-1 text-xs text-destructive">{error}</p> : null}

      <div className="border-t border-border p-3">
        <div className="flex items-end gap-2">
          <Textarea
            rows={1}
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            placeholder="Type a message…"
            className="resize-none"
            onKeyDown={(event) => {
              if (event.key === "Enter" && !event.shiftKey) {
                event.preventDefault();
                send();
              }
            }}
          />
          <Button size="icon" disabled={pending || !draft.trim()} onClick={send} aria-label="Send">
            {pending ? <Loader2 className="size-4 animate-spin" /> : <SendHorizontal className="size-4" />}
          </Button>
        </div>
      </div>
    </>
  );
}
