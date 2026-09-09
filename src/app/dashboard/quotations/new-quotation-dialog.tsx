"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Plus, Loader2 } from "lucide-react";
import type { Customer, Lead } from "@prisma/client";
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { createQuotationSchema, type CreateQuotationInput } from "@/lib/validation/quotations";
import { createQuotationAction } from "./actions";

export function NewQuotationDialog({ customers, leads }: { customers: Customer[]; leads: Lead[] }) {
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const [formError, setFormError] = useState<string>();
  const router = useRouter();

  const { control, handleSubmit, reset, watch, setValue, formState } = useForm<CreateQuotationInput>({
    resolver: zodResolver(createQuotationSchema),
    defaultValues: { customerId: "", leadId: "", notes: "" },
  });

  const customerId = watch("customerId");
  const customerLeads = leads.filter((lead) => lead.customerId === customerId);

  function onSubmit(values: CreateQuotationInput) {
    setFormError(undefined);
    startTransition(async () => {
      const result = await createQuotationAction(values);
      if (result?.error) {
        setFormError(result.error);
        return;
      }
      setOpen(false);
      reset();
      if (result.quotationId) {
        router.push(`/dashboard/quotations/${result.quotationId}`);
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <Button onClick={() => setOpen(true)} disabled={customers.length === 0}>
        <Plus className="size-4" />
        New quotation
      </Button>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>New quotation</DialogTitle>
          <DialogDescription>Start a priced offer for a customer — add items next.</DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} noValidate>
          <FieldGroup>
            <Controller
              control={control}
              name="customerId"
              render={({ field }) => (
                <Field data-invalid={formState.errors.customerId ? true : undefined}>
                  <FieldLabel htmlFor="customerId">Customer</FieldLabel>
                  <Select
                    value={field.value}
                    onValueChange={(value) => {
                      field.onChange(value ?? "");
                      setValue("leadId", "");
                    }}
                  >
                    <SelectTrigger id="customerId" className="w-full">
                      <SelectValue placeholder="Pick a customer">
                        {(value: string | null) =>
                          customers.find((customer) => customer.id === value)?.name ?? "Pick a customer"
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
                  <FieldError errors={formState.errors.customerId ? [formState.errors.customerId] : undefined} />
                </Field>
              )}
            />

            {customerLeads.length > 0 ? (
              <Controller
                control={control}
                name="leadId"
                render={({ field }) => (
                  <Field>
                    <FieldLabel htmlFor="leadId">Linked lead (optional)</FieldLabel>
                    <Select value={field.value} onValueChange={(value) => field.onChange(value ?? "")}>
                      <SelectTrigger id="leadId" className="w-full">
                        <SelectValue placeholder="No linked lead">
                          {(value: string | null) =>
                            customerLeads.find((lead) => lead.id === value)?.intent ?? "No linked lead"
                          }
                        </SelectValue>
                      </SelectTrigger>
                      <SelectContent>
                        {customerLeads.map((lead) => (
                          <SelectItem key={lead.id} value={lead.id}>
                            {lead.intent ?? lead.id}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </Field>
                )}
              />
            ) : null}

            <Controller
              control={control}
              name="notes"
              render={({ field }) => (
                <Field>
                  <FieldLabel htmlFor="notes">Notes (optional)</FieldLabel>
                  <Textarea {...field} id="notes" rows={2} placeholder="Internal notes about this quotation" />
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
              Create
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
