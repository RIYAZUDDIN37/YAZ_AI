import { db } from "@/server/db/client";
import { ForbiddenError, NotFoundError } from "@/lib/errors";
import { can } from "@/server/authorization/permissions";
import type { OrgRole } from "@prisma/client";
import { writeAuditLog } from "@/services/audit/log";
import { runAgentTurn } from "@/services/ai/orchestrator";
import type { StartConversationInput } from "@/lib/validation/conversations";

/**
 * A staff member logging real customer contact — a phone call, an email,
 * a walk-in inquiry — as the opening message of a new conversation. The
 * conversation starts AI_HANDLING: Maya gets the first attempt, same as
 * a real inbound contact would, escalating to HUMAN_NEEDED herself if
 * she can't help. `assignedToUserId` still records who logged it, for
 * when a human does need to step in.
 */
export async function startConversation(
  businessId: string,
  actorUserId: string,
  actorRole: OrgRole,
  input: StartConversationInput,
) {
  if (!can(actorRole, "conversations:manage")) {
    throw new ForbiddenError("You don't have access to conversations.");
  }

  const customer = await db.customer.findFirst({
    where: { id: input.customerId, businessId },
  });
  if (!customer) {
    throw new NotFoundError("That customer couldn't be found.");
  }

  const conversation = await db.conversation.create({
    data: {
      businessId,
      customerId: customer.id,
      assignedToUserId: actorUserId,
      status: "AI_HANDLING",
      messages: {
        create: {
          senderType: "CUSTOMER",
          body: input.initialMessage,
        },
      },
    },
    include: { messages: true, customer: true },
  });

  await writeAuditLog({
    action: "conversation.started",
    userId: actorUserId,
    businessId,
    metadata: { conversationId: conversation.id, customerId: customer.id },
  });

  const triggerMessage = conversation.messages[0];
  try {
    await runAgentTurn({
      businessId,
      conversationId: conversation.id,
      triggerMessageId: triggerMessage.id,
    });
  } catch {
    // runAgentTurn already logs the failure and escalates the
    // conversation — a provider error shouldn't block the conversation
    // from having been created.
  }

  return conversation;
}
