import { z } from "zod";
import { db } from "@/server/db/client";
import { writeAuditLog } from "@/services/audit/log";
import { runAutomations } from "@/services/automations/run";
import { findAppointmentConflict } from "@/services/appointments/check-conflict";
import type { AgentTool } from "@/services/ai/types";

const inputSchema = z.object({
  purpose: z.string().min(1).describe("Why the customer is coming in, e.g. 'wants to see the Oslo dining table in person'"),
  scheduledAt: z
    .string()
    .describe("ISO 8601 date-time for the visit, e.g. '2026-09-12T11:00:00'. Prefer a near-future business-hours slot when the customer hasn't specified an exact time."),
});

type Input = z.infer<typeof inputSchema>;

interface CreateAppointmentResult {
  appointmentId: string;
  scheduledAt: string;
}

export const createAppointmentTool: AgentTool<Input, CreateAppointmentResult | { error: string }> = {
  name: "createAppointment",
  description:
    "Book a real appointment (showroom visit, reservation, etc. — labelled per-industry) for the customer in this conversation. Only call this once the customer has actually agreed to a visit, not just when they might be interested.",
  inputSchema: {
    type: "object",
    properties: {
      purpose: { type: "string" },
      scheduledAt: { type: "string" },
    },
    required: ["purpose", "scheduledAt"],
  },
  zodSchema: inputSchema,
  async execute(input, ctx) {
    const conversation = await db.conversation.findFirst({
      where: { id: ctx.conversationId, businessId: ctx.businessId },
    });
    if (!conversation?.customerId) {
      return { error: "This conversation has no linked customer to book an appointment for." };
    }

    const scheduledAt = new Date(input.scheduledAt);
    if (Number.isNaN(scheduledAt.getTime())) {
      return { error: "Invalid date/time — use ISO 8601 format." };
    }

    const conflict = await findAppointmentConflict(ctx.businessId, scheduledAt, 30);
    if (conflict) {
      return { error: `That time is already booked (${conflict.scheduledAt.toLocaleString()}) — offer the customer a different slot.` };
    }

    const appointment = await db.appointment.create({
      data: {
        businessId: ctx.businessId,
        customerId: conversation.customerId,
        purpose: input.purpose,
        scheduledAt,
        status: "SCHEDULED",
        source: "AI conversation",
      },
    });

    await writeAuditLog({
      action: "appointment.created_by_ai",
      businessId: ctx.businessId,
      metadata: { appointmentId: appointment.id, conversationId: ctx.conversationId, purpose: input.purpose },
    });

    await runAutomations(ctx.businessId, {
      type: "APPOINTMENT_BOOKED",
      appointmentId: appointment.id,
      customerId: conversation.customerId,
      purpose: input.purpose,
    });

    return { appointmentId: appointment.id, scheduledAt: appointment.scheduledAt.toISOString() };
  },
};
