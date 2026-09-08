import { db } from "@/server/db/client";
import { ForbiddenError } from "@/lib/errors";
import { can } from "@/server/authorization/permissions";
import type { OrgRole } from "@prisma/client";
import { runAgentTurn } from "@/services/ai/orchestrator";
import type { SendTestMessageInput } from "@/lib/validation/agent-config";

/**
 * Spec section 14: the Test Employee simulator must exercise the same
 * pipeline a real conversation does, not a separate mocked chat — so this
 * calls startConversation-equivalent logic and the real runAgentTurn
 * directly, the same functions/orchestrator the Inbox uses. The only
 * difference is `isTest: true` and `customerId: null`, which keeps
 * sandbox traffic out of the real Inbox and CRM (see the Conversation.
 * isTest comment in schema.prisma) — a tool like createLead will
 * honestly report "no linked customer" rather than writing fake CRM data.
 */
function requireTrainAccess(actorRole: OrgRole) {
  if (!can(actorRole, "business:manage")) {
    throw new ForbiddenError("You don't have access to test the AI employee.");
  }
}

export async function getActiveTestConversation(businessId: string) {
  return db.conversation.findFirst({
    where: { businessId, isTest: true },
    orderBy: { createdAt: "desc" },
    include: {
      messages: { orderBy: { createdAt: "asc" } },
      agentExecutions: {
        orderBy: { createdAt: "desc" },
        include: { actions: true },
      },
    },
  });
}

export async function sendTestMessage(
  businessId: string,
  actorUserId: string,
  actorRole: OrgRole,
  input: SendTestMessageInput,
) {
  requireTrainAccess(actorRole);

  let conversation = await db.conversation.findFirst({
    where: { businessId, isTest: true },
    orderBy: { createdAt: "desc" },
  });

  if (!conversation) {
    conversation = await db.conversation.create({
      data: {
        businessId,
        customerId: null,
        assignedToUserId: actorUserId,
        status: "AI_HANDLING",
        isTest: true,
      },
    });
  }

  const message = await db.message.create({
    data: {
      conversationId: conversation.id,
      senderType: "CUSTOMER",
      body: input.body,
    },
  });

  await db.conversation.update({
    where: { id: conversation.id },
    data: { lastMessageAt: new Date(), status: "AI_HANDLING" },
  });

  try {
    await runAgentTurn({
      businessId,
      conversationId: conversation.id,
      triggerMessageId: message.id,
    });
  } catch {
    // Already logged and escalated inside runAgentTurn — the test panel
    // reads the resulting AgentExecution/status to show what happened.
  }

  return conversation.id;
}

export async function resetTestConversation(businessId: string, actorRole: OrgRole) {
  requireTrainAccess(actorRole);

  // Cascades to Message/AgentExecution/AgentAction — see schema.prisma.
  await db.conversation.deleteMany({ where: { businessId, isTest: true } });
}
