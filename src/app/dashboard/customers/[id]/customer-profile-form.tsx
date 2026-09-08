"use client";

import { useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import type { Customer } from "@prisma/client";
import { Button } from "@/components/ui/button";
import { FieldGroup } from "@/components/ui/field";
import { TextField } from "@/components/form/text-field";
import { updateCustomerSchema, type UpdateCustomerInput } from "@/lib/validation/customers";
import { updateCustomerAction } from "../actions";

export function CustomerProfileForm({ customer }: { customer: Customer }) {
  const [pending, startTransition] = useTransition();

  const { control, handleSubmit } = useForm<UpdateCustomerInput>({
    resolver: zodResolver(updateCustomerSchema),
    defaultValues: {
      customerId: customer.id,
      name: customer.name,
      email: customer.email ?? "",
      phone: customer.phone ?? "",
      source: customer.source ?? "",
    },
  });

  function onSubmit(values: UpdateCustomerInput) {
    startTransition(async () => {
      const result = await updateCustomerAction(values);
      if (result?.error) {
        toast.error(result.error);
        return;
      }
      toast.success("Saved.");
    });
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="max-w-md space-y-4">
      <FieldGroup>
        <TextField control={control} name="name" label="Name" />
        <TextField control={control} name="email" label="Email" type="email" />
        <TextField control={control} name="phone" label="Phone" />
        <TextField control={control} name="source" label="Source" />
      </FieldGroup>
      <Button type="submit" disabled={pending}>
        {pending ? <Loader2 className="size-4 animate-spin" /> : null}
        Save
      </Button>
    </form>
  );
}
