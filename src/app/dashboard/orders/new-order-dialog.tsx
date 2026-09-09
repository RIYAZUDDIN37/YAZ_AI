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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { createOrderSchema, type CreateOrderInput } from "@/lib/validation/orders";
import { createOrderAction } from "./actions";

export function NewOrderDialog({ customers }: { customers: Customer[] }) {
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const [formError, setFormError] = useState<string>();
  const router = useRouter();

  const { control, handleSubmit, reset, formState } = useForm<CreateOrderInput>({
    resolver: zodResolver(createOrderSchema),
    defaultValues: { customerId: "" },
  });

  function onSubmit(values: CreateOrderInput) {
    setFormError(undefined);
    startTransition(async () => {
      const result = await createOrderAction(values);
      if (result?.error) {
        setFormError(result.error);
        return;
      }
      setOpen(false);
      reset();
      if (result.orderId) {
        router.push(`/dashboard/orders/${result.orderId}`);
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <Button onClick={() => setOpen(true)} disabled={customers.length === 0}>
        <Plus className="size-4" />
        New order
      </Button>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>New order</DialogTitle>
          <DialogDescription>Start an order for a customer — add items next.</DialogDescription>
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
