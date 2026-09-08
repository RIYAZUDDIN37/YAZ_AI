"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import type { LeadActivity } from "@prisma/client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Loader2 } from "lucide-react";
import { addLeadNoteAction } from "../actions";

const TYPE_LABEL: Record<string, string> = {
  created: "Created",
  status_change: "Status change",
  note: "Note",
};

export function LeadNotes({ leadId, activities }: { leadId: string; activities: LeadActivity[] }) {
  const [pending, startTransition] = useTransition();
  const [draft, setDraft] = useState("");

  function addNote() {
    const body = draft.trim();
    if (!body) return;
    startTransition(async () => {
      const result = await addLeadNoteAction({ leadId, body });
      if (result?.error) {
        toast.error(result.error);
        return;
      }
      setDraft("");
    });
  }

  return (
    <div className="space-y-3">
      {activities.length === 0 ? (
        <p className="text-sm text-muted-foreground">No activity yet.</p>
      ) : (
        <ul className="space-y-2">
          {activities.map((activity) => (
            <li key={activity.id} className="rounded-lg border border-border p-3 text-sm">
              <p className="text-[11px] font-medium tracking-wide text-muted-foreground uppercase">
                {TYPE_LABEL[activity.type] ?? activity.type}
              </p>
              {activity.body ? <p className="mt-1 text-pretty">{activity.body}</p> : null}
              <p className="mt-1.5 text-[11px] text-muted-foreground">
                {new Date(activity.createdAt).toLocaleString(undefined, {
                  month: "short",
                  day: "numeric",
                  hour: "numeric",
                  minute: "2-digit",
                })}
              </p>
            </li>
          ))}
        </ul>
      )}

      <div className="flex items-end gap-2">
        <Textarea
          rows={2}
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          placeholder="Add a note…"
          className="resize-none"
        />
        <Button type="button" disabled={pending || !draft.trim()} onClick={addNote}>
          {pending ? <Loader2 className="size-4 animate-spin" /> : null}
          Add
        </Button>
      </div>
    </div>
  );
}
