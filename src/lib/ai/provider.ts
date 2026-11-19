import "server-only";
import { serverEnv } from "@/lib/env.server";
import type { ToolDefinition } from "./tools";

export type GenerateRequest = {
  tool: ToolDefinition;
  inputs: Record<string, string>;
  outputLanguage: "en" | "ar";
};

export type GenerateResult = { text: string };

export interface AiProvider {
  readonly id: "anthropic" | "openai";
  generate(req: GenerateRequest): Promise<GenerateResult>;
}

export class AiNotConfiguredError extends Error {
  code = "AI_NOT_CONFIGURED" as const;
}
export class AiNotImplementedError extends Error {
  code = "AI_NOT_IMPLEMENTED" as const;
}

/** Build the user message from validated inputs (provider-agnostic). */
export function buildUserPrompt({ tool, inputs, outputLanguage }: GenerateRequest): string {
  const lines = tool.fields
    .filter((f) => inputs[f.name])
    .map((f) => `- ${f.label.en}: ${inputs[f.name]}`);
  const lang = outputLanguage === "ar" ? "Arabic (respect the requested dialect if any)" : "English";
  return `Brief:\n${lines.join("\n")}\n\nRespond in ${lang}. Use clear headings and bullet points.`;
}

/**
 * Returns the configured provider, or throws AiNotConfiguredError.
 * Phase 3: implement the adapters (official SDKs, streaming, usage metering).
 */
export function getAiProvider(): AiProvider {
  const { aiProvider, anthropicApiKey, openaiApiKey } = serverEnv;
  const hasKey = aiProvider === "anthropic" ? !!anthropicApiKey : !!openaiApiKey;
  if (!hasKey) throw new AiNotConfiguredError(`No API key configured for provider "${aiProvider}".`);

  return {
    id: aiProvider,
    async generate() {
      throw new AiNotImplementedError(`The ${aiProvider} adapter is scheduled for Phase 3.`);
    },
  };
}
