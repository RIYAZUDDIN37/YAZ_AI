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

// Industry-agnostic on purpose — the same mock provider serves every
// industry (see src/config/industries.ts), so this can't only speak
// furniture-showroom language. Restaurant reservations, salon/dental
// appointments, and showroom visits all land here.
//
// Pattern-based, not an exact-phrase list: real people don't reliably
// type articles ("book table" and "reserve table" are just as common
// as "book a table") — a fixed phrase list is a losing battle against
// that, one missed variant at a time. This checks for a booking VERB
// near a booking NOUN, in either order, rather than one exact string.
const BOOKING_VERB = /\b(book|reserve|schedule)\w*\b/i;
const BOOKING_NOUN = /\b(table|reservation|appointment|visit|slot)s?\b/i;

function isBookingRequest(text: string): boolean {
  return BOOKING_VERB.test(text) && BOOKING_NOUN.test(text);
}

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

/**
 * Extracts a time-of-day from free text ("7pm", "7:30 PM", "noon",
 * "this evening") and returns the Date it resolves to (today if
 * "today"/"tonight" is mentioned and the time hasn't passed yet,
 * tomorrow otherwise). Returns null when no time-like phrase is found
 * — the caller then asks for one instead of guessing.
 */
function extractTime(text: string): Date | null {
  let hour: number | undefined;
  let minute = 0;

  const clockMatch = text.match(/\b(\d{1,2})(?::(\d{2}))?\s*(am|pm)\b/i);
  if (clockMatch) {
    hour = parseInt(clockMatch[1], 10) % 12;
    minute = clockMatch[2] ? parseInt(clockMatch[2], 10) : 0;
    if (clockMatch[3].toLowerCase() === "pm") hour += 12;
  } else if (/\bnoon\b/.test(text)) {
    hour = 12;
  } else if (/\bmidnight\b/.test(text)) {
    hour = 0;
  } else if (/\bmorning\b/.test(text)) {
    hour = 10;
  } else if (/\bafternoon\b/.test(text)) {
    hour = 14;
  } else if (/\b(evening|tonight)\b/.test(text)) {
    hour = 19;
  }
  if (hour === undefined) return null;

  const scheduledAt = new Date();
  const mentionsToday = /\b(today|tonight)\b/.test(text);
  const alreadyPassedToday = mentionsToday && scheduledAt.getHours() > hour;
  if (!mentionsToday || alreadyPassedToday) {
    scheduledAt.setDate(scheduledAt.getDate() + 1);
  }
  scheduledAt.setHours(hour, minute, 0, 0);
  return scheduledAt;
}

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

async function bookAppointment(
  scheduledAt: Date,
  purpose: string,
  toolContext: Parameters<typeof executeTool>[2],
  toolCalls: ToolCallRecord[],
) {
  const bookingRecord = await executeTool(
    "createAppointment",
    { purpose, scheduledAt: scheduledAt.toISOString() },
    toolContext,
  );
  toolCalls.push(bookingRecord);

  const output = bookingRecord.output as { error?: string } | undefined;

  if (bookingRecord.status === "SUCCESS" && !output?.error) {
    const dateLabel = scheduledAt.toLocaleString("en-IN", {
      weekday: "long",
      hour: "numeric",
      minute: "2-digit",
    });
    return {
      replyText: `You're booked for ${dateLabel}. We'll see you then!`,
      toolCalls,
      escalated: false,
      stopReason: "end_turn" as const,
    };
  }

  // Surface what the tool actually said instead of one hardcoded
  // message for every failure reason — a slot conflict and a missing
  // customer need genuinely different replies, not the same one.
  const replyText = output?.error?.includes("already booked")
    ? "That time's already taken — could you try a different one? We also have 12:00 PM, 2:00 PM, 7:00 PM, and 8:30 PM."
    : "I'd love to set that up, but I don't have your contact details linked to this conversation yet — a team member will follow up to confirm.";

  return {
    replyText,
    toolCalls,
    escalated: false,
    stopReason: "end_turn" as const,
  };
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

    if (isBookingRequest(text)) {
      const requestedTime = extractTime(text);
      if (!requestedTime) {
        // Honest simplification: rather than silently guessing a slot
        // (the old behavior), ask — real concrete options, not a fake
        // open-ended "what time works?" that implies more flexibility
        // than a keyword-matching provider can actually handle.
        return {
          replyText:
            "What time would work for you? We have slots at 12:00 PM, 2:00 PM, 7:00 PM, and 8:30 PM.",
          toolCalls,
          escalated: false,
          stopReason: "end_turn",
        };
      }
      return bookAppointment(requestedTime, originalText, toolContext, toolCalls);
    }

    // No booking keyword this turn, but the message is basically just a
    // time ("7pm", "how about 2:30") — the natural reply to the question
    // above. Mock has no real memory of the prior turn, so this
    // recognizes the pattern instead: a bare time mention with no
    // product keyword of its own is treated as answering it.
    const bareTime = extractTime(text);
    if (bareTime && !PRODUCT_KEYWORDS.some((keyword) => text.includes(keyword))) {
      return bookAppointment(bareTime, originalText, toolContext, toolCalls);
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
