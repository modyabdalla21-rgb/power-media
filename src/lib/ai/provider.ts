import "server-only";
import { serverEnv } from "@/lib/env.server";
import { createAnthropicProvider } from "./providers/anthropic";
import { createGeminiProvider } from "./providers/gemini";
import { AiError, type AiProvider, type GenerateParams, type GenerateResult, type ProviderId } from "./types";

const unique = (xs: (string | undefined)[]) => [...new Set(xs.filter((x): x is string => !!x && !!x.trim()).map((x) => x.trim()))];

/**
 * Configured providers in priority order. AI_PROVIDER (optional) picks the
 * primary; otherwise Gemini is preferred, then Anthropic.
 */
export function getProviders(): AiProvider[] {
  const all: AiProvider[] = [];
  if (serverEnv.geminiApiKey) {
    // Auto-updating aliases keep working as Google rotates model versions.
    all.push(createGeminiProvider(serverEnv.geminiApiKey, unique([serverEnv.geminiModel, "gemini-flash-latest", "gemini-flash-lite-latest"])));
  }
  if (serverEnv.anthropicApiKey) {
    all.push(createAnthropicProvider(serverEnv.anthropicApiKey, unique([serverEnv.anthropicModel, "claude-sonnet-5-5"])));
  }
  const preferred = serverEnv.aiProvider;
  return preferred ? [...all.filter((p) => p.id === preferred), ...all.filter((p) => p.id !== preferred)] : all;
}

export function activeProviderIds(): ProviderId[] {
  return getProviders().map((p) => p.id);
}

/**
 * Try each provider/model in order. Falls through on retryable failures
 * (rate limits, quota, missing model, outages); stops on auth/blocked/bad
 * requests. Total time is bounded by `deadlineMs`.
 */
export async function generateText(params: Omit<GenerateParams, "signal">, deadlineMs = 50_000): Promise<GenerateResult> {
  const providers = getProviders();
  if (!providers.length) throw new AiError("notConfigured");

  const signal = AbortSignal.timeout(deadlineMs);
  let last: AiError | null = null;
  for (const provider of providers) {
    for (const model of provider.models) {
      if (signal.aborted) throw new AiError("timeout");
      try {
        return await provider.generate(model, { ...params, signal });
      } catch (err) {
        const e = err instanceof AiError ? err : new AiError("unknown", String(err));
        console.error(`[ai] ${provider.id}/${model} failed: ${e.code} ${e.detail}`);
        // Prefer reporting the most actionable error (e.g. auth over a later timeout).
        if (!last || last.code === "modelUnavailable" || last.code === "unavailable") last = e;
        if (!e.retryable) {
          if (e.code === "auth") break; // try the next provider, not more models with a bad key
          throw e;
        }
      }
    }
  }
  throw last ?? new AiError("unknown");
}
