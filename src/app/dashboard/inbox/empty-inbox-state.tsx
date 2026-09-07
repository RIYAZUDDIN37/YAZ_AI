import { Inbox } from "lucide-react";

export function EmptyInboxState({ hasCustomers }: { hasCustomers: boolean }) {
  return (
    <div className="max-w-xs px-6 text-center">
      <Inbox className="mx-auto size-8 text-muted-foreground" />
      <p className="mt-3 text-sm font-medium">No conversations yet</p>
      <p className="mt-1 text-sm text-muted-foreground text-pretty">
        {hasCustomers
          ? "Log a call, email, or walk-in inquiry using the + button to get started."
          : "You'll need at least one customer before you can log a conversation — customer management lands in an upcoming phase."}
      </p>
    </div>
  );
}
