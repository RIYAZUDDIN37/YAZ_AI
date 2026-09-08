"use client";

import { useTransition } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { FileText, Loader2, Trash2 } from "lucide-react";
import { toast } from "sonner";
import type { KnowledgeDocument } from "@prisma/client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Field, FieldLabel, FieldError } from "@/components/ui/field";
import { TextField } from "@/components/form/text-field";
import {
  createKnowledgeDocumentSchema,
  type CreateKnowledgeDocumentInput,
} from "@/lib/validation/knowledge";
import { createKnowledgeDocumentAction, deleteKnowledgeDocumentAction } from "./actions";

type DocumentWithCount = KnowledgeDocument & { _count: { chunks: number } };

export function KnowledgePanel({ documents }: { documents: DocumentWithCount[] }) {
  const [pending, startTransition] = useTransition();
  const { control, handleSubmit, reset } = useForm<CreateKnowledgeDocumentInput>({
    resolver: zodResolver(createKnowledgeDocumentSchema),
    defaultValues: { title: "", content: "" },
  });

  function onSubmit(values: CreateKnowledgeDocumentInput) {
    startTransition(async () => {
      const result = await createKnowledgeDocumentAction(values);
      if (result?.error) {
        toast.error(result.error);
        return;
      }
      reset({ title: "", content: "" });
      toast.success("Document added.");
    });
  }

  function removeDocument(documentId: string) {
    startTransition(async () => {
      const result = await deleteKnowledgeDocumentAction({ documentId });
      if (result?.error) toast.error(result.error);
    });
  }

  return (
    <div className="max-w-lg space-y-6">
      <p className="text-sm text-muted-foreground">
        Paste policies, FAQs, or product info your AI employee should be able to reference — e.g.
        a shipping policy, return policy, or store hours. Retrieved by keyword match today (real,
        but lexical — not semantic embeddings yet; see docs/AI-ARCHITECTURE.md).
      </p>

      <div>
        <h3 className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
          Documents
        </h3>
        {documents.length === 0 ? (
          <p className="mt-2 text-sm text-muted-foreground">No documents yet.</p>
        ) : (
          <ul className="mt-2 space-y-2">
            {documents.map((doc) => (
              <li
                key={doc.id}
                className="flex items-start justify-between gap-3 rounded-lg border border-border p-3"
              >
                <div className="flex items-start gap-2">
                  <FileText className="mt-0.5 size-4 text-muted-foreground" />
                  <div>
                    <p className="text-sm font-medium">{doc.title}</p>
                    <div className="mt-1 flex items-center gap-1.5">
                      <Badge
                        variant={doc.status === "READY" ? "secondary" : "outline"}
                        className="text-[10px]"
                      >
                        {doc.status === "READY"
                          ? `${doc._count.chunks} chunk${doc._count.chunks === 1 ? "" : "s"}`
                          : doc.status.toLowerCase()}
                      </Badge>
                      {doc.errorMessage ? (
                        <span className="text-[11px] text-destructive">{doc.errorMessage}</span>
                      ) : null}
                    </div>
                  </div>
                </div>
                <Button
                  type="button"
                  size="icon"
                  variant="ghost"
                  disabled={pending}
                  aria-label="Delete document"
                  onClick={() => removeDocument(doc.id)}
                >
                  <Trash2 className="size-4" />
                </Button>
              </li>
            ))}
          </ul>
        )}
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 border-t border-border pt-4">
        <TextField control={control} name="title" label="Title" placeholder="Shipping & Delivery Policy" />
        <Controller
          control={control}
          name="content"
          render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.error ? true : undefined}>
              <FieldLabel htmlFor="content">Content</FieldLabel>
              <Textarea
                {...field}
                id="content"
                rows={8}
                placeholder="Paste the full text here…"
                aria-invalid={fieldState.error ? true : undefined}
              />
              <FieldError errors={fieldState.error ? [fieldState.error] : undefined} />
            </Field>
          )}
        />
        <Button type="submit" disabled={pending}>
          {pending ? <Loader2 className="size-4 animate-spin" /> : null}
          Add document
        </Button>
      </form>
    </div>
  );
}
