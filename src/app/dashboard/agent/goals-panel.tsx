"use client";

import { useState, useTransition } from "react";
import { Loader2, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import type { AgentGoal } from "@prisma/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { createAgentGoalAction, toggleAgentGoalAction, deleteAgentGoalAction } from "./actions";

export function GoalsPanel({ goals }: { goals: AgentGoal[] }) {
  const [pending, startTransition] = useTransition();
  const [draft, setDraft] = useState("");

  function addGoal() {
    const description = draft.trim();
    if (!description) return;
    startTransition(async () => {
      const result = await createAgentGoalAction({ description });
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
        What your AI employee should optimize for, e.g. &ldquo;Always offer a showroom visit for
        big-ticket items.&rdquo; Injected alongside its rules.
      </p>

      {goals.length === 0 ? (
        <p className="text-sm text-muted-foreground">No goals configured yet.</p>
      ) : (
        <ul className="space-y-2">
          {goals.map((goal) => (
            <li
              key={goal.id}
              className="flex items-start justify-between gap-3 rounded-lg border border-border p-3"
            >
              <div className="flex items-start gap-3">
                <Switch
                  checked={goal.isActive}
                  onCheckedChange={(checked) =>
                    startTransition(async () => {
                      const result = await toggleAgentGoalAction({
                        goalId: goal.id,
                        isActive: checked,
                      });
                      if (result?.error) toast.error(result.error);
                    })
                  }
                  disabled={pending}
                  className="mt-0.5"
                />
                <p className={goal.isActive ? "text-sm" : "text-sm text-muted-foreground line-through"}>
                  {goal.description}
                </p>
              </div>
              <Button
                type="button"
                size="icon"
                variant="ghost"
                disabled={pending}
                aria-label="Delete goal"
                onClick={() =>
                  startTransition(async () => {
                    const result = await deleteAgentGoalAction({ goalId: goal.id });
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
          placeholder="Add a goal…"
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault();
              addGoal();
            }
          }}
        />
        <Button type="button" onClick={addGoal} disabled={pending || !draft.trim()}>
          {pending ? <Loader2 className="size-4 animate-spin" /> : <Plus className="size-4" />}
          Add
        </Button>
      </div>
    </div>
  );
}
