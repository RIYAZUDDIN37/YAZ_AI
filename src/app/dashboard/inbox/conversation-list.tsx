import Link from "next/link";
import type { Conversation, Customer, Message } from "@prisma/client";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { NewConversationDialog } from "./new-conversation-dialog";

type ConversationRow = Conversation & {
  customer: Customer | null;
  messages: Message[];
};

export function ConversationList({
  conversations,
  activeId,
  customers,
}: {
  conversations: ConversationRow[];
  activeId?: string;
  customers: Customer[];
}) {
  return (
    <div className="flex flex-col border-r border-border">
      <div className="flex items-center justify-between border-b border-border px-4 py-3">
        <h2 className="text-sm font-medium">Inbox</h2>
        <NewConversationDialog customers={customers} />
      </div>

      <ScrollArea className="flex-1">
        {conversations.length === 0 ? (
          <p className="p-4 text-sm text-muted-foreground">
            No conversations yet.
          </p>
        ) : (
          <ul>
            {conversations.map((conversation) => {
              const lastMessage = conversation.messages[0];
              const isActive = conversation.id === activeId;

              return (
                <li key={conversation.id}>
                  <Link
                    href={`/dashboard/inbox?c=${conversation.id}`}
                    className={cn(
                      "block border-b border-border/60 px-4 py-3 transition-colors",
                      isActive ? "bg-accent" : "hover:bg-accent/50",
                    )}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <p className="truncate text-sm font-medium">
                        {conversation.customer?.name ?? "Unknown customer"}
                      </p>
                      {conversation.status === "RESOLVED" ? (
                        <Badge variant="secondary" className="text-[10px]">
                          Resolved
                        </Badge>
                      ) : null}
                    </div>
                    <p className="mt-0.5 truncate text-xs text-muted-foreground">
                      {lastMessage?.body ?? "No messages yet"}
                    </p>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </ScrollArea>
    </div>
  );
}
