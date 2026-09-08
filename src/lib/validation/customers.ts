import { z } from "zod";

export const createCustomerSchema = z.object({
  name: z.string().trim().min(1, "Enter a name").max(200),
  email: z.string().trim().email("Enter a valid email").max(200).optional().or(z.literal("")),
  phone: z.string().trim().max(50).optional().or(z.literal("")),
  source: z.string().trim().max(100).optional().or(z.literal("")),
});
export type CreateCustomerInput = z.infer<typeof createCustomerSchema>;

export const updateCustomerSchema = createCustomerSchema.extend({
  customerId: z.string().min(1),
});
export type UpdateCustomerInput = z.infer<typeof updateCustomerSchema>;

export const addCustomerNoteSchema = z.object({
  customerId: z.string().min(1),
  body: z.string().trim().min(1, "Enter a note").max(2000),
});
export type AddCustomerNoteInput = z.infer<typeof addCustomerNoteSchema>;
