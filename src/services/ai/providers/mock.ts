import { executeTool } from "@/services/ai/tools/registry";
import type { ProductResult } from "@/services/ai/tools/search-products";
import type { InventoryResult } from "@/services/ai/tools/check-inventory";
import type { AIProvider, ToolCallRecord } from "@/services/ai/types";

/**
 * The default development adapter (docs/AI-ARCHITECTURE.md) — deterministic,
 * obviously rule-based "understanding" via keyword matching, so the rest
 * of the pipeline (tool execution, DB writes, activity logging, the
 * escalation path) can be built and demoed with no API key. Every tool
 * call it makes is 100% real — it queries and writes the actual database
 * through the same registry the real Anthropic provider uses. Only the
 * "understanding what the customer means" step is simulated; nothing
 * here fabricates a tool result.
 */
const ESCALATION_KEYWORDS = [
  "speak to a human",
  "speak to someone",
  "talk to a person",
  "manager",
  "refund",
  "furious",
  "angry",
  "unacceptable",
  "terrible service",
  "lawsuit",
  "sue you",
  "worst experience",
  "discount of 20",
  "50% off",
];

const BOOKING_KEYWORDS = [
  "showroom visit",
  "book a visit",
  "book an appointment",
  "schedule a visit",
  "set up a visit",
  "come by the showroom",
  "visit the showroom",
];

const PRODUCT_KEYWORDS = [
  "table",
  "sofa",
  "chair",
  "bed",
  "wardrobe",
  "shelf",
  "shelving",
  "tv unit",
  "furniture",
  "dining",
  "living room",
  "bedroom",
  "storage",
];

const STOCK_KEYWORDS = ["stock", "available", "in stock"];

function extractMaxPrice(text: string): number | undefined {
  const thousandsMatch = text.match(/(\d[\d,]*)\s*k\b/);
  if (thousandsMatch) {
    return parseInt(thousandsMatch[1].replace(/,/g, ""), 10) * 1000;
  }
  const plainMatch = text.match(/(?:under|below|budget of)\s*(?:rs\.?|₹|inr)?\s*(\d[\d,]{3,})/i);
  if (plainMatch) {
    return parseInt(plainMatch[1].replace(/,/g, ""), 10);
  }
  return undefined;
}

export const mockProvider: AIProvider = {
  name: "mock",

  async runTurn({ messages, toolContext, knowledgeContext }) {
    const lastUserMessage = [...messages].reverse().find((m) => m.role === "user");
    const originalText = lastUserMessage?.content ?? "";
    const text = originalText.toLowerCase();
    const toolCalls: ToolCallRecord[] = [];

    if (ESCALATION_KEYWORDS.some((keyword) => text.includes(keyword))) {
      const record = await executeTool(
        "escalateToHuman",
        { reason: `Customer message suggested this needs a human: "${originalText}"` },
        toolContext,
      );
      toolCalls.push(record);
      return {
        replyText:
          "I understand — let me connect you with someone from our team who can help further. They'll be with you shortly.",
        toolCalls,
        escalated: true,
        stopReason: "escalated",
      };
    }

    if (BOOKING_KEYWORDS.some((keyword) => text.includes(keyword))) {
      // Honest simplification: the mock provider can't parse "this
      // Saturday" into a real date the way a real LLM would — it always
      // books the next day at 11:00 local time. A real appointment row
      // still gets written; only the "when" is a fixed default.
      const scheduledAt = new Date();
      scheduledAt.setDate(scheduledAt.getDate() + 1);
      scheduledAt.setHours(11, 0, 0, 0);

      const bookingRecord = await executeTool(
        "createAppointment",
        { purpose: originalText, scheduledAt: scheduledAt.toISOString() },
        toolContext,
      );
      toolCalls.push(bookingRecord);

      if (bookingRecord.status === "SUCCESS" && !("error" in (bookingRecord.output as object))) {
        const dateLabel = scheduledAt.toLocaleString("en-IN", {
          weekday: "long",
          hour: "numeric",
          minute: "2-digit",
        });
        return {
          replyText: `You're booked for ${dateLabel}. We'll see you then!`,
          toolCalls,
          escalated: false,
          stopReason: "end_turn",
        };
      }

      return {
        replyText:
          "I'd love to set that up, but I don't have your contact details linked to this conversation yet — a team member will follow up to confirm.",
        toolCalls,
        escalated: false,
        stopReason: "end_turn",
      };
    }

    const matchedKeyword = PRODUCT_KEYWORDS.find((keyword) => text.includes(keyword));

    if (matchedKeyword) {
      const maxPrice = extractMaxPrice(text);
      const searchRecord = await executeTool(
        "searchProducts",
        { query: matchedKeyword, maxPrice },
        toolContext,
      );
      toolCalls.push(searchRecord);

      const results =
        searchRecord.status === "SUCCESS" ? (searchRecord.output as ProductResult[]) : [];

      if (results.length > 0) {
        const list = results
          .map((product) => `${product.name} (₹${product.price.toLocaleString("en-IN")})`)
          .join(", ");

        let stockNote = "";
        if (STOCK_KEYWORDS.some((keyword) => text.includes(keyword))) {
          const inventoryRecord = await executeTool(
            "checkInventory",
            { productId: results[0].id },
            toolContext,
          );
          toolCalls.push(inventoryRecord);
          if (inventoryRecord.status === "SUCCESS") {
            const inventory = inventoryRecord.output as InventoryResult;
            stockNote = ` We have ${inventory.totalOnHand} unit(s) of ${inventory.productName} in stock right now.`;
          }
        }

        const leadRecord = await executeTool(
          "createLead",
          { intent: originalText, value: results[0].price },
          toolContext,
        );
        toolCalls.push(leadRecord);

        return {
          replyText: `I found ${results.length} match${results.length > 1 ? "es" : ""}: ${list}.${stockNote} Would you like more details, or should I set up a showroom visit?`,
          toolCalls,
          escalated: false,
          stopReason: "end_turn",
        };
      }

      return {
        replyText:
          "I couldn't find an exact match for that in our current catalogue — could you tell me a bit more about what you're looking for, or your budget?",
        toolCalls,
        escalated: false,
        stopReason: "end_turn",
      };
    }

    // No product/escalation keyword matched — this is the one place the
    // mock provider genuinely reads retrieved knowledge (real chunks,
    // real DB rows), since it doesn't parse the system prompt the way a
    // real LLM would. See the AIProvider.runTurn doc comment.
    if (knowledgeContext.length > 0) {
      const top = knowledgeContext[0];
      return {
        replyText: `According to our ${top.documentTitle}: ${top.content}`,
        toolCalls,
        escalated: false,
        stopReason: "end_turn",
      };
    }

    return {
      replyText: "Thanks for reaching out! Could you tell me a bit more about what you're looking for so I can help?",
      toolCalls,
      escalated: false,
      stopReason: "end_turn",
    };
  },
};
