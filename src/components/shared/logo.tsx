import { cn } from "@/lib/utils";

/** Wordmark used in the marketing header, auth shell, and dashboard sidebar. */
export function Logo({ className }: { className?: string }) {
  return (
    <span className={cn("flex items-center gap-2 font-semibold tracking-tight", className)}>
      <span
        aria-hidden
        className="flex h-6 w-6 items-center justify-center rounded-md bg-brand text-[13px] font-bold text-brand-foreground"
      >
        Y
      </span>
      <span className="text-[15px]">
        YAZ <span className="text-muted-foreground font-normal">AI</span>
      </span>
    </span>
  );
}
