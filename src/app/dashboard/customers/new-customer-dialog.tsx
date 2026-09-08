"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Plus, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { FieldGroup } from "@/components/ui/field";
import { TextField } from "@/components/form/text-field";
import { createCustomerSchema, type CreateCustomerInput } from "@/lib/validation/customers";
import { createCustomerAction } from "./actions";

export function NewCustomerDialog() {
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const [formError, setFormError] = useState<string>();
  const router = useRouter();

  const { control, handleSubmit, reset } = useForm<CreateCustomerInput>({
    resolver: zodResolver(createCustomerSchema),
    defaultValues: { name: "", email: "", phone: "", source: "" },
  });

  function onSubmit(values: CreateCustomerInput) {
    setFormError(undefined);
    startTransition(async () => {
      const result = await createCustomerAction(values);
      if (result?.error) {
        setFormError(result.error);
        return;
      }
      setOpen(false);
      reset();
      if (result.customerId) {
        router.push(`/dashboard/customers/${result.customerId}`);
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <Button onClick={() => setOpen(true)}>
        <Plus className="size-4" />
        Add customer
      </Button>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add customer</DialogTitle>
          <DialogDescription>Add a new customer record.</DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} noValidate>
          <FieldGroup>
            <TextField control={control} name="name" label="Name" placeholder="Priya Mehta" autoFocus />
            <TextField control={control} name="email" label="Email" type="email" placeholder="priya@example.com" />
            <TextField control={control} name="phone" label="Phone" placeholder="+91 98765 43210" />
            <TextField control={control} name="source" label="Source" placeholder="Website, showroom, referral…" />

            {formError ? (
              <p role="alert" className="text-sm text-destructive">
                {formError}
              </p>
            ) : null}
          </FieldGroup>

          <DialogFooter className="mt-6">
            <Button type="submit" disabled={pending}>
              {pending ? <Loader2 className="size-4 animate-spin" /> : null}
              Add customer
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
