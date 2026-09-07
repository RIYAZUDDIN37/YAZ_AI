import { db } from "@/server/db/client";
import { ForbiddenError, NotFoundError } from "@/lib/errors";
import { can } from "@/server/authorization/permissions";
import type { OrgRole } from "@prisma/client";
import { runAgentTurn } from "@/services/ai/orchestrator";
import type { SendMessageInput } from "@/lib/validation/conversations";

/**
 * A staff member logging what the customer said on an already-open
 * conversation (a follow-up call/email) — as opposed to sendMessage,
 * which is the staff member replying as themselves. If the conversation
 * is currently AI_HANDLING, this is what feeds Maya the next turn.
 */
export async function logCustomerMessage(
  businessId: string,
  actorRole: OrgRole,
  input: SendMessageInput,
) {
  if (!can(actorRole, "conversations:manage")) {
    throw new ForbiddenError("You don't have access to conversations.");
  }

  const conversation = await db.conversation.findFirst({
    where: { id: input.conversationId, businessId },
  });
  if (!conversation) {
    throw new NotFoundError("That conversation couldn't be found.");
  }
  if (conversation.status === "RESOLVED") {
    throw new ForbiddenError("Reopen this conversation before adding to it.");
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
    data: { lastMessageAt: new Date() },
  });

  if (conversation.status === "AI_HANDLING") {
    try {
      await runAgentTurn({
        businessId,
        conversationId: conversation.id,
        triggerMessageId: message.id,
      });
    } catch {
      // Already logged and escalated inside runAgentTurn.
    }
  }

  return message;
}
