import type { z } from "zod";

/**
 * Provider-agnostic conversation history the orchestrator hands to
 * whichever AIProvider is active. Built from real Message rows —
 * CUSTOMER -> "user", STAFF/AI -> "assistant" (the model continues in
 * whatever style/context prior turns established, regardless of whether
 * a human or the AI itself wrote them).
 */
export interface OrchestratorMessage {
  role: "user" | "assistant";
  content: string;
}

export interface ToolContext {
  businessId: string;
  conversationId: string;
}

/**
 * One entry in the tool registry. `inputSchema` is a JSON Schema object
 * (what the model sees in the tool definition); `zodSchema` re-validates
 * the model's actual input before `execute` ever touches the database —
 * defense in depth against a malformed or adversarial tool call.
 */
export interface AgentTool<TInput = unknown, TOutput = unknown> {
  name: string;
  description: string;
  inputSchema: Record<string, unknown>;
  zodSchema: z.ZodType<TInput>;
  execute: (input: TInput, ctx: ToolContext) => Promise<TOutput>;
}

export interface ToolCallRecord {
  name: string;
  input: unknown;
  output?: unknown;
  status: "SUCCESS" | "ERROR";
  errorMessage?: string;
}

export interface RunTurnResult {
  /** The AI's customer-facing reply. Null only if the turn ended in a
   * pure escalation with nothing appropriate to say back. */
  replyText: string | null;
  toolCalls: ToolCallRecord[];
  /** Set true when the AI called escalateToHuman during this turn. */
  escalated: boolean;
  stopReason: string;
}

export interface AIProvider {
  readonly name: "mock" | "anthropic";
  runTurn(params: {
    systemPrompt: string;
    messages: OrchestratorMessage[];
    tools: AgentTool[];
    toolContext: ToolContext;
  }): Promise<RunTurnResult>;
}
