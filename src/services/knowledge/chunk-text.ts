/**
 * Splits raw document text into chunks a retrieval query can match
 * against individually. Paragraph-aware (keeps related sentences
 * together up to the size limit) with a hard fallback split for any
 * single paragraph that's still too long on its own.
 *
 * No embeddings here — see src/services/knowledge/retrieve.ts for why.
 */
const MAX_CHUNK_CHARS = 800;

export function chunkText(text: string, maxChunkChars = MAX_CHUNK_CHARS): string[] {
  const paragraphs = text
    .split(/\n{2,}/)
    .map((p) => p.trim())
    .filter(Boolean);

  const chunks: string[] = [];
  let current = "";

  const flush = () => {
    if (current.trim()) {
      chunks.push(current.trim());
    }
    current = "";
  };

  for (const paragraph of paragraphs) {
    const candidate = current ? `${current}\n\n${paragraph}` : paragraph;

    if (candidate.length > maxChunkChars && current) {
      flush();
      current = paragraph;
    } else {
      current = candidate;
    }

    // A single paragraph longer than the limit on its own — hard-split it.
    while (current.length > maxChunkChars) {
      chunks.push(current.slice(0, maxChunkChars).trim());
      current = current.slice(maxChunkChars).trim();
    }
  }
  flush();

  return chunks;
}
