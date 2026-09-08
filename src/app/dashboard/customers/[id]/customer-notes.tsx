"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import type { CustomerNote, User } from "@prisma/client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Loader2 } from "lucide-react";
import { addCustomerNoteAction } from "../actions";

type NoteWithAuthor = CustomerNote & { authorUser: User | null };

export function CustomerNotes({
  customerId,
  notes,
}: {
  customerId: string;
  notes: NoteWithAuthor[];
}) {
  const [pending, startTransition] = useTransition();
  const [draft, setDraft] = useState("");

  function addNote() {
    const body = draft.trim();
    if (!body) return;
    startTransition(async () => {
      const result = await addCustomerNoteAction({ customerId, body });
      if (result?.error) {
        toast.error(result.error);
        return;
      }
      setDraft("");
    });
  }

  return (
    <div className="space-y-3">
      {notes.length === 0 ? (
        <p className="text-sm text-muted-foreground">No notes yet.</p>
      ) : (
        <ul className="space-y-2">
          {notes.map((note) => (
            <li key={note.id} className="rounded-lg border border-border p-3 text-sm">
              <p className="text-pretty">{note.body}</p>
              <p className="mt-1.5 text-[11px] text-muted-foreground">
                {note.authorUser?.name ?? "Unknown"} ·{" "}
                {new Date(note.createdAt).toLocaleString(undefined, {
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
