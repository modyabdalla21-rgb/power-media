import "server-only";
import { AiError, type AiProvider, type GenerateParams, type GenerateResult } from "../types";

const BASE = (process.env.GEMINI_API_BASE_URL ?? "https://generativelanguage.googleapis.com/v1beta").replace(/\/$/, "");

type GeminiResponse = {
  candidates?: { content?: { parts?: { text?: string; thought?: boolean }[] }; finishReason?: string }[];
  promptFeedback?: { blockReason?: string };
  usageMetadata?: { promptTokenCount?: number; candidatesTokenCount?: number };
  error?: { code?: number; status?: string; message?: string; details?: { "@type"?: string; retryDelay?: string; violations?: { quotaId?: string }[] }[] };
};

const parseDelay = (d?: string) => (d && /^\d+(\.\d+)?s$/.test(d) ? Math.ceil(parseFloat(d)) : undefined);

/**
 * Thinking control. Flash models "think" before answering, which adds
 * seconds of latency. Gemini 2.5-style models accept `thinkingBudget: 0`
 * (off); Gemini 3.x models use `thinkingLevel` and reject the budget form
 * (the two can't be mixed). We try them in order and remember what each
 * model accepted for the lifetime of the warm server instance.
 */
type ThinkingMode = "off" | "low" | "default";
const THINKING_ORDER: ThinkingMode[] = ["off", "low", "default"];
const thinkingConfig = (mode: ThinkingMode) =>
  mode === "off" ? { thinkingBudget: 0 } : mode === "low" ? { thinkingLevel: "low" } : undefined;
const acceptedThinking = new Map<string, ThinkingMode>();
const isThinkingRejection = (e: unknown) =>
  e instanceof AiError && e.code === "badRequest" && /thinking|budget/i.test(e.detail);

/**
 * Google Gemini (AI Studio) via REST. The key is sent in the
 * `x-goog-api-key` header and treated as an opaque string — both the
 * classic `AIza…` and the newer `AQ.…` key formats work.
 */
export function createGeminiProvider(apiKey: string, models: string[]): AiProvider {
  return {
    id: "gemini",
    models,
    async generate(model: string, p: GenerateParams): Promise<GenerateResult> {
      let mode = acceptedThinking.get(model) ?? THINKING_ORDER[0];
      for (;;) {
        try {
          const result = await call(model, p, mode);
          acceptedThinking.set(model, mode);
          return result;
        } catch (err) {
          const next = THINKING_ORDER[THINKING_ORDER.indexOf(mode) + 1];
          if (!next || !isThinkingRejection(err)) throw err;
          console.warn(`[ai] gemini/${model} rejected thinking mode "${mode}", retrying with "${next}"`);
          mode = next;
        }
      }
    },
  };

  async function call(model: string, p: GenerateParams, mode: ThinkingMode): Promise<GenerateResult> {
    let res: Response;
    try {
      res = await fetch(`${BASE}/models/${encodeURIComponent(model)}:generateContent`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-goog-api-key": apiKey },
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: p.system }] },
          contents: [{ role: "user", parts: [{ text: p.prompt }] }],
          generationConfig: {
            temperature: p.temperature,
            maxOutputTokens: p.maxOutputTokens,
            ...(thinkingConfig(mode) ? { thinkingConfig: thinkingConfig(mode) } : {}),
          },
        }),
        signal: p.signal,
        cache: "no-store",
      });
    } catch (err) {
      if ((err as Error).name === "TimeoutError" || (err as Error).name === "AbortError") throw new AiError("timeout");
      throw new AiError("unavailable", (err as Error).message);
    }

    const body = (await res.json().catch(() => ({}))) as GeminiResponse;
    if (!res.ok) {
      const status = body.error?.status ?? "";
      const msg = body.error?.message ?? "";
      const detail = `${res.status} ${status} ${msg}`.slice(0, 500);
      const retry = body.error?.details?.find((d) => d.retryDelay)?.retryDelay;
      const perDay = body.error?.details?.some((d) => d.violations?.some((v) => /PerDay/i.test(v.quotaId ?? "")));
      if (res.status === 429) throw new AiError(perDay ? "quota" : "rateLimited", detail, parseDelay(retry));
      if (res.status === 401 || res.status === 403) throw new AiError("auth", detail);
      if (res.status === 404) throw new AiError("modelUnavailable", detail);
      if (res.status === 400 && /API key|API_KEY/i.test(msg)) throw new AiError("auth", detail);
      if (res.status === 400) throw new AiError("badRequest", detail);
      if (res.status >= 500) throw new AiError("unavailable", detail);
      throw new AiError("unknown", detail);
    }

    if (body.promptFeedback?.blockReason) throw new AiError("blocked", body.promptFeedback.blockReason);
    const candidate = body.candidates?.[0];
    const text = (candidate?.content?.parts ?? []).filter((x) => !x.thought).map((x) => x.text ?? "").join("").trim();
    const finish = candidate?.finishReason ?? "";
    if (!text) {
      if (/SAFETY|BLOCKLIST|PROHIBITED|RECITATION|SPII/.test(finish)) throw new AiError("blocked", finish);
      throw new AiError("unknown", `empty response (${finish || "no candidates"})`);
    }
    return {
      text,
      provider: "gemini",
      model,
      tokensIn: body.usageMetadata?.promptTokenCount,
      tokensOut: body.usageMetadata?.candidatesTokenCount,
      truncated: finish === "MAX_TOKENS",
    };
  }
}
