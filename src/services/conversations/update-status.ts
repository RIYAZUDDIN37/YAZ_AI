import { db } from "@/server/db/client";
import { ForbiddenError, NotFoundError } from "@/lib/errors";
import { can } from "@/server/authorization/permissions";
import type { OrgRole } from "@prisma/client";
import { writeAuditLog } from "@/services/audit/log";
import type { UpdateConversationStatusInput } from "@/lib/validation/conversations";

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
  });
  if (!conversation) {
    throw new NotFoundError("That conversation couldn't be found.");
  }

  const updated = await db.conversation.update({
    where: { id: conversation.id },
    data: { status: input.status },
  });

  await writeAuditLog({
    action:
      input.status === "RESOLVED"
        ? "conversation.resolved"
        : "conversation.reopened",
    userId: actorUserId,
    businessId,
    metadata: { conversationId: conversation.id },
  });

  return updated;
}
