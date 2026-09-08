"use client";

import { useState, useTransition } from "react";
import { Loader2, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import type { AgentRule } from "@prisma/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { createAgentRuleAction, toggleAgentRuleAction, deleteAgentRuleAction } from "./actions";

export function RulesPanel({ rules }: { rules: AgentRule[] }) {
  const [pending, startTransition] = useTransition();
  const [draft, setDraft] = useState("");

  function addRule() {
    const instruction = draft.trim();
    if (!instruction) return;
    startTransition(async () => {
      const result = await createAgentRuleAction({ instruction });
      if (result?.error) {
        toast.error(result.error);
        return;
      }
      setDraft("");
    });
  }

  return (
    <div className="max-w-lg space-y-4">
      <p className="text-sm text-muted-foreground">
        Hard constraints your AI employee should always follow, e.g. &ldquo;Never quote a discount
        above 10% without approval.&rdquo; Injected into every conversation, in order.
      </p>

      {rules.length === 0 ? (
        <p className="text-sm text-muted-foreground">No rules configured yet.</p>
      ) : (
        <ul className="space-y-2">
          {rules.map((rule) => (
            <li
              key={rule.id}
              className="flex items-start justify-between gap-3 rounded-lg border border-border p-3"
            >
              <div className="flex items-start gap-3">
                <Switch
                  checked={rule.isActive}
                  onCheckedChange={(checked) =>
                    startTransition(async () => {
                      const result = await toggleAgentRuleAction({
                        ruleId: rule.id,
                        isActive: checked,
                      });
                      if (result?.error) toast.error(result.error);
                    })
                  }
                  disabled={pending}
                  className="mt-0.5"
                />
                <p className={rule.isActive ? "text-sm" : "text-sm text-muted-foreground line-through"}>
                  {rule.instruction}
                </p>
              </div>
              <Button
                type="button"
                size="icon"
                variant="ghost"
                disabled={pending}
                aria-label="Delete rule"
                onClick={() =>
                  startTransition(async () => {
                    const result = await deleteAgentRuleAction({ ruleId: rule.id });
                    if (result?.error) toast.error(result.error);
                  })
                }
              >
                <Trash2 className="size-4" />
              </Button>
            </li>
          ))}
        </ul>
      )}

      <div className="flex gap-2">
        <Input
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          placeholder="Add a rule…"
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault();
              addRule();
            }
          }}
        />
        <Button type="button" onClick={addRule} disabled={pending || !draft.trim()}>
          {pending ? <Loader2 className="size-4 animate-spin" /> : <Plus className="size-4" />}
          Add
        </Button>
      </div>
    </div>
  );
}
