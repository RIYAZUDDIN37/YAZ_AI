import { z } from "zod";

/**
 * "Start a conversation" here means a staff member logging real customer
 * contact (a phone call, an email, a walk-in) — not the AI generating
 * anything. See prisma/schema.prisma's Conversation/Message comments.
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

export const conversationStatusValues = [
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
