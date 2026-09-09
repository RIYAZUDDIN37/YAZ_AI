import { describe, expect, it } from "vitest";
import { chunkText } from "@/services/knowledge/chunk-text";

describe("chunkText", () => {
  it("keeps a short document as a single chunk", () => {
    const chunks = chunkText("Store hours are 10am to 8pm, Monday through Saturday.");
    expect(chunks).toHaveLength(1);
    expect(chunks[0]).toContain("10am to 8pm");
  });

  it("groups paragraphs together until the size limit", () => {
    const paragraphs = ["Paragraph one.", "Paragraph two.", "Paragraph three."];
    const chunks = chunkText(paragraphs.join("\n\n"), 100);
    expect(chunks.length).toBeGreaterThanOrEqual(1);
    expect(chunks.join(" ")).toContain("Paragraph one.");
    expect(chunks.join(" ")).toContain("Paragraph three.");
  });

  it("splits a paragraph longer than the limit on its own", () => {
    const longParagraph = "word ".repeat(50);
    const chunks = chunkText(longParagraph, 40);
    expect(chunks.length).toBeGreaterThan(1);
    for (const chunk of chunks) {
      expect(chunk.length).toBeLessThanOrEqual(40);
    }
  });

  it("returns no chunks for empty/whitespace-only input", () => {
    expect(chunkText("   \n\n  ")).toEqual([]);
  });

  it("never produces an empty chunk", () => {
    const chunks = chunkText("A\n\n\n\nB\n\n\n\nC", 5);
    expect(chunks.every((chunk) => chunk.trim().length > 0)).toBe(true);
  });
});
