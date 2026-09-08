"use client";

import { useTransition } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import type { Product, ProductCategory } from "@prisma/client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { TextField } from "@/components/form/text-field";
import {
  updateProductFormSchema,
  catalogueStatusValues,
  type UpdateProductFormValues,
} from "@/lib/validation/products";
import { updateProductAction } from "../actions";

const STATUS_LABEL: Record<(typeof catalogueStatusValues)[number], string> = {
  DRAFT: "Draft",
  ACTIVE: "Active",
  ARCHIVED: "Archived",
};

export function ProductEditForm({
  product,
  categories,
}: {
  product: Product;
  categories: ProductCategory[];
}) {
  const [pending, startTransition] = useTransition();

  const { control, handleSubmit } = useForm<UpdateProductFormValues>({
    resolver: zodResolver(updateProductFormSchema),
    defaultValues: {
      productId: product.id,
      name: product.name,
      categoryId: product.categoryId ?? "",
      description: product.description ?? "",
      price: String(product.price),
      status: product.status,
    },
  });

  function onSubmit(values: UpdateProductFormValues) {
    startTransition(async () => {
      const result = await updateProductAction({
        productId: values.productId,
        name: values.name,
        categoryId: values.categoryId,
        description: values.description,
        status: values.status,
        price: Number(values.price),
      });
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
                  {categories.map((category) => (
                    <SelectItem key={category.id} value={category.id}>
                      {category.name}
                    </SelectItem>
                  ))}
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
              <Textarea {...field} id="description" rows={3} />
            </Field>
          )}
        />

        <TextField control={control} name="price" label="Price (₹)" type="number" />

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
      </FieldGroup>

      <Button type="submit" disabled={pending}>
        {pending ? <Loader2 className="size-4 animate-spin" /> : null}
        Save
      </Button>
    </form>
  );
}
