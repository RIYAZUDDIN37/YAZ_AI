import { Bot, UserCheck, AlertCircle, CheckCircle2 } from "lucide-react";
import type { ConversationStatus } from "@prisma/client";
import { Badge } from "@/components/ui/badge";

const STATUS_CONFIG: Record<
  ConversationStatus,
  { label: string; variant: "default" | "secondary" | "outline"; icon: typeof Bot; className?: string }
> = {
  AI_HANDLING: { label: "AI handling", variant: "outline", icon: Bot },
  HUMAN_NEEDED: {
    label: "Needs you",
    variant: "default",
    icon: AlertCircle,
    className: "bg-warning text-warning-foreground",
  },
  HUMAN_HANDLING: { label: "Being handled", variant: "outline", icon: UserCheck },
  RESOLVED: { label: "Resolved", variant: "secondary", icon: CheckCircle2 },
};

export function ConversationStatusBadge({ status }: { status: ConversationStatus }) {
  const config = STATUS_CONFIG[status];
  const Icon = config.icon;

  return (
    <Badge variant={config.variant} className={`gap-1 text-[10px] ${config.className ?? ""}`}>
      <Icon className="size-3" />
      {config.label}
    </Badge>
  );
}
