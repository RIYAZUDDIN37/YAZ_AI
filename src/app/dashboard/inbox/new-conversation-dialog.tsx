"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Plus, Loader2 } from "lucide-react";
import type { Customer } from "@prisma/client";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Field, FieldGroup, FieldLabel, FieldError } from "@/components/ui/field";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  startConversationSchema,
  type StartConversationInput,
} from "@/lib/validation/conversations";
import { startConversationAction } from "./actions";

export function NewConversationDialog({ customers }: { customers: Customer[] }) {
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const [formError, setFormError] = useState<string>();
  const router = useRouter();

  const form = useForm<StartConversationInput>({
    resolver: zodResolver(startConversationSchema),
    defaultValues: { customerId: "", initialMessage: "" },
  });

  function onSubmit(values: StartConversationInput) {
    setFormError(undefined);
    startTransition(async () => {
      const result = await startConversationAction(values);
      if (result?.error) {
        setFormError(result.error);
        return;
      }
      setOpen(false);
      form.reset();
      if (result.conversationId) {
        router.push(`/dashboard/inbox?c=${result.conversationId}`);
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <Button
        size="icon-sm"
        variant="ghost"
        onClick={() => setOpen(true)}
        aria-label="Log a conversation"
      >
        <Plus className="size-4" />
      </Button>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Log a conversation</DialogTitle>
          <DialogDescription>
            Record a call, email, or walk-in inquiry as a new conversation.
            You&apos;ll reply as yourself — there&apos;s no AI handling
            conversations yet.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={form.handleSubmit(onSubmit)} noValidate>
          <FieldGroup>
            <Field>
              <FieldLabel htmlFor="customerId">Customer</FieldLabel>
              <Select
                value={form.watch("customerId")}
                onValueChange={(value) =>
                  form.setValue("customerId", value ?? "", { shouldValidate: true })
                }
              >
                <SelectTrigger id="customerId" className="w-full">
                  {/* Base UI's Select.Value doesn't auto-resolve a label from
                      the selected value the way Radix's does — it needs an
                      explicit value -> label mapping. */}
                  <SelectValue placeholder="Pick a customer">
                    {(value: string | null) =>
                      customers.find((customer) => customer.id === value)?.name ??
                      "Pick a customer"
                    }
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {customers.length === 0 ? (
                    <div className="px-2 py-1.5 text-sm text-muted-foreground">
                      No customers yet
                    </div>
                  ) : (
                    customers.map((customer) => (
                      <SelectItem key={customer.id} value={customer.id}>
                        {customer.name}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
              <FieldError
                errors={
                  form.formState.errors.customerId
                    ? [form.formState.errors.customerId]
                    : undefined
                }
              />
            </Field>

            <Field>
              <FieldLabel htmlFor="initialMessage">What did they say?</FieldLabel>
              <Textarea
                id="initialMessage"
                rows={3}
                placeholder="e.g. Called asking whether the Oslo dining table is in stock."
                {...form.register("initialMessage")}
              />
              <FieldError
                errors={
                  form.formState.errors.initialMessage
                    ? [form.formState.errors.initialMessage]
                    : undefined
                }
              />
            </Field>

            {formError ? (
              <p role="alert" className="text-sm text-destructive">
                {formError}
              </p>
            ) : null}
          </FieldGroup>

          <DialogFooter className="mt-6">
            <Button type="submit" disabled={pending}>
              {pending ? <Loader2 className="size-4 animate-spin" /> : null}
              Start conversation
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
