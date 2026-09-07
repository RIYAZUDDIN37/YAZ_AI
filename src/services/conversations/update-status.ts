import { db } from "@/server/db/client";
import { ForbiddenError, NotFoundError } from "@/lib/errors";
import { can } from "@/server/authorization/permissions";
import type { OrgRole } from "@prisma/client";
import { writeAuditLog } from "@/services/audit/log";
import { runAgentTurn } from "@/services/ai/orchestrator";
import type { UpdateConversationStatusInput } from "@/lib/validation/conversations";

const ACTION_BY_STATUS: Record<UpdateConversationStatusInput["status"], string> = {
  RESOLVED: "conversation.resolved",
  HUMAN_HANDLING: "conversation.taken_over",
  AI_HANDLING: "conversation.returned_to_ai",
};

export async function updateConversationStatus(
  businessId: string,
  actorUserId: string,
  actorRole: OrgRole,
  input: UpdateConversationStatusInput,
) {
  if (!can(actorRole, "conversations:manage")) {
    throw new ForbiddenError("You don't have access to conversations.");
  }

  const conversation = await db.conversation.findFirst({
    where: { id: input.conversationId, businessId },
    include: { messages: { orderBy: { createdAt: "desc" }, take: 1 } },
  });
  if (!conversation) {
    throw new NotFoundError("That conversation couldn't be found.");
  }

  const updated = await db.conversation.update({
    where: { id: conversation.id },
    data: { status: input.status },
  });

  await writeAuditLog({
    action: ACTION_BY_STATUS[input.status],
    userId: actorUserId,
    businessId,
    metadata: { conversationId: conversation.id },
  });

  // Returning to AI while the last message is an unanswered customer
  // message means there's a turn waiting — run it now instead of leaving
  // the conversation sitting in AI_HANDLING with nothing happening.
  const lastMessage = conversation.messages[0];
  if (input.status === "AI_HANDLING" && lastMessage?.senderType === "CUSTOMER") {
    try {
      await runAgentTurn({
        businessId,
        conversationId: conversation.id,
        triggerMessageId: lastMessage.id,
      });
    } catch {
      // Already logged and escalated inside runAgentTurn.
    }
  }

  return updated;
}
