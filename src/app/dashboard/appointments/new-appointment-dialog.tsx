"use client";

import { useState, useTransition } from "react";
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
import { Input } from "@/components/ui/input";
import { TextField } from "@/components/form/text-field";
import { createAppointmentSchema, type CreateAppointmentInput } from "@/lib/validation/appointments";
import { createAppointmentAction } from "./actions";

export function NewAppointmentDialog({
  customers,
  appointmentLabel,
}: {
  customers: Customer[];
  appointmentLabel: string;
}) {
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const [formError, setFormError] = useState<string>();

  const { control, handleSubmit, reset, formState } = useForm<CreateAppointmentInput>({
    resolver: zodResolver(createAppointmentSchema),
    defaultValues: { customerId: "", purpose: "", scheduledAt: "" },
  });

  function onSubmit(values: CreateAppointmentInput) {
    setFormError(undefined);
    startTransition(async () => {
      const result = await createAppointmentAction(values);
      if (result?.error) {
        setFormError(result.error);
        return;
      }
      setOpen(false);
      reset();
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <Button onClick={() => setOpen(true)} disabled={customers.length === 0}>
        <Plus className="size-4" />
        Book {appointmentLabel.toLowerCase()}
      </Button>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Book a {appointmentLabel.toLowerCase()}</DialogTitle>
          <DialogDescription>Schedule a real appointment for an existing customer.</DialogDescription>
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
              name="purpose"
              label="Purpose"
              placeholder="e.g. See the Oslo dining table in person"
            />

            <Controller
              control={control}
              name="scheduledAt"
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.error ? true : undefined}>
                  <FieldLabel htmlFor="scheduledAt">Date &amp; time</FieldLabel>
                  <Input {...field} id="scheduledAt" type="datetime-local" />
                  <FieldError errors={fieldState.error ? [fieldState.error] : undefined} />
                </Field>
              )}
            />

            {formError ? (
              <p role="alert" className="text-sm text-destructive">
                {formError}
              </p>
            ) : null}
          </FieldGroup>

          <DialogFooter className="mt-6">
            <Button type="submit" disabled={pending}>
              {pending ? <Loader2 className="size-4 animate-spin" /> : null}
              Book
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
