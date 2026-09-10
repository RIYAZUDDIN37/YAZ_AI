import type { Prisma } from "@prisma/client";
import { db } from "@/server/db/client";
import { getAIProvider } from "@/services/ai/provider";
import { TOOL_REGISTRY } from "@/services/ai/tools/registry";
import type { OrchestratorMessage, ToolCallRecord } from "@/services/ai/types";
import { retrieveKnowledge, type RetrievedChunk } from "@/services/knowledge/retrieve";
import { writeAuditLog } from "@/services/audit/log";

/**
 * The pipeline from docs/AI-ARCHITECTURE.md, condensed into one function:
 *
 *   customer message -> conversation + business context -> knowledge
 *   retrieval -> AIProvider (intent/tool/response loop) -> post the reply
 *   -> log an AgentExecution (+ one AgentAction per tool call)
 *
 * Knowledge retrieval (Phase 9) is real but lexical, not semantic — see
 * src/services/knowledge/retrieve.ts. Business-configurable AgentRule/
 * AgentGoal (Phase 10's "Train your AI employee") are real, owner-authored
 * rows injected into the system prompt in `order`; the one governance
 * rule enforced with an actual code-level effect either way is still
 * "escalate instead of guessing" (escalateToHuman really sets
 * HUMAN_NEEDED) — everything else here is real, configurable *content*
 * fed to the model, not yet a distinct validation stage. Both gaps are
 * called out here rather than pretended away.
 *
 * Called whenever a CUSTOMER message lands on a conversation that's
 * AI_HANDLING — see src/services/conversations/log-customer-message.ts
 * and src/services/agents/test-simulator.ts (the Test Employee simulator
 * calls this exact function too, not a separate mock).
 */
export async function runAgentTurn(params: {
  businessId: string;
  conversationId: string;
  triggerMessageId: string;
}) {
  const { businessId, conversationId, triggerMessageId } = params;

  const [business, agent, history] = await Promise.all([
    db.business.findUniqueOrThrow({ where: { id: businessId } }),
    db.aIAgent.findFirstOrThrow({
      where: { businessId },
      orderBy: { createdAt: "asc" },
      include: {
        rules: { where: { isActive: true }, orderBy: { order: "asc" } },
        goals: { where: { isActive: true }, orderBy: { order: "asc" } },
      },
    }),
    db.message.findMany({
      where: { conversationId },
      orderBy: { createdAt: "asc" },
    }),
  ]);

  const orchestratorMessages: OrchestratorMessage[] = history
    .filter((message) => message.senderType !== "SYSTEM")
    .map((message) => ({
      role: message.senderType === "CUSTOMER" ? "user" : "assistant",
      content: message.body,
    }));

  const triggerMessage = history.find((message) => message.id === triggerMessageId);
  const knowledgeContext: RetrievedChunk[] = triggerMessage
    ? await retrieveKnowledge(businessId, triggerMessage.body)
    : [];

  const systemPrompt = buildSystemPrompt({
    businessName: business.name,
    industry: business.industry,
    agentName: agent.name,
    agentTitle: agent.title,
    tone: agent.tone,
    customInstructions: agent.customInstructions,
    rules: agent.rules.map((rule) => rule.instruction),
    goals: agent.goals.map((goal) => goal.description),
    knowledgeContext,
  });

  const trace: Prisma.InputJsonValue[] = [
    { step: "intent", detail: "Reading the customer's message in conversation context." },
    {
      step: "context",
      detail: `Built system prompt with ${agent.rules.length} active rule(s), ${agent.goals.length} active goal(s), ${knowledgeContext.length} knowledge chunk(s).`,
      rulesApplied: agent.rules.map((rule) => rule.instruction),
      goalsApplied: agent.goals.map((goal) => goal.description),
      knowledgeUsed: knowledgeContext.map((chunk) => ({
        documentTitle: chunk.documentTitle,
        score: chunk.score,
      })),
    },
  ];

  try {
    const result = await getAIProvider().runTurn({
      systemPrompt,
      messages: orchestratorMessages,
      tools: TOOL_REGISTRY,
      toolContext: { businessId, conversationId },
      knowledgeContext,
    });

    // Governance enforced in code, not just prompted (see this file's own
    // header comment): a system-prompt instruction not to invent products
    // is a request, not a guarantee — smaller/weaker models have been
    // observed ignoring it outright and fabricating a full fake product
    // line after a genuinely empty search result. If the last catalogue
    // search this turn found nothing, the reply the customer sees is
    // forced to an honest fallback no matter what text the model
    // generated — this doesn't depend on any model behaving correctly.
    if (!result.escalated && hasEmptyCatalogResult(result.toolCalls)) {
      result.replyText =
        "I couldn't find an exact match for that in our current catalogue — could you tell me a bit more about what you're looking for, or your budget?";
    }

    for (const call of result.toolCalls) {
      trace.push({
        step: "tool_call",
        tool: call.name,
        input: call.input as Prisma.InputJsonValue,
        status: call.status,
        ...(call.status === "ERROR"
          ? { error: call.errorMessage ?? null }
          : { output: (call.output ?? null) as Prisma.InputJsonValue }),
      });
    }

    let replyMessageId: string | undefined;
    if (result.replyText) {
      const replyMessage = await db.message.create({
        data: {
          conversationId,
          senderType: "AI",
          body: result.replyText,
        },
      });
      replyMessageId = replyMessage.id;
      await db.conversation.update({
        where: { id: conversationId },
        data: { lastMessageAt: new Date() },
      });
      trace.push({ step: "response", detail: "Reply sent to customer." });
    }

    if (result.escalated) {
      trace.push({ step: "escalation", detail: "Handed to a human team member." });
    }

    const toolNames = result.toolCalls.map((call) => call.name);
    const summary = result.escalated
      ? `Escalated to a human${toolNames.length ? ` (used: ${toolNames.join(", ")})` : ""}.`
      : toolNames.length > 0
        ? `Used ${toolNames.join(", ")}, then replied.`
        : "Replied without needing a tool.";

    await db.agentExecution.create({
      data: {
        businessId,
        conversationId,
        agentId: agent.id,
        triggerMessageId,
        replyMessageId,
        status: result.escalated ? "ESCALATED" : "SUCCESS",
        summary,
        trace,
        actions: {
          create: result.toolCalls.map((call) => ({
            toolName: call.name,
            input: call.input as Prisma.InputJsonValue,
            output:
              call.output === undefined
                ? undefined
                : (call.output as Prisma.InputJsonValue),
            status: call.status,
            errorMessage: call.errorMessage,
          })),
        },
      },
    });

    return result;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";

    // A provider failure is itself a reason a human needs to look —
    // never leave the customer without a response path.
    await db.conversation.update({
      where: { id: conversationId },
      data: { status: "HUMAN_NEEDED" },
    });

    await db.agentExecution.create({
      data: {
        businessId,
        conversationId,
        agentId: agent.id,
        triggerMessageId,
        status: "ERROR",
        summary: "The AI provider failed — escalated to a human.",
        trace: [...trace, { step: "error", detail: errorMessage }] as Prisma.InputJsonValue[],
        errorMessage,
      },
    });

    await writeAuditLog({
      action: "agent.execution_failed",
      businessId,
      metadata: { conversationId, error: errorMessage },
    });

    throw error;
  }
}

