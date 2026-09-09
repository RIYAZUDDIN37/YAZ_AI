import { z } from "zod";

export const automationTriggerValues = [
  "LEAD_CREATED",
  "LEAD_STATUS_CHANGED",
  "CONVERSATION_ESCALATED",
  "APPOINTMENT_BOOKED",
] as const;

export const automationActionValues = ["NOTIFY_TEAM", "ADD_LEAD_NOTE", "CHANGE_LEAD_STATUS"] as const;

export const leadStatusValues = [
  "NEW",
  "QUALIFIED",
  "CONTACTED",
  "APPOINTMENT",
  "PROPOSAL",
  "WON",
  "LOST",
] as const;

/**
 * `triggerStatus`/`actionMessage`/`actionStatus` are the UI's flattened
 * view of `triggerConfig`/`actionConfig` (real `Json` columns) — only
 * the field relevant to the chosen trigger/action is used, decided by
 * the service layer, not trusted from the client beyond validation.
 */
export const createAutomationSchema = z.object({
  name: z.string().trim().min(1, "Give it a name").max(200),
  triggerEvent: z.enum(automationTriggerValues),
  triggerStatus: z.enum(leadStatusValues).optional(),
  actionType: z.enum(automationActionValues),
  actionMessage: z.string().trim().max(500).optional().or(z.literal("")),
  actionStatus: z.enum(leadStatusValues).optional(),
});
export type CreateAutomationInput = z.infer<typeof createAutomationSchema>;

export const toggleAutomationSchema = z.object({
  automationId: z.string().min(1),
  isActive: z.boolean(),
});
export type ToggleAutomationInput = z.infer<typeof toggleAutomationSchema>;

export const deleteAutomationSchema = z.object({ automationId: z.string().min(1) });
export type DeleteAutomationInput = z.infer<typeof deleteAutomationSchema>;
