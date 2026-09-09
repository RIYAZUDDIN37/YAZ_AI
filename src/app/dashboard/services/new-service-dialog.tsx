"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Plus, Loader2 } from "lucide-react";
import type { ServiceCategory } from "@prisma/client";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { TextField } from "@/components/form/text-field";
import {
  createServiceFormSchema,
  catalogueStatusValues,
  type CreateServiceFormValues,
} from "@/lib/validation/services";
import { createServiceAction } from "./actions";

const STATUS_LABEL: Record<(typeof catalogueStatusValues)[number], string> = {
  DRAFT: "Draft",
  ACTIVE: "Active",
  ARCHIVED: "Archived",
};

export function NewServiceDialog({ categories }: { categories: ServiceCategory[] }) {
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const [formError, setFormError] = useState<string>();
  const router = useRouter();

  const { control, handleSubmit, reset } = useForm<CreateServiceFormValues>({
    resolver: zodResolver(createServiceFormSchema),
    defaultValues: {
      name: "",
      categoryId: "",
      description: "",
      price: "",
      durationMinutes: "30",
      status: "ACTIVE",
    },
  });

  function onSubmit(values: CreateServiceFormValues) {
    setFormError(undefined);
    startTransition(async () => {
      const result = await createServiceAction({
        ...values,
        price: Number(values.price),
        durationMinutes: Number(values.durationMinutes),
      });
      if (result?.error) {
        setFormError(result.error);
        return;
      }
      setOpen(false);
      reset();
      if (result.serviceId) {
        router.push(`/dashboard/services/${result.serviceId}`);
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <Button onClick={() => setOpen(true)}>
        <Plus className="size-4" />
        Add service
      </Button>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add service</DialogTitle>
          <DialogDescription>Add a new item to your catalogue.</DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} noValidate>
          <FieldGroup>
            <TextField control={control} name="name" label="Name" placeholder="Teeth Whitening" autoFocus />

            <Controller
              control={control}
              name="categoryId"
              render={({ field }) => (
                <Field>
                  <FieldLabel htmlFor="categoryId">Category</FieldLabel>
                  <Select value={field.value} onValueChange={(value) => field.onChange(value ?? "")}>
                    <SelectTrigger id="categoryId" className="w-full">
                      <SelectValue placeholder="No category">
                        {(value: string | null) =>
                          categories.find((category) => category.id === value)?.name ?? "No category"
                        }
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      {categories.length === 0 ? (
                        <div className="px-2 py-1.5 text-sm text-muted-foreground">
                          No categories yet
                        </div>
                      ) : (
                        categories.map((category) => (
                          <SelectItem key={category.id} value={category.id}>
                            {category.name}
                          </SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
                </Field>
              )}
            />

            <Controller
              control={control}
              name="description"
              render={({ field }) => (
                <Field>
                  <FieldLabel htmlFor="description">Description</FieldLabel>
                  <Textarea {...field} id="description" rows={3} placeholder="Optional" />
                </Field>
              )}
            />

            <div className="grid grid-cols-2 gap-3">
              <TextField control={control} name="price" label="Price (₹)" type="number" />
              <TextField control={control} name="durationMinutes" label="Duration (min)" type="number" />
            </div>

            <Controller
              control={control}
              name="status"
              render={({ field }) => (
                <Field>
                  <FieldLabel htmlFor="status">Status</FieldLabel>
                  <Select value={field.value} onValueChange={(value) => field.onChange(value)}>
                    <SelectTrigger id="status" className="w-full">
                      <SelectValue>
                        {(value: string | null) =>
                          STATUS_LABEL[(value as (typeof catalogueStatusValues)[number]) ?? "ACTIVE"]
                        }
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      {catalogueStatusValues.map((status) => (
                        <SelectItem key={status} value={status}>
                          {STATUS_LABEL[status]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
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
              Add service
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
