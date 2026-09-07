import { z } from "zod";

/**
 * "Start a conversation" here means a staff member logging real customer
 * contact (a phone call, an email, a walk-in). The AI (Maya) gets the
 * first attempt at it, same as a real inbound contact would — see
 * src/services/conversations/start-conversation.ts.
 */
export const startConversationSchema = z.object({
  customerId: z.string().min(1, "Pick a customer"),
  initialMessage: z.string().trim().min(1, "Enter what the customer said").max(4000),
});
export type StartConversationInput = z.infer<typeof startConversationSchema>;

export const sendMessageSchema = z.object({
  conversationId: z.string().min(1),
  body: z.string().trim().min(1, "Message can't be empty").max(4000),
});
export type SendMessageInput = z.infer<typeof sendMessageSchema>;

/** Statuses a human can set directly. AI_HANDLING = "return to AI" (only
 * meaningful once the AI is actually handling conversations, from Phase
 * 7-8 onward). HUMAN_NEEDED isn't human-settable — that's the AI's own
 * escalation signal via the escalateToHuman tool. */
export const conversationStatusValues = [
  "AI_HANDLING",
  "HUMAN_HANDLING",
  "RESOLVED",
] as const;

export const updateConversationStatusSchema = z.object({
  conversationId: z.string().min(1),
  status: z.enum(conversationStatusValues),
});
export type UpdateConversationStatusInput = z.infer<
  typeof updateConversationStatusSchema
>;
