"use client";

import { motion } from "framer-motion";
import { Sofa, CalendarCheck, FileText } from "lucide-react";
import { Badge } from "@/components/ui/badge";

const TRANSCRIPT = [
  { from: "customer", text: "Do you have a 6-seater dining table under ₹50,000?" },
  {
    from: "agent",
    text: "Yes — I found 3 that fit. The Oslo 6-Seater (₹42,999) and Nordic 6-Seater (₹47,500) are both in stock in Pune.",
  },
];

const ACTIONS = [
  { icon: Sofa, label: "Searched catalogue · 2 matches" },
  { icon: CalendarCheck, label: "Checked inventory · in stock" },
  { icon: FileText, label: "Offered to generate a quotation" },
];

export function HeroPreviewCard() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: "easeOut" }}
      className="relative mx-auto w-full max-w-sm rounded-2xl border border-border bg-card p-5 shadow-sm"
    >
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-brand text-sm font-semibold text-brand-foreground">
            M
          </span>
          <div>
            <p className="text-sm font-medium leading-none">Maya</p>
            <p className="text-xs text-muted-foreground">Urban Living · Furniture</p>
          </div>
        </div>
        <Badge variant="secondary" className="text-[10px]">
          Illustrative preview
        </Badge>
      </div>

      <div className="space-y-3">
        {TRANSCRIPT.map((message, i) => (
          <div
            key={i}
            className={
              message.from === "customer"
                ? "ml-auto max-w-[85%] rounded-xl rounded-tr-sm bg-secondary px-3 py-2 text-sm"
                : "mr-auto max-w-[90%] rounded-xl rounded-tl-sm bg-accent px-3 py-2 text-sm"
            }
          >
            {message.text}
          </div>
        ))}
      </div>

      <div className="mt-4 space-y-2 border-t border-border pt-4">
        {ACTIONS.map((action, i) => (
          <div key={i} className="flex items-center gap-2 text-xs text-muted-foreground">
            <action.icon className="size-3.5 text-brand" />
            {action.label}
          </div>
        ))}
      </div>
    </motion.div>
  );
}
