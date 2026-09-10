import { env } from "@/lib/env";
import type { AIProvider } from "@/services/ai/types";
import { mockProvider } from "@/services/ai/providers/mock";
import { anthropicProvider } from "@/services/ai/providers/anthropic";
import { ollamaProvider } from "@/services/ai/providers/ollama";

/**
 * The one place in the app that knows which AI vendor is configured.
 * Everything else (the orchestrator, the tools) is written against the
 * AIProvider interface and never imports a provider file directly.
 */
export function getAIProvider(): AIProvider {
  switch (env.AI_PROVIDER) {
    case "anthropic":
      return anthropicProvider;
    case "ollama":
      return ollamaProvider;
    case "mock":
    default:
      return mockProvider;
  }
}
