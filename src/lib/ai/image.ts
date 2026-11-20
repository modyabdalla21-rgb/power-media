import "server-only";
import { serverEnv } from "@/lib/env.server";
import { AiError, type AiErrorCode } from "./types";

/**
 * Raster image generation with Google's APIs (GEMINI_API_KEY), used for AI
 * logo marks.
 *
 * - Gemini native image output (`:generateContent` + responseModalities) and
 *   Imagen (`:predict`) are both supported.
 * - Models are tried in order; quota, unavailable-model and transient errors
 *   fall through to the next model, a bad key stops immediately.
 * - Every failed attempt is logged with the model, HTTP status, a reason and
 *   Google's message, and returned (without secrets) for diagnostics.
 * - Models that just failed for a lasting reason (no free-tier quota, not
 *   found) are skipped for a few minutes on this warm instance.
 */

const BASE = (process.env.GEMINI_API_BASE_URL ?? "https://generativelanguage.googleapis.com/v1beta").replace(/\/$/, "");
const DEFAULT_MODELS = [
  "gemini-2.5-flash-image",
  "gemini-2.5-flash-image-preview",
  "gemini-2.0-flash-preview-image-generation",
  "gemini-2.0-flash-exp-image-generation",
  "imagen-4.0-generate-001",
  "imagen-3.0-generate-002",
];
const MIME = ["image/png", "image/jpeg", "image/webp"];
const MAX_BYTES = 5 * 1024 * 1024;

/**
 * Why an image attempt failed:
 * - noFreeTier: 429 with "limit: 0" — this key/project has no image quota (billing needed)
 * - rateLimited: 429 temporary rate / daily limit — retry later
 * - notFound: model doesn't exist / isn't available to this key
 * - badRequest: request shape rejected (e.g. modalities)
 * - blocked: safety filter or no image in the response
 * - auth: invalid key / permission
 * - timeout, unavailable (5xx / network)
 */
export type ImageFailReason = "noFreeTier" | "rateLimited" | "notFound" | "badRequest" | "blocked" | "auth" | "timeout" | "unavailable";
export type ImageAttempt = { model: string; status: number | null; reason: ImageFailReason; retryAfter?: number; message: string };
export type ImageResult = { mimeType: string; data: string; model: string; attempts: ImageAttempt[] };

export class ImageGenError extends AiError {
  constructor(public reason: ImageFailReason, public attempts: ImageAttempt[], code: AiErrorCode, retryAfterSec?: number) {
    super(code, attempts.map((a) => `${a.model}:${a.status ?? "-"}:${a.reason}`).join(", "), retryAfterSec);
  }
}

export const imageModels = () => [...new Set([serverEnv.geminiImageModel, ...DEFAULT_MODELS].filter(Boolean))];

type ApiError = {
  error?: { code?: number; status?: string; message?: string; details?: { "@type"?: string; retryDelay?: string }[] };
};

const retryDelay = (body: ApiError) => {
  const d = body.error?.details?.find((x) => x.retryDelay)?.retryDelay;
  return d && /^\d+(\.\d+)?s$/.test(d) ? Math.ceil(parseFloat(d)) : undefined;
};

class AttemptError extends Error {
  constructor(public attempt: Omit<ImageAttempt, "model">) {
    super(attempt.reason);
  }
}

function classify(status: number, body: ApiError): AttemptError {
  const msg = (body.error?.message ?? "").replace(/\s+/g, " ").slice(0, 300);
  const st = body.error?.status ?? "";
  const reason: ImageFailReason =
    status === 401 || (status === 400 && /api key/i.test(msg)) || (status === 403 && /api key|permission|denied/i.test(msg) && !/model/i.test(msg)) ? "auth"
    : status === 429 || st === "RESOURCE_EXHAUSTED" ? (/limit:\s*0\b|free[_ ]tier.*limit:\s*0/i.test(msg) ? "noFreeTier" : "rateLimited")
    : status === 404 || /not found|is not supported|not available|unsupported model/i.test(msg) ? "notFound"
    : status === 400 || st === "INVALID_ARGUMENT" || st === "FAILED_PRECONDITION" ? "badRequest"
    : status === 403 ? "notFound"
    : "unavailable";
  return new AttemptError({ status, reason, retryAfter: retryDelay(body), message: msg || st || `HTTP ${status}` });
}

type GeminiBody = ApiError & {
  candidates?: { content?: { parts?: { text?: string; inlineData?: { mimeType?: string; data?: string }; inline_data?: { mime_type?: string; data?: string } }[] }; finishReason?: string }[];
  promptFeedback?: { blockReason?: string };
};

