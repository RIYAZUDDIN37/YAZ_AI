import { Clock, CheckCircle2, CalendarCheck, XCircle, UserX } from "lucide-react";
import type { AppointmentStatus } from "@prisma/client";
import { Badge } from "@/components/ui/badge";

const STATUS_CONFIG: Record<
  AppointmentStatus,
  { label: string; variant: "default" | "secondary" | "outline"; icon: typeof Clock; className?: string }
> = {
  SCHEDULED: { label: "Scheduled", variant: "outline", icon: Clock },
  CONFIRMED: { label: "Confirmed", variant: "default", icon: CalendarCheck },
  COMPLETED: { label: "Completed", variant: "secondary", icon: CheckCircle2 },
  CANCELLED: { label: "Cancelled", variant: "outline", icon: XCircle },
  NO_SHOW: {
    label: "No-show",
    variant: "default",
    icon: UserX,
    className: "bg-destructive text-white",
  },
};

export function AppointmentStatusBadge({ status }: { status: AppointmentStatus }) {
  const config = STATUS_CONFIG[status];
  const Icon = config.icon;

  return (
    <Badge variant={config.variant} className={`gap-1 text-[10px] ${config.className ?? ""}`}>
      <Icon className="size-3" />
      {config.label}
    </Badge>
  );
}
