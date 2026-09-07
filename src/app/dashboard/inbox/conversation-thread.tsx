import { Bot } from "lucide-react";
import type { Conversation, Customer, Message, User } from "@prisma/client";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { MessageComposer } from "./message-composer";
import { StatusActions } from "./status-actions";
import { ConversationStatusBadge } from "./conversation-status-badge";

type ConversationWithMessages = Conversation & {
  customer: Customer | null;
  messages: (Message & { senderUser: User | null })[];
};

export function ConversationThread({
  conversation,
  agentName,
}: {
  conversation: ConversationWithMessages;
  agentName: string;
}) {
  return (
    <div className="flex min-w-0 flex-col border-r border-border">
      <div className="flex items-center justify-between border-b border-border px-4 py-3">
        <div>
          <p className="text-sm font-medium">
            {conversation.customer?.name ?? "Unknown customer"}
          </p>
          <div className="mt-0.5">
            <ConversationStatusBadge status={conversation.status} />
          </div>
        </div>
        <StatusActions
          conversationId={conversation.id}
          status={conversation.status}
        />
      </div>

      <ScrollArea className="flex-1 p-4">
        <div className="space-y-3">
          {conversation.messages.map((message) => (
            <MessageBubble key={message.id} message={message} agentName={agentName} />
          ))}
        </div>
      </ScrollArea>

      <div className="border-t border-border p-3">
        {/* key forces a remount on conversation switch — react-hook-form's
            defaultValues are only read at mount, so without this the
            composer would silently keep submitting to whichever
            conversation it first mounted with (a real bug, caught during
            live verification — see CLAUDE.md). */}
        <MessageComposer key={conversation.id} conversationId={conversation.id} />
      </div>
    </div>
  );
}

function MessageBubble({
  message,
  agentName,
}: {
  message: Message & { senderUser: User | null };
  agentName: string;
}) {
  const isCustomer = message.senderType === "CUSTOMER";
  const isAI = message.senderType === "AI";

  const senderLabel = isCustomer
    ? "Customer"
    : isAI
      ? agentName
      : (message.senderUser?.name ?? "Staff");

  return (
    <div
      className={cn(
        "max-w-[80%] rounded-xl px-3 py-2 text-sm",
        isCustomer
          ? "mr-auto rounded-tl-sm bg-secondary"
          : isAI
            ? "ml-auto rounded-tr-sm bg-brand/10 ring-1 ring-brand/20"
            : "ml-auto rounded-tr-sm bg-accent",
      )}
    >
      <p>{message.body}</p>
      <p className="mt-1 flex items-center gap-1 text-[11px] text-muted-foreground">
        {isAI ? <Bot className="size-3" /> : null}
        {senderLabel} ·{" "}
        {new Date(message.createdAt).toLocaleString(undefined, {
          hour: "numeric",
          minute: "2-digit",
          month: "short",
          day: "numeric",
        })}
      </p>
    </div>
  );
}
