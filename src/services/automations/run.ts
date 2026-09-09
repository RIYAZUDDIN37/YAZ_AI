import type { Prisma } from "@prisma/client";
import { db } from "@/server/db/client";

/**
 * The automation engine (Phase 13). No cron/queue exists in this app —
 * every automation is event-driven and runs synchronously, called
 * directly from the same service functions (and AI tools) that already
 * write the row the event describes. See the schema.prisma doc comment
 * on the Automations section for why.
 *
 * Never throws past the caller: a business's automation misconfiguration
 * must not break the real action (creating a lead, escalating a
 * conversation, ...) that raised the event. Every automation that
 * matches the event gets exactly one WorkflowExecution row — SUCCESS,
 * SKIPPED (trigger matched the event type but not `triggerConfig`), or
 * ERROR — the same "real audit trail, not a fabricated activity feed"
 * posture as AgentExecution.
 */

export type AutomationEvent =
  | { type: "LEAD_CREATED"; leadId: string; customerId: string; intent: string | null }
  | { type: "LEAD_STATUS_CHANGED"; leadId: string; customerId: string | null; fromStatus: string; toStatus: string }
  | { type: "CONVERSATION_ESCALATED"; conversationId: string; reason: string }
  | { type: "APPOINTMENT_BOOKED"; appointmentId: string; customerId: string | null; purpose: string };

export async function runAutomations(businessId: string, event: AutomationEvent): Promise<void> {
  const automations = await db.automation.findMany({
    where: { businessId, triggerEvent: event.type, isActive: true },
  });

  for (const automation of automations) {
    if (!matchesTriggerConfig(automation.triggerConfig, event)) {
      await logExecution(automation.id, businessId, "SKIPPED", "Trigger condition didn't match.", event);
      continue;
    }

    try {
      const summary = await executeAction(businessId, automation.actionType, automation.actionConfig, event);
      await logExecution(automation.id, businessId, "SUCCESS", summary, event);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      await logExecution(automation.id, businessId, "ERROR", "Action failed.", event, errorMessage);
    }
  }
}

function matchesTriggerConfig(triggerConfig: unknown, event: AutomationEvent): boolean {
  if (event.type !== "LEAD_STATUS_CHANGED") return true;
  if (!triggerConfig || typeof triggerConfig !== "object") return true;

  const config = triggerConfig as { status?: string };
  if (!config.status) return true;
  return config.status === event.toStatus;
}

async function executeAction(
  businessId: string,
  actionType: string,
  actionConfig: unknown,
  event: AutomationEvent,
): Promise<string> {
  const config = (actionConfig ?? {}) as { message?: string; status?: string };

  switch (actionType) {
    case "NOTIFY_TEAM": {
      const members = await db.organizationMember.findMany({
        where: { organization: { businesses: { some: { id: businessId } } } },
        select: { userId: true },
      });
      const title = "Automation triggered";
      const body = config.message ?? describeEvent(event);
      await db.notification.createMany({
        data: members.map((member) => ({
          businessId,
          userId: member.userId,
          title,
          body,
        })),
      });
      return `Notified ${members.length} team member(s): "${body}"`;
    }

    case "ADD_LEAD_NOTE": {
      const leadId = "leadId" in event ? event.leadId : undefined;
      if (!leadId) return "No lead in this event — nothing to note.";
      const body = config.message ?? describeEvent(event);
      await db.leadActivity.create({ data: { leadId, type: "note", body } });
      return `Added a note to lead ${leadId}: "${body}"`;
    }

    case "CHANGE_LEAD_STATUS": {
      const leadId = "leadId" in event ? event.leadId : undefined;
      const targetStatus = config.status;
      if (!leadId || !targetStatus) return "Missing leadId or target status — nothing to change.";
      // A direct update, not the updateLeadStatus service — automations
      // must not re-trigger LEAD_STATUS_CHANGED and cascade into other
      // automations. Still writes a real LeadActivity entry, same as a
      // human-driven status change would.
      const lead = await db.lead.findUnique({ where: { id: leadId } });
      if (!lead || lead.status === targetStatus) return "Lead already at that status — nothing to change.";
      await db.lead.update({
        where: { id: leadId },
        data: {
          status: targetStatus as never,
          activities: {
            create: { type: "status_change", body: `Status changed to ${targetStatus} by an automation.` },
          },
        },
      });
      return `Changed lead ${leadId} status to ${targetStatus}.`;
    }

    default:
      throw new Error(`Unknown action type: ${actionType}`);
  }
}

function describeEvent(event: AutomationEvent): string {
  switch (event.type) {
    case "LEAD_CREATED":
      return `A new lead was created${event.intent ? `: ${event.intent}` : "."}`;
    case "LEAD_STATUS_CHANGED":
      return `A lead's status changed from ${event.fromStatus} to ${event.toStatus}.`;
    case "CONVERSATION_ESCALATED":
      return `An AI conversation was escalated: ${event.reason}`;
    case "APPOINTMENT_BOOKED":
      return `An appointment was booked: ${event.purpose}`;
  }
}

async function logExecution(
  automationId: string,
  businessId: string,
  status: "SUCCESS" | "SKIPPED" | "ERROR",
  summary: string,
  event: AutomationEvent,
  errorMessage?: string,
): Promise<void> {
  await db.workflowExecution.create({
    data: {
      automationId,
      businessId,
      status,
      summary,
      context: event as unknown as Prisma.InputJsonValue,
      errorMessage,
    },
  });
}
