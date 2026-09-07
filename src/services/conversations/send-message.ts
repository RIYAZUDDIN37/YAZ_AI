import { db } from "@/server/db/client";
import { ForbiddenError, NotFoundError } from "@/lib/errors";
import { can } from "@/server/authorization/permissions";
import type { OrgRole } from "@prisma/client";
import type { SendMessageInput } from "@/lib/validation/conversations";

/** A staff reply. Re-checks the conversation belongs to this business —
 * a conversationId is just an opaque string from the client otherwise. */
export async function sendMessage(
  businessId: string,
  actorUserId: string,
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

  const [message] = await db.$transaction([
    db.message.create({
      data: {
        conversationId: conversation.id,
        senderType: "STAFF",
        senderUserId: actorUserId,
        body: input.body,
      },
    }),
    db.conversation.update({
      where: { id: conversation.id },
      data: {
        lastMessageAt: new Date(),
        // Replying implicitly claims the conversation if unassigned.
        assignedToUserId: conversation.assignedToUserId ?? actorUserId,
      },
    }),
  ]);

  return message;
}