/** Tool names that return a catalogue listing — if the last one of these
 * called this turn found nothing, there is nothing real to have replied
 * about. */
const CATALOG_SEARCH_TOOLS = new Set(["searchProducts"]);

// Exported for direct unit testing — pure logic, no reason to only be
// exercisable through a slow, flaky live LLM call.
export function hasEmptyCatalogResult(toolCalls: ToolCallRecord[]): boolean {
  const catalogCalls = toolCalls.filter((call) => CATALOG_SEARCH_TOOLS.has(call.name));
  if (catalogCalls.length === 0) return false;
  const last = catalogCalls[catalogCalls.length - 1];
  // No real catalogue data either way: a genuine zero-match search, or the
  // call itself failed (e.g. a local model passing a malformed argument
  // that fails Zod validation) — in both cases there's nothing real for a
  // reply to have been based on.
  if (last.status === "ERROR") return true;
  return Array.isArray(last.output) && last.output.length === 0;
}

function buildSystemPrompt(params: {
  businessName: string;
  industry: string;
  agentName: string;
  agentTitle: string;
  tone: string | null;
  customInstructions: string | null;
  rules: string[];
  goals: string[];
  knowledgeContext: RetrievedChunk[];
}): string {
  const { businessName, industry, agentName, agentTitle, tone, customInstructions, rules, goals, knowledgeContext } =
    params;

  const lines = [
    `You are ${agentName}, the ${agentTitle} at ${businessName}, a ${industry.toLowerCase()} business.`,
    "Help the customer by answering questions and taking real actions through the tools available to you.",
  ];

  if (tone) {
    lines.push(`Tone: ${tone}`);
  }

  lines.push(
    "",
    "Rules:",
    "- Never invent product details, prices, or stock levels — always use a tool to check them.",
    "- If a tool returns no results (an empty list), tell the customer honestly that you couldn't find a match and ask a clarifying question. Do not invent plausible-sounding products, names, or prices to fill the gap — an empty result is a real answer, not a reason to guess.",
    "- If the customer asks for something outside your authority (a discount you have no tool for, a complaint, wanting to speak to a person, anything you're unsure about), call escalateToHuman instead of guessing.",
    "- Keep replies concise and friendly.",
  );
  for (const rule of rules) {
    lines.push(`- ${rule}`);
  }

  if (goals.length > 0) {
    lines.push("", "Your goals:");
    for (const goal of goals) {
      lines.push(`- ${goal}`);
    }
  }

  if (customInstructions) {
    lines.push("", "Additional instructions from the business owner:", customInstructions);
  }

  if (knowledgeContext.length > 0) {
    lines.push("", "Knowledge base excerpts that may be relevant to this message:");
    for (const chunk of knowledgeContext) {
      lines.push(`--- From "${chunk.documentTitle}" ---`, chunk.content);
    }
    lines.push(
      "Use these excerpts when relevant and cite the source document by name (e.g. \"according to your Shipping Policy\"). Don't invent content that isn't in an excerpt.",
    );
  }

  return lines.join("\n");
}