/** Request shapes to try for Gemini native image output, newest first. */
const GEMINI_CONFIGS = [
  { responseModalities: ["IMAGE"], imageConfig: { aspectRatio: "1:1" } },
  { responseModalities: ["TEXT", "IMAGE"] },
];

async function callGemini(model: string, prompt: string, signal: AbortSignal): Promise<{ mimeType: string; data: string }> {
  // 2.0 image models only accept TEXT+IMAGE; start there to save a round trip.
  const configs = model.includes("2.0") ? [GEMINI_CONFIGS[1]] : GEMINI_CONFIGS;
  let last: AttemptError | null = null;
  for (const generationConfig of configs) {
    const res = await fetch(`${BASE}/models/${encodeURIComponent(model)}:generateContent`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-goog-api-key": serverEnv.geminiApiKey },
      body: JSON.stringify({ contents: [{ role: "user", parts: [{ text: prompt }] }], generationConfig }),
      signal,
      cache: "no-store",
    });
    const body = (await res.json().catch(() => ({}))) as GeminiBody;
    if (!res.ok) {
      last = classify(res.status, body);
      // A rejected request shape: try the other modality setup on the same model.
      if (last.attempt.reason === "badRequest") continue;
      throw last;
    }
    if (body.promptFeedback?.blockReason) throw new AttemptError({ status: res.status, reason: "blocked", message: `prompt blocked: ${body.promptFeedback.blockReason}` });
    const parts = body.candidates?.[0]?.content?.parts ?? [];
    for (const part of parts) {
      const mimeType = part.inlineData?.mimeType ?? part.inline_data?.mime_type ?? "";
      const data = part.inlineData?.data ?? part.inline_data?.data ?? "";
      if (data && MIME.includes(mimeType)) return { mimeType, data };
    }
    const text = parts.map((p) => p.text ?? "").join(" ").trim().slice(0, 160);
    throw new AttemptError({ status: res.status, reason: "blocked", message: `no image in response (finishReason ${body.candidates?.[0]?.finishReason ?? "none"})${text ? `: ${text}` : ""}` });
  }
  throw last ?? new AttemptError({ status: null, reason: "badRequest", message: "request rejected" });
}

async function callImagen(model: string, prompt: string, signal: AbortSignal): Promise<{ mimeType: string; data: string }> {
  const res = await fetch(`${BASE}/models/${encodeURIComponent(model)}:predict`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-goog-api-key": serverEnv.geminiApiKey },
    body: JSON.stringify({ instances: [{ prompt }], parameters: { sampleCount: 1, aspectRatio: "1:1" } }),
    signal,
    cache: "no-store",
  });
  const body = (await res.json().catch(() => ({}))) as ApiError & { predictions?: { bytesBase64Encoded?: string; mimeType?: string; raiFilteredReason?: string }[] };
  if (!res.ok) throw classify(res.status, body);
  const p = body.predictions?.[0];
  if (!p?.bytesBase64Encoded) throw new AttemptError({ status: res.status, reason: "blocked", message: p?.raiFilteredReason ?? "no image returned (likely filtered)" });
  return { mimeType: MIME.includes(p.mimeType ?? "") ? p.mimeType! : "image/png", data: p.bytesBase64Encoded };
}

/** model → time until which it's skipped (lasting failures only). */
const cooldown = new Map<string, number>();
const COOLDOWN_MS: Partial<Record<ImageFailReason, number>> = { noFreeTier: 3 * 60_000, notFound: 30 * 60_000 };

/** Overall reason when every model failed: the most actionable one wins. */
const PRIORITY: ImageFailReason[] = ["auth", "rateLimited", "noFreeTier", "blocked", "timeout", "unavailable", "badRequest", "notFound"];
const CODE: Record<ImageFailReason, AiErrorCode> = {
  auth: "auth", rateLimited: "quota", noFreeTier: "quota", blocked: "blocked", timeout: "timeout", unavailable: "unavailable", badRequest: "badRequest", notFound: "modelUnavailable",
};

