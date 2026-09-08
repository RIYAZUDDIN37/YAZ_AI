import { db } from "@/server/db/client";

/**
 * Knowledge retrieval (spec section 9 / Phase 9's RAG pipeline), as
 * actually built: lexical (keyword-overlap) scoring over real
 * KnowledgeChunk rows, scoped to a business. Genuinely real retrieval —
 * every chunk it returns is a real row, sourced and attributed — but
 * honestly not semantic/embeddings-based search. There's no
 * EmbeddingService and no API key configured for one on this machine;
 * see docs/AI-ARCHITECTURE.md. Swapping in real embeddings later only
 * needs to replace scoreOverlap() below, not the callers.
 */
export interface RetrievedChunk {
  documentId: string;
  documentTitle: string;
  chunkId: string;
  content: string;
  score: number;
}

const STOPWORDS = new Set([
  "the", "a", "an", "is", "are", "was", "were", "do", "does", "did",
  "of", "to", "in", "on", "for", "and", "or", "with", "at", "by",
  "this", "that", "it", "you", "your", "i", "we", "my", "me", "can",
  "will", "have", "has", "be", "please", "hi", "hello", "hey", "want",
  "would", "like", "about",
]);

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((word) => word.length > 2 && !STOPWORDS.has(word));
}

function scoreOverlap(queryTerms: string[], chunkTerms: string[]): number {
  const chunkCounts = new Map<string, number>();
  for (const term of chunkTerms) {
    chunkCounts.set(term, (chunkCounts.get(term) ?? 0) + 1);
  }
  let score = 0;
  for (const term of new Set(queryTerms)) {
    score += chunkCounts.get(term) ?? 0;
  }
  return score;
}

export async function retrieveKnowledge(
  businessId: string,
  query: string,
  limit = 3,
): Promise<RetrievedChunk[]> {
  const queryTerms = tokenize(query);
  if (queryTerms.length === 0) return [];

  const chunks = await db.knowledgeChunk.findMany({
    where: { businessId, document: { status: "READY" } },
    include: { document: { select: { title: true } } },
  });

  return chunks
    .map((chunk) => ({
      documentId: chunk.documentId,
      documentTitle: chunk.document.title,
      chunkId: chunk.id,
      content: chunk.content,
      score: scoreOverlap(queryTerms, tokenize(chunk.content)),
    }))
    .filter((result) => result.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
}
