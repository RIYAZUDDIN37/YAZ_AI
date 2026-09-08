import { z } from "zod";

export const appointmentStatusValues = [
  "SCHEDULED",
  "CONFIRMED",
  "COMPLETED",
  "CANCELLED",
  "NO_SHOW",
] as const;

/**
 * `scheduledAt` stays a plain string (an HTML `datetime-local` input's
 * native value shape, "YYYY-MM-DDTHH:mm") rather than `z.coerce.date()` —
 * z.coerce splits a schema's input/output types, which breaks useForm's
 * single generic when paired with the shared TextField component (see
 * the note in src/lib/validation/products.ts). Converted to a real Date
 * in the service layer instead.
 */
export const createAppointmentSchema = z.object({
  customerId: z.string().min(1, "Pick a customer"),
  purpose: z.string().trim().min(1, "Describe the purpose").max(300),
  scheduledAt: z.string().min(1, "Pick a date and time"),
  // No durationMinutes field — the server defaults to 30 and nothing
  // needs to override it yet. Adding one back would need the same
  // client-schema-variant treatment as products/leads (see the note
  // above) since z.coerce.number() splits useForm's single generic.
});
export type CreateAppointmentInput = z.infer<typeof createAppointmentSchema>;

export const updateAppointmentStatusSchema = z.object({
  appointmentId: z.string().min(1),
  status: z.enum(appointmentStatusValues),
});
export type UpdateAppointmentStatusInput = z.infer<typeof updateAppointmentStatusSchema>;
