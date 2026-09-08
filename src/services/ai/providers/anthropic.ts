import Anthropic from "@anthropic-ai/sdk";
import { env } from "@/lib/env";
import { executeTool } from "@/services/ai/tools/registry";
import type { AIProvider, ToolCallRecord } from "@/services/ai/types";

const MAX_TOOL_ITERATIONS = 6;

/**
 * The real provider — a manual tool-calling loop against the Claude
 * Messages API (see docs/AI-ARCHITECTURE.md). Deliberately the manual
 * loop rather than the SDK's beta tool runner: the orchestrator needs to
 * log every tool call and enforce rules between steps (spec section 10),
 * which the manual loop's explicit per-iteration control gives directly.
 *
 * Not live-verified yet — this machine has no ANTHROPIC_API_KEY configured.
 * The mock provider (default, AI_PROVIDER=mock) is what's actually been
 * run. See CLAUDE.md.
 */
export const anthropicProvider: AIProvider = {
  name: "anthropic",

  async runTurn({ systemPrompt, messages, tools, toolContext }) {
    // knowledgeContext isn't a separate param here — the orchestrator
    // already folds retrieved chunks into systemPrompt, which is all a
    // real model needs (unlike the mock provider, which can't parse a
    // prompt). See src/services/ai/types.ts.
    const client = new Anthropic({ apiKey: env.ANTHROPIC_API_KEY });

    const anthropicTools: Anthropic.Tool[] = tools.map((tool) => ({
      name: tool.name,
      description: tool.description,
      input_schema: {
        type: "object",
        ...tool.inputSchema,
      } as Anthropic.Tool.InputSchema,
    }));

    const history: Anthropic.MessageParam[] = messages.map((message) => ({
      role: message.role,
      content: message.content,
    }));

    const toolCalls: ToolCallRecord[] = [];
    let escalated = false;
    let iterations = 0;

    while (iterations < MAX_TOOL_ITERATIONS) {
      iterations += 1;

      const response = await client.messages.create({
        model: env.AI_CHAT_MODEL,
        max_tokens: 4096,
        system: systemPrompt,
        tools: anthropicTools,
        messages: history,
        output_config: { effort: "low" },
      });

      if (response.stop_reason === "refusal") {
        // Treat a policy decline the same as a self-escalation — never
        // show the customer a raw refusal.
        const record = await executeTool(
          "escalateToHuman",
          { reason: "The AI declined to respond to this message." },
          toolContext,
        );
        toolCalls.push(record);
        return {
          replyText:
            "I'm not able to help with that directly — let me bring in a member of our team.",
          toolCalls,
          escalated: true,
          stopReason: "refusal",
        };
      }

      history.push({ role: "assistant", content: response.content });

      if (response.stop_reason === "pause_turn") {
        continue;
      }

      const toolUseBlocks = response.content.filter(
        (block): block is Anthropic.ToolUseBlock => block.type === "tool_use",
      );

      if (toolUseBlocks.length === 0 || response.stop_reason === "end_turn") {
        const textBlock = response.content.find(
          (block): block is Anthropic.TextBlock => block.type === "text",
        );
        return {
          replyText: textBlock?.text ?? null,
          toolCalls,
          escalated,
          stopReason: response.stop_reason ?? "end_turn",
        };
      }

      const toolResults: Anthropic.ToolResultBlockParam[] = [];
      for (const toolUse of toolUseBlocks) {
        const record = await executeTool(toolUse.name, toolUse.input, toolContext);
        toolCalls.push(record);
        if (toolUse.name === "escalateToHuman" && record.status === "SUCCESS") {
          escalated = true;
        }

        toolResults.push({
          type: "tool_result",
          tool_use_id: toolUse.id,
          content: JSON.stringify(record.output ?? { error: record.errorMessage }),
          is_error: record.status === "ERROR",
        });
      }

      history.push({ role: "user", content: toolResults });
    }

    if (!escalated) {
      const record = await executeTool(
        "escalateToHuman",
        { reason: "Reached the tool-call iteration limit without a final answer." },
        toolContext,
      );
      toolCalls.push(record);
    }

    return {
      replyText:
        "I've done what I can here — let me hand this over to a team member to finish up.",
      toolCalls,
      escalated: true,
      stopReason: "max_iterations",
    };
  },
};
