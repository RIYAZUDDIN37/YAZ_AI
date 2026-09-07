import { INDUSTRIES } from "@/config/industries";

export function Industries() {
  return (
    <section id="industries" className="border-b border-border/60 py-20">
      <div className="mx-auto max-w-6xl px-6">
        <div className="max-w-2xl">
          <h2 className="text-3xl font-semibold tracking-tight">
            One platform, five businesses so far.
          </h2>
          <p className="mt-3 text-muted-foreground text-pretty">
            The application underneath is shared. What changes per industry
            is configuration — vocabulary, catalogue shape, appointment
            type — not the codebase.
          </p>
        </div>

        <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {INDUSTRIES.map((industry) => (
            <div
              key={industry.value}
              className="rounded-xl border border-border bg-card p-6"
            >
              <p className="font-medium">{industry.label}</p>
              <p className="mt-1.5 text-sm text-muted-foreground text-pretty">
                {industry.description}
              </p>
              <p className="mt-4 text-xs text-muted-foreground">
                Employee handles: {industry.catalogueLabel} ·{" "}
                {industry.appointmentLabel}
              </p>
            </div>
          ))}
          <div className="flex flex-col justify-center rounded-xl border border-dashed border-border p-6">
            <p className="text-sm font-medium">More industries</p>
            <p className="mt-1.5 text-sm text-muted-foreground text-pretty">
              New verticals are added as configuration, not new applications.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
