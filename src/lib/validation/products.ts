import { z } from "zod";

export const catalogueStatusValues = ["DRAFT", "ACTIVE", "ARCHIVED"] as const;

export const createProductSchema = z.object({
  name: z.string().trim().min(1, "Enter a name").max(200),
  categoryId: z.string().trim().optional().or(z.literal("")),
  description: z.string().trim().max(2000).optional().or(z.literal("")),
  price: z.coerce.number().positive("Enter a price"),
  // Deliberately no `.default()` here — a schema-level default makes the
  // output type non-optional while the input type stays optional, which
  // splits useForm's single generic the same way z.coerce does (see the
  // form-schema note below). The forms always pass status explicitly via
  // defaultValues instead.
  status: z.enum(catalogueStatusValues),
  initialQuantity: z.coerce.number().int().min(0).optional(),
});
export type CreateProductInput = z.infer<typeof createProductSchema>;

/** Client-facing variant — see the same note on createLeadFormSchema in
 * validation/leads.ts: `price`/`initialQuantity` stay strings, matching
 * what a number `<input>` actually hands react-hook-form. The server
 * action re-validates with createProductSchema's real z.coerce.number(). */
export const createProductFormSchema = createProductSchema.extend({
  price: z.string().trim().min(1, "Enter a price"),
  initialQuantity: z.string().trim().optional(),
});
export type CreateProductFormValues = z.infer<typeof createProductFormSchema>;

export const updateProductSchema = createProductSchema.extend({
  productId: z.string().min(1),
});
export type UpdateProductInput = z.infer<typeof updateProductSchema>;

export const updateProductFormSchema = updateProductSchema.extend({
  price: z.string().trim().min(1, "Enter a price"),
  initialQuantity: z.string().trim().optional(),
});
export type UpdateProductFormValues = z.infer<typeof updateProductFormSchema>;

export const createProductCategorySchema = z.object({
  name: z.string().trim().min(1, "Enter a name").max(100),
});
export type CreateProductCategoryInput = z.infer<typeof createProductCategorySchema>;

export const adjustInventorySchema = z.object({
  inventoryItemId: z.string().min(1),
  quantityOnHand: z.coerce.number().int().min(0, "Can't go below 0"),
});
export type AdjustInventoryInput = z.infer<typeof adjustInventorySchema>;
