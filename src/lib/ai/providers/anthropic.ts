import "server-only";
import { AiError, type AiProvider, type GenerateParams, type GenerateResult } from "../types";

/** Optional Anthropic (Claude) provider via the Messages API. */
export function createAnthropicProvider(apiKey: string, models: string[]): AiProvider {
  return {
    id: "anthropic",
    models,
    async generate(model: string, p: GenerateParams): Promise<GenerateResult> {
      let res: Response;
      try {
        res = await fetch("https://api.anthropic.com/v1/messages", {
          method: "POST",
          headers: { "Content-Type": "application/json", "x-api-key": apiKey, "anthropic-version": "2023-06-01" },
          body: JSON.stringify({
            model,
            max_tokens: p.maxOutputTokens,
            temperature: p.temperature,
            system: p.system,
            messages: [{
              role: "user",
              content: p.images?.length
                ? [...p.images.map((i) => ({ type: "image", source: { type: "base64", media_type: i.mimeType, data: i.data } })), { type: "text", text: p.prompt }]
                : p.prompt,
            }],
          }),
          signal: p.signal,
          cache: "no-store",
        });
      } catch (err) {
        if ((err as Error).name === "TimeoutError" || (err as Error).name === "AbortError") throw new AiError("timeout");
        throw new AiError("unavailable", (err as Error).message);
      }

      const body = (await res.json().catch(() => ({}))) as {
        content?: { type: string; text?: string }[];
        stop_reason?: string;
        usage?: { input_tokens?: number; output_tokens?: number };
        error?: { type?: string; message?: string };
      };
      if (!res.ok) {
        const detail = `${res.status} ${body.error?.type ?? ""} ${body.error?.message ?? ""}`.slice(0, 500);
        const retryAfter = Number(res.headers.get("retry-after")) || undefined;
        if (res.status === 429) throw new AiError("rateLimited", detail, retryAfter);
        if (res.status === 401 || res.status === 403) throw new AiError("auth", detail);
        if (res.status === 402 || /credit|billing/i.test(body.error?.message ?? "")) throw new AiError("quota", detail);
        if (res.status === 404) throw new AiError("modelUnavailable", detail);
        if (res.status === 400) throw new AiError("badRequest", detail);
        if (res.status >= 500) throw new AiError("unavailable", detail);
        throw new AiError("unknown", detail);
      }
      const text = (body.content ?? []).filter((b) => b.type === "text").map((b) => b.text ?? "").join("").trim();
      if (!text) throw new AiError(body.stop_reason === "refusal" ? "blocked" : "unknown", `empty response (${body.stop_reason})`);
      return {
        text,
        provider: "anthropic",
        model,
        tokensIn: body.usage?.input_tokens,
        tokensOut: body.usage?.output_tokens,
        truncated: body.stop_reason === "max_tokens",
      };
    },
  };
}
