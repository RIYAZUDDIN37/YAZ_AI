import { UserCheck, AlertTriangle, RotateCcw } from "lucide-react";

const POINTS = [
  {
    icon: AlertTriangle,
    title: "It knows what it shouldn't decide",
    description:
      "A discount past your limit, a medical concern, an angry customer — the agent escalates instead of guessing.",
  },
  {
    icon: UserCheck,
    title: "Your team takes over instantly",
    description:
      "Full conversation history and AI activity are right there. No re-explaining, no cold start.",
  },
  {
    icon: RotateCcw,
    title: "Hand it back when you're done",
    description:
      "Return the conversation to the AI at any point — it picks the thread back up with full context.",
  },
];

export function HumanHandoff() {
  return (
    <section className="border-b border-border/60 py-20">
      <div className="mx-auto max-w-6xl px-6">
        <div className="max-w-2xl">
          <h2 className="text-3xl font-semibold tracking-tight">
            The AI escalates. It doesn&apos;t bluff.
          </h2>
          <p className="mt-3 text-muted-foreground text-pretty">
            Human handoff is a core feature, not a fallback bolted on after
            launch.
          </p>
        </div>

        <div className="mt-12 grid gap-8 sm:grid-cols-3">
          {POINTS.map((point) => (
            <div key={point.title}>
              <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-lg border border-border bg-card">
                <point.icon className="size-5 text-brand" />
              </div>
              <h3 className="mb-1.5 font-medium leading-snug">{point.title}</h3>
              <p className="text-sm text-muted-foreground text-pretty">
                {point.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
