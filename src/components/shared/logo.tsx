import { cn } from "@/lib/utils";

/**
 * Wordmark used in the marketing header, auth shell, and dashboard sidebar.
 * `dark` renders the word "AI" in white instead of the muted-foreground
 * token, for use on the dashboard header's dark bar (see dashboard/layout.tsx).
 */
export function Logo({ className, dark }: { className?: string; dark?: boolean }) {
  return (
    <span className={cn("flex items-center gap-2 font-semibold tracking-tight", className)}>
      <span
        aria-hidden
        className="flex h-6 w-6 items-center justify-center rounded-md bg-gradient-to-br from-brand to-brand-2 text-[13px] font-bold text-brand-foreground"
      >
        Y
      </span>
      <span className={cn("text-[15px]", dark && "text-white")}>
        YAZ <span className={cn("font-normal", dark ? "text-white/60" : "text-muted-foreground")}>AI</span>
      </span>
    </span>
  );
}
