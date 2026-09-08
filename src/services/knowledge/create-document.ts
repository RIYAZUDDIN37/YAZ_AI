import { db } from "@/server/db/client";
import { ForbiddenError } from "@/lib/errors";
import { can } from "@/server/authorization/permissions";
import type { OrgRole } from "@prisma/client";
import { writeAuditLog } from "@/services/audit/log";
import { chunkText } from "@/services/knowledge/chunk-text";
import type { CreateKnowledgeDocumentInput } from "@/lib/validation/knowledge";

/**
 * Chunking happens synchronously here (no async processing pipeline
 * exists yet — see the model comment in schema.prisma), so the document
 * goes straight to READY or ERROR, never left sitting at PROCESSING.
 */
export async function createKnowledgeDocument(
  businessId: string,
  actorRole: OrgRole,
  input: CreateKnowledgeDocumentInput,
) {
  if (!can(actorRole, "business:manage")) {
    throw new ForbiddenError("You don't have access to train the AI employee.");
  }

  const chunks = chunkText(input.content);

  const document = await db.knowledgeDocument.create({
    data: {
      businessId,
      title: input.title,
      content: input.content,
      status: chunks.length > 0 ? "READY" : "ERROR",
      errorMessage: chunks.length > 0 ? null : "Nothing to index — the document produced no chunks.",
      chunks: {
        create: chunks.map((content, chunkIndex) => ({
          businessId,
          chunkIndex,
          content,
        })),
      },
    },
  });

  await writeAuditLog({
    action: "knowledge.document_added",
    businessId,
    metadata: { documentId: document.id, title: document.title, chunkCount: chunks.length },
  });

  return document;
}
