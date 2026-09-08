import { z } from "zod";

export const createKnowledgeDocumentSchema = z.object({
  title: z.string().trim().min(1, "Give it a title").max(200),
  content: z.string().trim().min(1, "Paste some content").max(20000),
});
export type CreateKnowledgeDocumentInput = z.infer<typeof createKnowledgeDocumentSchema>;

export const deleteKnowledgeDocumentSchema = z.object({
  documentId: z.string().min(1),
});
export type DeleteKnowledgeDocumentInput = z.infer<typeof deleteKnowledgeDocumentSchema>;
