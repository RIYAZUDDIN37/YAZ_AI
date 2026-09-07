import {
  MessageCircleQuestion,
  Sparkles,
  UserPlus,
  CalendarPlus,
  FileText,
  PackageSearch,
  ShoppingCart,
  Link2,
} from "lucide-react";

const CAPABILITIES = [
  { icon: MessageCircleQuestion, label: "Answer questions", detail: "Grounded in your uploaded knowledge, with sources." },
  { icon: Sparkles, label: "Recommend products", detail: "Matched to budget, fit, and stated preferences." },
  { icon: UserPlus, label: "Capture & qualify leads", detail: "Structured lead records, not buried in chat logs." },
  { icon: CalendarPlus, label: "Book appointments", detail: "Showroom visits, reservations, service slots — same engine." },
  { icon: FileText, label: "Create quotations", detail: "Line items, discounts within your rules, totals, validity." },
  { icon: PackageSearch, label: "Check inventory", detail: "Real stock lookups, not guesses." },
  { icon: ShoppingCart, label: "Accept orders", detail: "From conversation straight into an order record." },
  { icon: Link2, label: "Generate payment links", detail: "Where a payment provider is configured." },
];

export function Capabilities() {
  return (
    <section id="capabilities" className="border-b border-border/60 py-20">
      <div className="mx-auto max-w-6xl px-6">
        <div className="max-w-2xl">
          <h2 className="text-3xl font-semibold tracking-tight">
            Every capability is a governed action, not a promise.
          </h2>
          <p className="mt-3 text-muted-foreground text-pretty">
            You turn each one on, set its limits, and decide when it needs
            your approval — in Train your AI employee.
          </p>
        </div>

        <div className="mt-12 grid gap-px overflow-hidden rounded-xl border border-border bg-border sm:grid-cols-2 lg:grid-cols-4">
          {CAPABILITIES.map((capability) => (
            <div key={capability.label} className="bg-card p-6">
              <capability.icon className="mb-3 size-5 text-brand" />
              <p className="mb-1 text-sm font-medium">{capability.label}</p>
              <p className="text-sm text-muted-foreground text-pretty">
                {capability.detail}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
