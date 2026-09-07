import type { AgentTool, ToolCallRecord, ToolContext } from "@/services/ai/types";
import { searchProductsTool } from "./search-products";
import { checkInventoryTool } from "./check-inventory";
import { createLeadTool } from "./create-lead";
import { escalateToHumanTool } from "./escalate-to-human";

/**
 * The fixed set of actions the AI may take (spec section 9). The AI never
 * gets a database handle — this registry, plus Zod re-validation of every
 * input and a logged record of every call, is the entire surface it can
 * act through. Adding a tool means adding it here; nothing else in the
 * orchestrator needs to change.
 */
export const TOOL_REGISTRY: AgentTool[] = [
  searchProductsTool,
  checkInventoryTool,
  createLeadTool,
  escalateToHumanTool,
] as AgentTool[];

export function getTool(name: string): AgentTool | undefined {
  return TOOL_REGISTRY.find((tool) => tool.name === name);
}

/**
 * Validates the model's raw tool input against the tool's Zod schema,
 * then executes it. Never lets a malformed or adversarial tool call
 * reach the database — errors come back as a structured result the model
 * (and the activity log) can see, not a thrown exception that kills the
 * whole turn.
 */
export async function executeTool(
  toolName: string,
  rawInput: unknown,
  ctx: ToolContext,
): Promise<ToolCallRecord> {
  const tool = getTool(toolName);
  if (!tool) {
    return {
      name: toolName,
      input: rawInput,
      status: "ERROR",
      errorMessage: `Unknown tool: ${toolName}`,
    };
  }

  const parsed = tool.zodSchema.safeParse(rawInput);
  if (!parsed.success) {
    return {
      name: toolName,
      input: rawInput,
      status: "ERROR",
      errorMessage: `Invalid input: ${parsed.error.issues[0]?.message ?? "validation failed"}`,
    };
  }

  try {
    const output = await tool.execute(parsed.data, ctx);
    return { name: toolName, input: parsed.data, output, status: "SUCCESS" };
  } catch (error) {
    return {
      name: toolName,
      input: parsed.data,
      status: "ERROR",
      errorMessage: error instanceof Error ? error.message : "Tool execution failed",
    };
  }
}
