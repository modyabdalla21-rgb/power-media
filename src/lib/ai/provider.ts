import "server-only";
import { serverEnv } from "@/lib/env.server";
import { createAnthropicProvider } from "./providers/anthropic";
import { createGeminiProvider } from "./providers/gemini";
import { AiError, type AiErrorCode, type AiProvider, type GenerateParams, type GenerateResult, type ProviderId } from "./types";

const unique = (xs: (string | undefined)[]) => [...new Set(xs.filter((x): x is string => !!x && !!x.trim()).map((x) => x.trim()))];

/**
 * Configured providers in priority order. AI_PROVIDER (optional) picks the
 * primary; otherwise Gemini is preferred, then Anthropic.
 */
export function getProviders(): AiProvider[] {
  const all: AiProvider[] = [];
  if (serverEnv.geminiApiKey) {
    // Stable GA flash first (fast, reliable), then the auto-updating alias,
    // then the lighter models, which stay responsive when flash is
    // overloaded. Missing/retired models fail fast (404) and are pushed
    // back for a while after that.
    all.push(
      createGeminiProvider(
        serverEnv.geminiApiKey,
        unique([serverEnv.geminiModel, "gemini-2.5-flash", "gemini-flash-latest", "gemini-2.5-flash-lite", "gemini-flash-lite-latest"]),
      ),
    );
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
/** Time always kept in reserve for later (faster) fallback models. */
const FALLBACK_RESERVE_MS = 15_000;
/** Below this, an attempt is pointless — stop and report. */
const MIN_ATTEMPT_MS = 4_000;
/** A 503 that came back within this time is "fast" and gets one quick retry on the same model. */
const FAST_FAILURE_MS = 5_000;
/** Short, jittered pause before that single retry. */
const UNAVAILABLE_RETRY_DELAY_MS = 250;
const RETRY_JITTER_MS = 200;

/**
 * Per-instance memory of failing models: missing models (404) are tried
 * last for 30 minutes, overloaded/slow ones (503, timeout) for 60 seconds.
 * They are only moved to the back of the queue, never removed.
 */
const cooldowns = new Map<string, number>();
const COOLDOWN_MS: Partial<Record<AiErrorCode, number>> = {
  modelUnavailable: 30 * 60_000,
  unavailable: 60_000,
  timeout: 60_000,
  rateLimited: 60_000,
  quota: 5 * 60_000,
};
const inCooldown = (key: string) => (cooldowns.get(key) ?? 0) > Date.now();

/**
 * Which failure to report when every attempt failed: the most actionable
 * first. An outage (503) outranks a model-specific 400, so users see
 * "temporarily unavailable" rather than "change your brief".
 */
const ERROR_RANK: AiErrorCode[] = ["auth", "quota", "rateLimited", "unavailable", "timeout", "modelUnavailable", "badRequest", "unknown"];
const worse = (a: AiError, b: AiError) => (ERROR_RANK.indexOf(a.code) <= ERROR_RANK.indexOf(b.code) ? a : b);

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/**
 * Try each provider/model in order. Each attempt gets its own abort
 * timeout; attempts with fallbacks after them keep FALLBACK_RESERVE_MS in
 * reserve. A fast 503 gets at most ONE quick retry (~0.25–0.45s pause) on
 * the same model — skipped when that model was already overloaded for
 * another request moments ago — then we move straight to the next model.
 * Stops early only on safety blocks; a bad key skips the rest of that provider.
 */
export async function generateText(params: Omit<GenerateParams, "signal">, deadlineMs = GENERATION_DEADLINE_MS): Promise<GenerateResult> {
  const ordered = getProviders().flatMap((provider) => provider.models.map((model) => ({ provider, model, key: `${provider.id}/${model}` })));
  if (!ordered.length) throw new AiError("notConfigured");
  // Healthy models first; recently failing ones last (stable order otherwise).
  const attempts = [...ordered.filter((a) => !inCooldown(a.key)), ...ordered.filter((a) => inCooldown(a.key))];

  const deadline = Date.now() + deadlineMs;
  let reported: AiError | null = null;
  let skipProvider: string | null = null;

  for (const [i, { provider, model, key }] of attempts.entries()) {
    if (provider.id === skipProvider) continue;
    const hasFallback = attempts.slice(i + 1).some((a) => a.provider.id !== skipProvider);
    // Already known to be overloaded (another request just got a 503): no same-model retry.
    const wasCooling = inCooldown(key);

    for (let retry = 0; retry < 2; retry++) {
      const remaining = deadline - Date.now();
      if (remaining < MIN_ATTEMPT_MS) throw finalError(reported ?? new AiError("timeout"));
      // The retry gets a full budget: capping it would time out long outputs and waste the wait.
      const budget = hasFallback ? Math.max(MIN_ATTEMPT_MS, remaining - FALLBACK_RESERVE_MS) : remaining;

      const started = Date.now();
      try {
        const result = await provider.generate(model, { ...params, signal: AbortSignal.timeout(budget) });
        cooldowns.delete(key);
        return result;
      } catch (err) {
        const e = err instanceof AiError ? err : new AiError("unknown", String(err));
        const took = ((Date.now() - started) / 1000).toFixed(1);
        console.error(`[ai] ${key} failed in ${took}s (budget ${Math.round(budget / 1000)}s${retry ? ", retry" : ""}): ${e.code} ${e.detail}`);
        reported = reported ? worse(reported, e) : e;

        if (e.code === "blocked") throw e; // safety decision — same for every model
        if (e.code === "auth") {
          skipProvider = provider.id; // a bad key fails for every model of this provider
          break;
        }
        const cooldown = COOLDOWN_MS[e.code];
        if (cooldown) cooldowns.set(key, Date.now() + cooldown);

        // At most one quick retry for a fast 503, then move on to the next model.
        const quick503 = e.code === "unavailable" && retry === 0 && !wasCooling && Date.now() - started < FAST_FAILURE_MS;
        if (quick503 && deadline - Date.now() > MIN_ATTEMPT_MS + FAST_FAILURE_MS) {
          await sleep(UNAVAILABLE_RETRY_DELAY_MS + Math.random() * RETRY_JITTER_MS);
          continue;
        }
        break;
      }
    }
  }
  throw finalError(reported ?? new AiError("unknown"));
}

/** Add a sensible retry hint for temporary outages. */
function finalError(e: AiError) {
  if ((e.code === "unavailable" || e.code === "timeout") && !e.retryAfterSec) e.retryAfterSec = 30;
  return e;
}
