"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useForm, Controller } from "react-hook-form";
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
import { TextField } from "@/components/form/text-field";
import {
  createLeadFormSchema,
  type CreateLeadFormValues,
} from "@/lib/validation/leads";
import { createLeadAction } from "./actions";

export function NewLeadDialog({ customers }: { customers: Customer[] }) {
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const [formError, setFormError] = useState<string>();
  const router = useRouter();

  const { control, handleSubmit, reset, formState } = useForm<CreateLeadFormValues>({
    resolver: zodResolver(createLeadFormSchema),
    defaultValues: { customerId: "", intent: "", source: "", value: "" },
  });

  function onSubmit(values: CreateLeadFormValues) {
    setFormError(undefined);
    startTransition(async () => {
      const result = await createLeadAction({
        ...values,
        value: values.value ? Number(values.value) : undefined,
      });
      if (result?.error) {
        setFormError(result.error);
        return;
      }
      setOpen(false);
      reset();
      if (result.leadId) {
        router.push(`/dashboard/leads/${result.leadId}`);
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <Button onClick={() => setOpen(true)} disabled={customers.length === 0}>
        <Plus className="size-4" />
        Add lead
      </Button>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add lead</DialogTitle>
          <DialogDescription>Record a sales opportunity for an existing customer.</DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} noValidate>
          <FieldGroup>
            <Controller
              control={control}
              name="customerId"
              render={({ field }) => (
                <Field data-invalid={formState.errors.customerId ? true : undefined}>
                  <FieldLabel htmlFor="customerId">Customer</FieldLabel>
                  <Select value={field.value} onValueChange={(value) => field.onChange(value ?? "")}>
                    <SelectTrigger id="customerId" className="w-full">
                      <SelectValue placeholder="Pick a customer">
                        {(value: string | null) =>
                          customers.find((customer) => customer.id === value)?.name ??
                          "Pick a customer"
                        }
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      {customers.map((customer) => (
                        <SelectItem key={customer.id} value={customer.id}>
                          {customer.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FieldError
                    errors={formState.errors.customerId ? [formState.errors.customerId] : undefined}
                  />
                </Field>
              )}
            />

            <TextField
              control={control}
              name="intent"
              label="Intent"
              placeholder="e.g. 6-seater dining table, budget under 50k"
            />
            <TextField control={control} name="value" label="Estimated value (₹)" type="number" />
            <TextField control={control} name="source" label="Source" placeholder="Showroom, phone, referral…" />

            {formError ? (
              <p role="alert" className="text-sm text-destructive">
                {formError}
              </p>
            ) : null}
          </FieldGroup>

          <DialogFooter className="mt-6">
            <Button type="submit" disabled={pending}>
              {pending ? <Loader2 className="size-4 animate-spin" /> : null}
              Add lead
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
