import { BookOpen, Wrench, Zap, ArrowRight } from "lucide-react";

const PIPELINE = [
  {
    icon: BookOpen,
    title: "Knowledge",
    description:
      "Upload PDFs, spreadsheets, docs. YAZ chunks, embeds, and indexes it — scoped strictly to your business.",
  },
  {
    icon: Wrench,
    title: "Tools",
    description:
      "A registry of typed, permissioned actions — search products, check availability, create a quotation.",
  },
  {
    icon: Zap,
    title: "Actions",
    description:
      "The agent calls a tool, gets a real result, and only then replies — every call is logged and auditable.",
  },
];

export function KnowledgeToolsActions() {
  return (
    <section className="border-b border-border/60 bg-secondary/30 py-20">
      <div className="mx-auto max-w-6xl px-6">
        <div className="max-w-2xl">
          <h2 className="text-3xl font-semibold tracking-tight">
            Knowledge in, tools in the middle, actions out.
          </h2>
          <p className="mt-3 text-muted-foreground text-pretty">
            The AI never touches your database directly. It retrieves what
            it&apos;s allowed to know and calls what it&apos;s allowed to do —
            nothing more.
          </p>
        </div>

        <div className="mt-12 flex flex-col items-stretch gap-4 md:flex-row md:items-center">
          {PIPELINE.map((stage, i) => (
            <div key={stage.title} className="flex flex-1 items-center gap-4">
              <div className="flex-1 rounded-xl border border-border bg-card p-6">
                <stage.icon className="mb-3 size-5 text-brand" />
                <p className="mb-1 font-medium">{stage.title}</p>
                <p className="text-sm text-muted-foreground text-pretty">
                  {stage.description}
                </p>
              </div>
              {i < PIPELINE.length - 1 && (
                <ArrowRight className="hidden size-5 shrink-0 text-muted-foreground md:block" />
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
