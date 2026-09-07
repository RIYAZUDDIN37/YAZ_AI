import type { Conversation, Customer, Message, User } from "@prisma/client";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { MessageComposer } from "./message-composer";
import { StatusActions } from "./status-actions";

type ConversationWithMessages = Conversation & {
  customer: Customer | null;
  messages: (Message & { senderUser: User | null })[];
};

export function ConversationThread({
  conversation,
}: {
  conversation: ConversationWithMessages;
}) {
  return (
    <div className="flex min-w-0 flex-col border-r border-border">
      <div className="flex items-center justify-between border-b border-border px-4 py-3">
        <div>
          <p className="text-sm font-medium">
            {conversation.customer?.name ?? "Unknown customer"}
          </p>
          <Badge
            variant={conversation.status === "RESOLVED" ? "secondary" : "outline"}
            className="mt-0.5 text-[10px]"
          >
            {conversation.status === "RESOLVED" ? "Resolved" : "Being handled"}
          </Badge>
        </div>
        <StatusActions
          conversationId={conversation.id}
          status={conversation.status}
        />
      </div>

      <ScrollArea className="flex-1 p-4">
        <div className="space-y-3">
          {conversation.messages.map((message) => (
            <MessageBubble key={message.id} message={message} />
          ))}
        </div>
      </ScrollArea>

      <div className="border-t border-border p-3">
        <MessageComposer conversationId={conversation.id} />
      </div>
    </div>
  );
}

function MessageBubble({
  message,
}: {
  message: Message & { senderUser: User | null };
}) {
  const isCustomer = message.senderType === "CUSTOMER";

  return (
    <div
      className={cn(
        "max-w-[80%] rounded-xl px-3 py-2 text-sm",
        isCustomer
          ? "mr-auto rounded-tl-sm bg-secondary"
          : "ml-auto rounded-tr-sm bg-accent",
      )}
    >
      <p>{message.body}</p>
      <p className="mt-1 text-[11px] text-muted-foreground">
        {isCustomer ? "Customer" : message.senderUser?.name ?? "Staff"} ·{" "}
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
