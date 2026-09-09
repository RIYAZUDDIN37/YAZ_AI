import { z } from "zod";
import { db } from "@/server/db/client";
import { writeAuditLog } from "@/services/audit/log";
import { runAutomations } from "@/services/automations/run";
import type { AgentTool } from "@/services/ai/types";

const inputSchema = z.object({
  intent: z.string().min(1).describe("What the customer is trying to do, e.g. 'wants a 6-seater dining table under 50k'"),
  value: z.number().positive().optional().describe("Estimated deal value, if known"),
});

type Input = z.infer<typeof inputSchema>;

interface CreateLeadResult {
  leadId: string;
  status: string;
}

export const createLeadTool: AgentTool<Input, CreateLeadResult | { error: string }> = {
  name: "createLead",
  description:
    "Record a sales lead for the customer in this conversation, capturing their intent and (if known) an estimated value. Only call this once per genuine new intent — don't create duplicate leads for the same request.",
  inputSchema: {
    type: "object",
    properties: {
      intent: { type: "string" },
      value: { type: "number" },
    },
    required: ["intent"],
  },
  zodSchema: inputSchema,
  async execute(input, ctx) {
    const conversation = await db.conversation.findFirst({
      where: { id: ctx.conversationId, businessId: ctx.businessId },
    });
    if (!conversation?.customerId) {
      return { error: "This conversation has no linked customer to attach a lead to." };
    }

    const lead = await db.lead.create({
      data: {
        businessId: ctx.businessId,
        customerId: conversation.customerId,
        status: "NEW",
        source: "AI conversation",
        intent: input.intent,
        value: input.value,
        activities: {
          create: { type: "created", body: `Created by the AI employee from a conversation: ${input.intent}` },
        },
      },
    });

    await writeAuditLog({
      action: "lead.created_by_ai",
      businessId: ctx.businessId,
      metadata: { leadId: lead.id, conversationId: ctx.conversationId, intent: input.intent },
    });

    await runAutomations(ctx.businessId, {
      type: "LEAD_CREATED",
      leadId: lead.id,
      customerId: conversation.customerId,
      intent: lead.intent,
    });

    return { leadId: lead.id, status: lead.status };
  },
};
