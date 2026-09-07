import { ShieldCheck, Lock, ListChecks, Building2 } from "lucide-react";

const POINTS = [
  {
    icon: Building2,
    title: "Real multi-tenancy",
    description:
      "Every record belongs to a business. Authorization is enforced server-side, not by hiding a UI button.",
  },
  {
    icon: Lock,
    title: "No unrestricted database access",
    description:
      "The AI acts only through a permissioned tool registry — never raw queries.",
  },
  {
    icon: ListChecks,
    title: "Auditable by default",
    description:
      "Every agent decision and tool call is logged and reviewable in Activity.",
  },
  {
    icon: ShieldCheck,
    title: "Role-based access",
    description:
      "Owner, Admin, Manager, Staff — centrally defined, consistently enforced.",
  },
];

export function Security() {
  return (
    <section id="security" className="border-b border-border/60 bg-secondary/30 py-20">
      <div className="mx-auto max-w-6xl px-6">
        <div className="max-w-2xl">
          <h2 className="text-3xl font-semibold tracking-tight">
            Built like it has to survive production.
          </h2>
        </div>

        <div className="mt-12 grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
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