export async function generateImage(prompt: string, deadlineMs = 50_000): Promise<ImageResult> {
  if (!serverEnv.geminiApiKey) throw new AiError("notConfigured");
  const started = Date.now();
  const attempts: ImageAttempt[] = [];
  const models = imageModels();
  // If everything is cooling down, try them anyway (the user explicitly asked again).
  const ready = models.filter((m) => (cooldown.get(m) ?? 0) <= Date.now());
  for (const model of ready.length ? ready : models) {
    const left = deadlineMs - (Date.now() - started);
    if (left < 8_000) break;
    try {
      const signal = AbortSignal.timeout(Math.min(left, 45_000));
      const img = model.startsWith("imagen") ? await callImagen(model, prompt, signal) : await callGemini(model, prompt, signal);
      if (Math.floor((img.data.length * 3) / 4) > MAX_BYTES) throw new AttemptError({ status: 200, reason: "badRequest", message: "image larger than 5 MB" });
      cooldown.delete(model);
      if (attempts.length) console.info(`[ai-image] ok with ${model} after: ${attempts.map((a) => `${a.model} ${a.status ?? "-"} ${a.reason}`).join("; ")}`);
      return { ...img, model, attempts };
    } catch (err) {
      const a: ImageAttempt =
        err instanceof AttemptError ? { model, ...err.attempt }
        : err instanceof Error && (err.name === "TimeoutError" || err.name === "AbortError") ? { model, status: null, reason: "timeout", message: "timed out" }
        : { model, status: null, reason: "unavailable", message: String(err).slice(0, 200) };
      attempts.push(a);
      console.warn(`[ai-image] model=${a.model} status=${a.status ?? "-"} reason=${a.reason}${a.retryAfter ? ` retryAfter=${a.retryAfter}s` : ""} message="${a.message}"`);
      const cool = COOLDOWN_MS[a.reason];
      if (cool) cooldown.set(model, Date.now() + cool);
      if (a.reason === "auth") break;
    }
  }
  if (!attempts.length) throw new ImageGenError("timeout", attempts, "timeout");
  const reason = [...attempts].sort((x, y) => PRIORITY.indexOf(x.reason) - PRIORITY.indexOf(y.reason))[0].reason;
  const retryAfter = Math.max(0, ...attempts.map((a) => a.retryAfter ?? 0)) || undefined;
  console.error(`[ai-image] all image models failed (${reason}): ${attempts.map((a) => `${a.model} ${a.status ?? "-"} ${a.reason}`).join("; ")}`);
  throw new ImageGenError(reason, attempts, CODE[reason], retryAfter);
}

/** Brand initials for monogram prompts ("Nile Leaf" → "NL"). */
export const initials = (name: string) =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => [...w][0])
    .join("")
    .toUpperCase();

const lum = (hex: string) => {
  const n = parseInt(hex.slice(1), 16);
  return (0.299 * ((n >> 16) & 255) + 0.587 * ((n >> 8) & 255) + 0.114 * (n & 255)) / 255;
};

/**
 * Studio-grade art direction around a concept's logo brief: an emblem /
 * symbol / monogram mark centred on a clean studio background (dark or
 * light, whichever contrasts with the brand colors), no stray text.
 */
export function logoImagePrompt(opts: { brand: string; conceptIndex: number; conceptName: string; idea: string; logoPrompt: string; colors: string[]; industry?: string | null }) {
  const letters = initials(opts.brand);
  const colors = opts.colors.slice(0, 3);
  const avg = colors.reduce((s, c) => s + lum(c), 0) / Math.max(colors.length, 1);
  const background = avg > 0.55 ? "a deep charcoal-navy (#10161F) studio background" : "a clean warm off-white (#FAFAF7) studio background";
  const direction = [
    "an architectural, geometric EMBLEM: a constructed badge built on a strict grid — arches, intersecting arcs, layered frames and intentional negative space — with refined, even line weights",
    "an editorial, modernist abstract SYMBOL: a sleek, confident silhouette that blends a subtle optical illusion or an industry motif into one memorable shape",
    `a refined custom MONOGRAM of exactly the letters "${letters}": bespoke vector letterforms with balanced thick/thin contrast, ligatures or shared strokes, perfectly kerned, framed by a subtle emblem`,
  ][opts.conceptIndex] ?? "a refined abstract brand mark";
  const textRule =
    opts.conceptIndex === 2
      ? `Typography: render ONLY the letters "${letters}" — spelled exactly, no other characters, words, taglines or fake text.`
      : "Typography: NONE. Absolutely no letters, words, numbers, signatures or watermarks anywhere.";
  return [
    `Design a premium brand logo mark for "${opts.brand}"${opts.industry ? `, a ${opts.industry} brand` : ""} in Egypt and the Arab market.`,
    `Concept "${opts.conceptName}": ${opts.idea}`,
    `Art direction brief: ${opts.logoPrompt}`,
    `Form: ${direction}.`,
    "Craft: flat vector logo, crisp clean edges, precise geometry, balanced proportions and optical centring, subtle depth from at most one soft gradient, luxury design-agency finish (Pentagram / Koto quality), timeless, still legible at 32px.",
    `Palette: ${colors.join(", ")} only.`,
    `Composition: a single mark perfectly centred on ${background}, filling about 55% of the square canvas with generous empty margin.`,
    textRule,
    "Avoid: mockups, business cards, paper, walls, signage, 3D renders, photos, hands, drop shadows on the background, frames around the canvas, grid lines, multiple logos, clip-art, cartoon style, blurry or noisy edges.",
  ].join("\n");
}
