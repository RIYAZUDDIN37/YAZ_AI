"use client";

import { useTransition } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import type { AIAgent } from "@prisma/client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Field, FieldLabel, FieldDescription, FieldError } from "@/components/ui/field";
import { TextField } from "@/components/form/text-field";
import {
  updateAgentProfileSchema,
  type UpdateAgentProfileInput,
} from "@/lib/validation/agent-config";
import { updateAgentProfileAction } from "./actions";

export function ProfileForm({ agent }: { agent: AIAgent }) {
  const [pending, startTransition] = useTransition();

  const { control, handleSubmit } = useForm<UpdateAgentProfileInput>({
    resolver: zodResolver(updateAgentProfileSchema),
    defaultValues: {
      name: agent.name,
      title: agent.title,
      tone: agent.tone ?? "",
      customInstructions: agent.customInstructions ?? "",
    },
  });

  function onSubmit(values: UpdateAgentProfileInput) {
    startTransition(async () => {
      const result = await updateAgentProfileAction(values);
      if (result?.error) {
        toast.error(result.error);
        return;
      }
      toast.success("Profile updated.");
    });
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="max-w-lg space-y-4">
      <TextField control={control} name="name" label="Name" placeholder="Maya" />
      <TextField control={control} name="title" label="Title" placeholder="Customer & Sales Agent" />

      <Controller
        control={control}
        name="tone"
        render={({ field, fieldState }) => (
          <Field data-invalid={fieldState.error ? true : undefined}>
            <FieldLabel htmlFor="tone">Tone</FieldLabel>
            <Textarea
              {...field}
              id="tone"
              rows={2}
              placeholder="Warm, concise, and professional — never pushy."
            />
            <FieldDescription>
              How your AI employee should sound in every reply.
            </FieldDescription>
            <FieldError errors={fieldState.error ? [fieldState.error] : undefined} />
          </Field>
        )}
      />

      <Controller
        control={control}
        name="customInstructions"
        render={({ field, fieldState }) => (
          <Field data-invalid={fieldState.error ? true : undefined}>
            <FieldLabel htmlFor="customInstructions">Additional instructions</FieldLabel>
            <Textarea
              {...field}
              id="customInstructions"
              rows={5}
              placeholder="Anything else it should always keep in mind, e.g. store hours, delivery areas, promotions to mention."
            />
            <FieldDescription>
              Free text, added to every conversation&apos;s context.
            </FieldDescription>
            <FieldError errors={fieldState.error ? [fieldState.error] : undefined} />
          </Field>
        )}
      />

      <Button type="submit" disabled={pending}>
        {pending ? <Loader2 className="size-4 animate-spin" /> : null}
        Save profile
      </Button>
    </form>
  );
}
