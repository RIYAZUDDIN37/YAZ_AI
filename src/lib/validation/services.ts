import { z } from "zod";

export const catalogueStatusValues = ["DRAFT", "ACTIVE", "ARCHIVED"] as const;

export const createServiceSchema = z.object({
  name: z.string().trim().min(1, "Enter a name").max(200),
  categoryId: z.string().trim().optional().or(z.literal("")),
  description: z.string().trim().max(2000).optional().or(z.literal("")),
  price: z.coerce.number().positive("Enter a price"),
  durationMinutes: z.coerce.number().int().positive("Enter a duration"),
  // No `.default()` on status — see the note in validation/products.ts:
  // a schema-level default splits useForm's single generic the same way
  // z.coerce does.
  status: z.enum(catalogueStatusValues),
});
export type CreateServiceInput = z.infer<typeof createServiceSchema>;

/** Client-facing variant — numeric fields stay strings, matching what a
 * DOM `<input>` actually hands react-hook-form. See the identical note
 * on createProductFormSchema in validation/products.ts. */
export const createServiceFormSchema = createServiceSchema.extend({
  price: z.string().trim().min(1, "Enter a price"),
  durationMinutes: z.string().trim().min(1, "Enter a duration"),
});
export type CreateServiceFormValues = z.infer<typeof createServiceFormSchema>;

export const updateServiceSchema = createServiceSchema.extend({
  serviceId: z.string().min(1),
});
export type UpdateServiceInput = z.infer<typeof updateServiceSchema>;

export const updateServiceFormSchema = updateServiceSchema.extend({
  price: z.string().trim().min(1, "Enter a price"),
  durationMinutes: z.string().trim().min(1, "Enter a duration"),
});
export type UpdateServiceFormValues = z.infer<typeof updateServiceFormSchema>;

export const createServiceCategorySchema = z.object({
  name: z.string().trim().min(1, "Enter a name").max(100),
});
export type CreateServiceCategoryInput = z.infer<typeof createServiceCategorySchema>;
