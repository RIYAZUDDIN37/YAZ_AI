import { MessageSquare, BookOpen, Brain, Wrench, ReplyAll } from "lucide-react";

const STEPS = [
  {
    icon: MessageSquare,
    title: "Customer asks something real",
    description:
      "“Do you have a dining table under ₹50k?” — not a scripted menu, an actual question.",
  },
  {
    icon: BookOpen,
    title: "The AI retrieves your business knowledge",
    description:
      "Product catalogue, policies, pricing, FAQs — whatever you've given it, scoped to your business only.",
  },
  {
    icon: Brain,
    title: "It decides what action is required",
    description:
      "Answer, search, qualify, book, quote, or escalate — governed by the rules you set.",
  },
  {
    icon: Wrench,
    title: "It calls a real tool",
    description:
      "searchProducts, checkInventory, createAppointment — typed, permissioned, and logged. Never raw database access.",
  },
  {
    icon: ReplyAll,
    title: "It responds — and logs everything",
    description:
      "The customer gets an answer. You get a full activity trace of what the AI understood and did.",
  },
];

export function HowItWorks() {
  return (
    <section id="how-it-works" className="border-b border-border/60 py-20">
      <div className="mx-auto max-w-6xl px-6">
        <div className="max-w-2xl">
          <h2 className="text-3xl font-semibold tracking-tight">
            Not a chatbot. A worker with tools.
          </h2>
          <p className="mt-3 text-muted-foreground text-pretty">
            Every reply your AI employee sends can be traced back to a
            knowledge source, a business rule, and a real action it took —
            not a plausible-sounding guess.
          </p>
        </div>

        <ol className="mt-14 grid gap-8 sm:grid-cols-2 lg:grid-cols-5">
          {STEPS.map((step, i) => (
            <li key={step.title} className="relative">
              <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-lg border border-border bg-card">
                <step.icon className="size-5 text-brand" />
              </div>
              <p className="mb-1 text-xs font-medium text-muted-foreground">
                Step {i + 1}
              </p>
              <h3 className="mb-1.5 font-medium leading-snug">{step.title}</h3>
              <p className="text-sm text-muted-foreground text-pretty">
                {step.description}
              </p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
