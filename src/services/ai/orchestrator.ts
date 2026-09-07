import type { Prisma } from "@prisma/client";
import { db } from "@/server/db/client";
import { getAIProvider } from "@/services/ai/provider";
import { TOOL_REGISTRY } from "@/services/ai/tools/registry";
import type { OrchestratorMessage } from "@/services/ai/types";
import { writeAuditLog } from "@/services/audit/log";

/**
 * The pipeline from docs/AI-ARCHITECTURE.md, condensed into one function:
 *
 *   customer message -> conversation + business context -> AIProvider
 *   (which itself does the intent/tool/response loop) -> post the reply
 *   -> log an AgentExecution (+ one AgentAction per tool call)
 *
 * Knowledge retrieval isn't wired in yet (Phase 9 — no KnowledgeChunk
 * table exists), so "understanding" today comes from conversation
 * history + business/industry context + the tool results themselves, not
 * a business's uploaded documents. Business-configurable rules
 * (AgentRule, Phase 10's "Train your AI employee") don't exist yet
 * either — the one governance rule enforced right now (escalate instead
 * of guessing) is hardcoded into the system prompt below, not yet
 * per-business configurable. Both are called out here rather than
 * pretended away.
 *
 * Called whenever a CUSTOMER message lands on a conversation that's
 * AI_HANDLING — see src/services/conversations/handle-customer-message.ts.
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

  const systemPrompt = buildSystemPrompt(business.name, business.industry, agent.name, agent.title);

  const trace: Prisma.InputJsonValue[] = [
    { step: "intent", detail: "Reading the customer's message in conversation context." },
  ];

  try {
    const result = await getAIProvider().runTurn({
      systemPrompt,
      messages: orchestratorMessages,
      tools: TOOL_REGISTRY,
      toolContext: { businessId, conversationId },
    });

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

function buildSystemPrompt(
  businessName: string,
  industry: string,
  agentName: string,
  agentTitle: string,
): string {
  return [
    `You are ${agentName}, the ${agentTitle} at ${businessName}, a ${industry.toLowerCase()} business.`,
    "Help the customer by answering questions and taking real actions through the tools available to you.",
    "",
    "Rules:",
    "- Never invent product details, prices, or stock levels — always use a tool to check them.",
    "- If the customer asks for something outside your authority (a discount you have no tool for, a complaint, wanting to speak to a person, anything you're unsure about), call escalateToHuman instead of guessing.",
    "- Keep replies concise and friendly.",
  ].join("\n");
}
