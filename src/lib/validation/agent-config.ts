import { z } from "zod";

export const updateAgentProfileSchema = z.object({
  name: z.string().trim().min(1, "Give your AI employee a name").max(100),
  title: z.string().trim().min(1, "Give your AI employee a title").max(100),
  tone: z.string().trim().max(300).optional(),
  customInstructions: z.string().trim().max(2000).optional(),
});
export type UpdateAgentProfileInput = z.infer<typeof updateAgentProfileSchema>;

export const createAgentRuleSchema = z.object({
  instruction: z.string().trim().min(1, "Enter a rule").max(500),
});
export type CreateAgentRuleInput = z.infer<typeof createAgentRuleSchema>;

export const toggleAgentRuleSchema = z.object({
  ruleId: z.string().min(1),
  isActive: z.boolean(),
});
export type ToggleAgentRuleInput = z.infer<typeof toggleAgentRuleSchema>;

export const deleteAgentRuleSchema = z.object({ ruleId: z.string().min(1) });
export type DeleteAgentRuleInput = z.infer<typeof deleteAgentRuleSchema>;

export const createAgentGoalSchema = z.object({
  description: z.string().trim().min(1, "Enter a goal").max(500),
});
export type CreateAgentGoalInput = z.infer<typeof createAgentGoalSchema>;

export const toggleAgentGoalSchema = z.object({
  goalId: z.string().min(1),
  isActive: z.boolean(),
});
export type ToggleAgentGoalInput = z.infer<typeof toggleAgentGoalSchema>;

export const deleteAgentGoalSchema = z.object({ goalId: z.string().min(1) });
export type DeleteAgentGoalInput = z.infer<typeof deleteAgentGoalSchema>;

export const sendTestMessageSchema = z.object({
  body: z.string().trim().min(1, "Type a message").max(4000),
});
export type SendTestMessageInput = z.infer<typeof sendTestMessageSchema>;
