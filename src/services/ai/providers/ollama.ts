import { env } from "@/lib/env";
import { executeTool } from "@/services/ai/tools/registry";
import type { AIProvider, ToolCallRecord } from "@/services/ai/types";

const MAX_TOOL_ITERATIONS = 6;

/**
 * Local models frequently return numeric/boolean tool arguments as strings
 * (observed with llama3.2: `{"maxPrice": "20000"}` for a `number` field) —
 * a real Zod schema like `z.number()` rejects that outright, so every
 * price-filtered call would fail validation before it ever reached the
 * tool. Coerce against the tool's own declared JSON-schema types rather
 * than guessing from the value's shape, so an intentional string (e.g. a
 * search query that happens to be all digits) is left alone.
 */
function coerceToolArguments(
  args: Record<string, unknown>,
  inputSchema: Record<string, unknown>,
): Record<string, unknown> {
  const properties = (inputSchema.properties ?? {}) as Record<string, { type?: string }>;
  const coerced: Record<string, unknown> = { ...args };

  for (const [key, value] of Object.entries(coerced)) {
    if (typeof value !== "string") continue;
    const declaredType = properties[key]?.type;

    if (declaredType === "number" || declaredType === "integer") {
      const num = Number(value);
      if (Number.isFinite(num)) coerced[key] = num;
    } else if (declaredType === "boolean") {
      if (value === "true") coerced[key] = true;
      else if (value === "false") coerced[key] = false;
    }
  }

  return coerced;
}

interface OllamaToolCall {
  function: {
    name: string;
    arguments: Record<string, unknown>;
  };
}

interface OllamaMessage {
  role: "system" | "user" | "assistant" | "tool";
  content: string;
  tool_name?: string;
}

interface OllamaChatResponse {
  message: {
    role: string;
    content: string;
    tool_calls?: OllamaToolCall[];
  };
  done: boolean;
  done_reason?: string;
}

/**
 * Local, self-hosted provider — talks to an Ollama server (the
 * docker-compose `ollama` service, or one already running on this
 * machine) instead of a paid cloud API. Same manual tool-calling loop
 * shape as the Anthropic provider (see docs/AI-ARCHITECTURE.md and
 * src/services/ai/providers/anthropic.ts) so the orchestrator and tool
 * registry don't need to know which vendor is live.
 *
 * Requires a tool-calling-capable model pulled into the server first:
 *   docker exec ollama ollama pull llama3.2
 * (or whatever OLLAMA_MODEL is set to).
 */
export const ollamaProvider: AIProvider = {
  name: "ollama",

  async runTurn({ systemPrompt, messages, tools, toolContext }) {
    const ollamaTools = tools.map((tool) => ({
      type: "function" as const,
      function: {
        name: tool.name,
        description: tool.description,
        parameters: { type: "object", ...tool.inputSchema },
      },
    }));

    const history: OllamaMessage[] = [
      { role: "system", content: systemPrompt },
      ...messages.map((message) => ({
        role: message.role,
        content: message.content,
      })),
    ];

    const toolCalls: ToolCallRecord[] = [];
    let escalated = false;
    let iterations = 0;

    while (iterations < MAX_TOOL_ITERATIONS) {
      iterations += 1;

      let response: Response;
      try {
        response = await fetch(`${env.OLLAMA_BASE_URL}/api/chat`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            model: env.OLLAMA_MODEL,
            messages: history,
            tools: ollamaTools,
            stream: false,
          }),
        });
      } catch {
        response = new Response(null, { status: 503 });
      }

      if (!response.ok) {
        const record = await executeTool(
          "escalateToHuman",
          {
            reason: `Local AI provider (Ollama) is unreachable or errored (HTTP ${response.status}). Is the container running?`,
          },
          toolContext,
        );
        toolCalls.push(record);
        return {
          replyText:
            "I'm having trouble reaching our AI system right now — let me bring in a team member.",
          toolCalls,
          escalated: true,
          stopReason: "provider_error",
        };
      }

      const data = (await response.json()) as OllamaChatResponse;
      const { message } = data;

      history.push({ role: "assistant", content: message.content ?? "" });

      const requestedCalls = message.tool_calls ?? [];

      if (requestedCalls.length === 0) {
        return {
          replyText: message.content || null,
          toolCalls,
          escalated,
          stopReason: data.done_reason ?? "end_turn",
        };
      }

      for (const call of requestedCalls) {
        const tool = tools.find((candidate) => candidate.name === call.function.name);
        const args = tool
          ? coerceToolArguments(call.function.arguments, tool.inputSchema)
          : call.function.arguments;
        const record = await executeTool(call.function.name, args, toolContext);
        toolCalls.push(record);
        if (call.function.name === "escalateToHuman" && record.status === "SUCCESS") {
          escalated = true;
        }

        history.push({
          role: "tool",
          tool_name: call.function.name,
          content: JSON.stringify(record.output ?? { error: record.errorMessage }),
        });
      }
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
