import { db } from "@/server/db/client";
import { ForbiddenError, NotFoundError } from "@/lib/errors";
import { can } from "@/server/authorization/permissions";
import type { OrgRole } from "@prisma/client";
import { writeAuditLog } from "@/services/audit/log";
import type { StartConversationInput } from "@/lib/validation/conversations";

/**
 * A staff member logging real customer contact — a phone call, an email,
 * a walk-in inquiry — as the opening message of a new conversation. Not
 * an AI-generated conversation; there's no AI orchestration yet (Phase
 * 7-8). The conversation starts assigned to whoever logged it, in
 * HUMAN_HANDLING, since only a human can respond right now.
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
      status: "HUMAN_HANDLING",
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

  return conversation;
}
