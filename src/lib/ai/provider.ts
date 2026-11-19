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

/** Overall budget for a generation; the API route's maxDuration is 60s. */
export const GENERATION_DEADLINE_MS = 52_000;
/** Time always kept in reserve for the next (faster) fallback model. */
const FALLBACK_RESERVE_MS = 15_000;
/** Below this, an attempt is pointless — report a timeout instead. */
const MIN_ATTEMPT_MS = 4_000;

/**
 * Try each provider/model in order (for Gemini: the configured model, then
 * gemini-flash-latest, then gemini-flash-lite-latest). Falls through on
 * retryable failures — rate limits, quota, missing models, outages and
 * per-attempt timeouts — and stops on auth/blocked/bad requests.
 *
 * Each attempt gets its own abort timeout. Attempts that have a fallback
 * after them leave FALLBACK_RESERVE_MS unused, so a slow primary model
 * can't consume the whole budget and starve the lite fallback.
 */
export async function generateText(params: Omit<GenerateParams, "signal">, deadlineMs = GENERATION_DEADLINE_MS): Promise<GenerateResult> {
  const attempts = getProviders().flatMap((provider) => provider.models.map((model) => ({ provider, model })));
  if (!attempts.length) throw new AiError("notConfigured");

  const deadline = Date.now() + deadlineMs;
  let last: AiError | null = null;
  let skipProvider: string | null = null;

  for (const [i, { provider, model }] of attempts.entries()) {
    if (provider.id === skipProvider) continue;
    const remaining = deadline - Date.now();
    if (remaining < MIN_ATTEMPT_MS) throw last?.code === "timeout" || !last ? new AiError("timeout") : last;
    const hasFallback = i < attempts.length - 1;
    const budget = hasFallback ? Math.max(MIN_ATTEMPT_MS, remaining - FALLBACK_RESERVE_MS) : remaining;

    try {
      return await provider.generate(model, { ...params, signal: AbortSignal.timeout(budget) });
    } catch (err) {
      const e = err instanceof AiError ? err : new AiError("unknown", String(err));
      console.error(`[ai] ${provider.id}/${model} failed after ≤${Math.round(budget / 1000)}s budget: ${e.code} ${e.detail}`);
      // Keep the most actionable error (auth/quota beyond generic outages).
      if (!last || ["modelUnavailable", "unavailable", "timeout"].includes(last.code)) last = e;
      if (!e.retryable) {
        if (e.code === "auth") {
          skipProvider = provider.id; // a bad key fails for every model of this provider
          continue;
        }
        throw e;
      }
    }
  }
  throw last ?? new AiError("unknown");
}
