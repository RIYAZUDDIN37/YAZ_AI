"use client";

import { useState, useTransition } from "react";
import { Bot, Loader2, RotateCcw, SendHorizontal } from "lucide-react";
import { toast } from "sonner";
import type { AgentAction, AgentExecution, Conversation, Message } from "@prisma/client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { sendTestMessageAction, resetTestConversationAction } from "./actions";

type ExecutionWithActions = AgentExecution & { actions: AgentAction[] };
type TestConversation =
  | (Conversation & { messages: Message[]; agentExecutions: ExecutionWithActions[] })
  | null;

export function TestPanel({
  agentName,
  conversation,
}: {
  agentName: string;
  conversation: TestConversation;
}) {
  const [pending, startTransition] = useTransition();
  const [draft, setDraft] = useState("");

  function send() {
    const body = draft.trim();
    if (!body) return;
    startTransition(async () => {
      const result = await sendTestMessageAction({ body });
      if (result?.error) {
        toast.error(result.error);
        return;
      }
      setDraft("");
    });
  }

  function reset() {
    startTransition(async () => {
      const result = await resetTestConversationAction();
      if (result?.error) toast.error(result.error);
    });
  }

  return (
    <div className="grid gap-4 lg:grid-cols-[1fr_320px]">
      <div className="flex h-[520px] flex-col rounded-xl border border-border">
        <div className="flex items-center justify-between border-b border-border px-4 py-2.5">
          <p className="text-sm font-medium">Sandbox conversation</p>
          <Button size="sm" variant="ghost" disabled={pending} onClick={reset}>
            <RotateCcw className="size-3.5" />
            Reset
          </Button>
        </div>

        <ScrollArea className="flex-1 p-4">
          {!conversation || conversation.messages.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Send a message below as if you were a customer — {agentName} will respond exactly
              the way it would to a real one, using the same rules, goals, and knowledge you&apos;ve
              configured.
            </p>
          ) : (
            <div className="space-y-3">
              {conversation.messages.map((message) => (
                <MessageBubble key={message.id} message={message} agentName={agentName} />
              ))}
            </div>
          )}
        </ScrollArea>

        <div className="border-t border-border p-3">
          <div className="flex items-end gap-2">
            <Textarea
              rows={2}
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              placeholder="Type a message as a customer…"
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
      </div>

      <div>
        <h3 className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
          Turn trace
        </h3>
        {!conversation || conversation.agentExecutions.length === 0 ? (
          <p className="mt-2 text-sm text-muted-foreground">
            Each AI turn&apos;s rules, goals, knowledge, and tool calls will show up here.
          </p>
        ) : (
          <ul className="mt-2 space-y-3">
            {conversation.agentExecutions.map((execution) => (
              <li key={execution.id} className="rounded-lg border border-border p-2.5">
                <div className="flex items-center gap-1.5">
                  <span
                    className={cn(
                      "size-1.5 rounded-full",
                      execution.status === "SUCCESS"
                        ? "bg-success"
                        : execution.status === "ESCALATED"
                          ? "bg-warning"
                          : "bg-destructive",
                    )}
                  />
                  <p className="text-xs font-medium">{execution.summary}</p>
                </div>
                <TraceDetails trace={execution.trace} />
                {execution.actions.length > 0 ? (
                  <div className="mt-1.5 flex flex-wrap gap-1">
                    {execution.actions.map((action) => (
                      <Badge key={action.id} variant="outline" className="text-[10px]">
                        {action.toolName}: {action.status}
                      </Badge>
                    ))}
                  </div>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

function TraceDetails({ trace }: { trace: unknown }) {
  if (!Array.isArray(trace)) return null;
  const contextStep = trace.find(
    (step): step is { rulesApplied?: string[]; goalsApplied?: string[]; knowledgeUsed?: { documentTitle: string }[] } =>
      typeof step === "object" && step !== null && "step" in step && step.step === "context",
  );
  if (!contextStep) return null;

  const rulesCount = contextStep.rulesApplied?.length ?? 0;
  const goalsCount = contextStep.goalsApplied?.length ?? 0;
  const knowledge = contextStep.knowledgeUsed ?? [];

  return (
    <p className="mt-1 text-[11px] text-muted-foreground">
      {rulesCount} rule{rulesCount === 1 ? "" : "s"}, {goalsCount} goal{goalsCount === 1 ? "" : "s"}
      {knowledge.length > 0
        ? ` — knowledge: ${knowledge.map((k) => k.documentTitle).join(", ")}`
        : ""}
    </p>
  );
}

function MessageBubble({
  message,
  agentName,
}: {
  message: Message;
  agentName: string;
}) {
  const isCustomer = message.senderType === "CUSTOMER";
  const isAI = message.senderType === "AI";

  return (
    <div
      className={cn(
        "max-w-[85%] rounded-xl px-3 py-2 text-sm",
        isCustomer
          ? "mr-auto rounded-tl-sm bg-secondary"
          : "ml-auto rounded-tr-sm bg-brand/10 ring-1 ring-brand/20",
      )}
    >
      <p>{message.body}</p>
      <p className="mt-1 flex items-center gap-1 text-[11px] text-muted-foreground">
        {isAI ? <Bot className="size-3" /> : null}
        {isCustomer ? "You (as customer)" : agentName}
      </p>
    </div>
  );
}
