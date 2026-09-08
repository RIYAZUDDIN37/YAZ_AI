import { z } from "zod";

export const leadStatusValues = [
  "NEW",
  "QUALIFIED",
  "CONTACTED",
  "APPOINTMENT",
  "PROPOSAL",
  "WON",
  "LOST",
] as const;

export const createLeadSchema = z.object({
  customerId: z.string().min(1, "Pick a customer"),
  intent: z.string().trim().min(1, "Describe what they're after").max(500),
  value: z.coerce.number().positive().optional(),
  source: z.string().trim().max(100).optional().or(z.literal("")),
});
export type CreateLeadInput = z.infer<typeof createLeadSchema>;

/**
 * The client-facing variant: `value` stays a plain string, matching what
 * a number `<input>` actually hands react-hook-form (a string, always —
 * DOM `onChange` events don't know about `z.coerce`). The server action
 * re-validates with `createLeadSchema` (real `z.coerce.number()`), which
 * is the actual security/correctness boundary — this is only about
 * keeping `useForm`'s single generic simple, not double validation.
 */
export const createLeadFormSchema = createLeadSchema.extend({
  value: z.string().trim().optional(),
});
export type CreateLeadFormValues = z.infer<typeof createLeadFormSchema>;

export const updateLeadStatusSchema = z.object({
  leadId: z.string().min(1),
  status: z.enum(leadStatusValues),
});
export type UpdateLeadStatusInput = z.infer<typeof updateLeadStatusSchema>;

export const addLeadNoteSchema = z.object({
  leadId: z.string().min(1),
  body: z.string().trim().min(1, "Enter a note").max(2000),
});
export type AddLeadNoteInput = z.infer<typeof addLeadNoteSchema>;
