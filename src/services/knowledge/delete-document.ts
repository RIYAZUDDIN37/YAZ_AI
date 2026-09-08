import { db } from "@/server/db/client";
import { ForbiddenError, NotFoundError } from "@/lib/errors";
import { can } from "@/server/authorization/permissions";
import type { OrgRole } from "@prisma/client";
import { writeAuditLog } from "@/services/audit/log";
import type { DeleteKnowledgeDocumentInput } from "@/lib/validation/knowledge";

export async function deleteKnowledgeDocument(
  businessId: string,
  actorRole: OrgRole,
  input: DeleteKnowledgeDocumentInput,
) {
  if (!can(actorRole, "business:manage")) {
    throw new ForbiddenError("You don't have access to train the AI employee.");
  }

  const document = await db.knowledgeDocument.findFirst({
    where: { id: input.documentId, businessId },
  });
  if (!document) {
    throw new NotFoundError("That document couldn't be found.");
  }

  await db.knowledgeDocument.delete({ where: { id: document.id } });

  await writeAuditLog({
    action: "knowledge.document_removed",
    businessId,
    metadata: { documentId: document.id, title: document.title },
  });
}
