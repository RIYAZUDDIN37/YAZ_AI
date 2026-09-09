import { z } from "zod";

export const quotationStatusValues = ["DRAFT", "SENT", "ACCEPTED", "DECLINED", "EXPIRED"] as const;

export const createQuotationSchema = z.object({
  customerId: z.string().min(1, "Pick a customer"),
  leadId: z.string().trim().optional().or(z.literal("")),
  notes: z.string().trim().max(1000).optional().or(z.literal("")),
});
export type CreateQuotationInput = z.infer<typeof createQuotationSchema>;

export const updateQuotationStatusSchema = z.object({
  quotationId: z.string().min(1),
  status: z.enum(quotationStatusValues),
});
export type UpdateQuotationStatusInput = z.infer<typeof updateQuotationStatusSchema>;

/** `catalogueItemId` is a Product id or a Service id depending on the
 * business's `IndustryConfig.catalogueType` — the service layer decides
 * which column to set, never trusts the client for that. */
export const addQuotationItemSchema = z.object({
  quotationId: z.string().min(1),
  catalogueItemId: z.string().min(1, "Pick an item"),
  quantity: z.coerce.number().int().positive("Enter a quantity"),
});
export type AddQuotationItemInput = z.infer<typeof addQuotationItemSchema>;

export const addQuotationItemFormSchema = addQuotationItemSchema.extend({
  quantity: z.string().trim().min(1, "Enter a quantity"),
});
export type AddQuotationItemFormValues = z.infer<typeof addQuotationItemFormSchema>;

export const removeQuotationItemSchema = z.object({ itemId: z.string().min(1) });
export type RemoveQuotationItemInput = z.infer<typeof removeQuotationItemSchema>;
