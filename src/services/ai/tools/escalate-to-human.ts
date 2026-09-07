import { z } from "zod";
import { db } from "@/server/db/client";
import { writeAuditLog } from "@/services/audit/log";
import type { AgentTool } from "@/services/ai/types";

const inputSchema = z.object({
  reason: z
    .string()
    .min(1)
    .describe(
      "Why this needs a human — e.g. 'customer requested a discount beyond what I can offer', 'customer is upset', 'question outside my capabilities'",
    ),
});

type Input = z.infer<typeof inputSchema>;

/**
 * This is the governance backbone (spec section 10): when the AI hits a
 * request it isn't allowed to decide on, it calls this instead of
 * guessing. The tool itself flips the conversation to HUMAN_NEEDED — the
 * orchestrator doesn't need a second code path to enforce the handoff.
 */
export const escalateToHumanTool: AgentTool<Input, { escalated: true }> = {
  name: "escalateToHuman",
  description:
    "Hand this conversation to a human team member instead of answering yourself. Use this when the customer asks for something outside your capabilities or rules (e.g. a discount you're not authorized to give), seems upset, or asks to speak to a person.",
  inputSchema: {
    type: "object",
    properties: {
      reason: { type: "string" },
    },
    required: ["reason"],
  },
  zodSchema: inputSchema,
  async execute(input, ctx) {
    await db.conversation.update({
      where: { id: ctx.conversationId },
      data: { status: "HUMAN_NEEDED" },
    });

    await writeAuditLog({
      action: "conversation.escalated_by_ai",
      businessId: ctx.businessId,
      metadata: { conversationId: ctx.conversationId, reason: input.reason },
    });

    return { escalated: true };
  },
};
