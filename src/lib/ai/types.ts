/** Provider-agnostic AI types. */

export type ProviderId = "gemini" | "anthropic";

export type GenerateParams = {
  system: string;
  prompt: string;
  temperature: number;
  maxOutputTokens: number;
  /** Ask for a JSON response (Gemini JSON mode; others via the prompt). */
  json?: boolean;
  signal?: AbortSignal;
};

export type GenerateResult = {
  text: string;
  provider: ProviderId;
  model: string;
  tokensIn?: number;
  tokensOut?: number;
  /** Output stopped at the token limit. */
  truncated: boolean;
};

/**
 * Normalised failure categories. Raw provider messages are logged
 * server-side only and never sent to the browser.
 */
export type AiErrorCode =
  | "notConfigured"
  | "auth"
  | "rateLimited"
  | "quota"
  | "blocked"
  | "badRequest"
  | "modelUnavailable"
  | "unavailable"
  | "timeout"
  | "unknown";

export class AiError extends Error {
  constructor(
    public code: AiErrorCode,
    public detail = "",
    public retryAfterSec?: number,
  ) {
    super(`${code}${detail ? `: ${detail}` : ""}`);
  }
  /**
   * Worth trying another model/provider. A 400 counts too: it is often
   * model-specific (unsupported parameter), so another model may succeed.
   */
  get retryable() {
    return ["rateLimited", "quota", "modelUnavailable", "unavailable", "timeout", "badRequest"].includes(this.code);
  }
}

export interface AiProvider {
  readonly id: ProviderId;
  readonly models: string[];
  generate(model: string, params: GenerateParams): Promise<GenerateResult>;
}
