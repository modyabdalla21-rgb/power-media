import "server-only";
import { serverEnv } from "@/lib/env.server";
import { AiError, type AiErrorCode } from "./types";

/**
 * Raster image generation with Google's APIs (GEMINI_API_KEY), used for AI
 * logo marks. Tries image models in order and falls through on quota,
 * unavailable-model and transient errors; a bad key stops immediately.
 */

const BASE = (process.env.GEMINI_API_BASE_URL ?? "https://generativelanguage.googleapis.com/v1beta").replace(/\/$/, "");
const DEFAULT_MODELS = ["gemini-2.5-flash-image", "gemini-2.0-flash-preview-image-generation", "imagen-3.0-generate-002"];
const MIME = ["image/png", "image/jpeg", "image/webp"];
const MAX_BYTES = 5 * 1024 * 1024;

export type ImageResult = { mimeType: string; data: string; model: string };

export const imageModels = () => [...new Set([serverEnv.geminiImageModel, ...DEFAULT_MODELS].filter(Boolean))];

type ApiError = { error?: { code?: number; status?: string; message?: string } };

function classify(status: number, body: ApiError): AiError {
  const msg = body.error?.message ?? "";
  const s = body.error?.status ?? "";
  if (status === 401 || (status === 400 && /api key/i.test(msg)) || (status === 403 && /api key|permission/i.test(msg))) return new AiError("auth", msg);
  if (status === 429 || s === "RESOURCE_EXHAUSTED") return new AiError("quota", msg);
  if (status === 404 || (status === 400 && /model|not (found|supported)|modalit|response_modalities|only available/i.test(msg))) return new AiError("modelUnavailable", msg);
  if (status === 400) return new AiError("badRequest", msg);
  if (status === 403) return new AiError("modelUnavailable", msg);
  return new AiError("unavailable", `${status} ${msg}`);
}

const decodedSize = (b64: string) => Math.floor((b64.length * 3) / 4);

async function callGemini(model: string, prompt: string, signal: AbortSignal): Promise<ImageResult> {
  // 2.0 preview image models require TEXT+IMAGE; newer ones accept IMAGE only + an aspect ratio.
  const legacy = model.includes("2.0");
  const res = await fetch(`${BASE}/models/${encodeURIComponent(model)}:generateContent`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-goog-api-key": serverEnv.geminiApiKey },
    body: JSON.stringify({
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      generationConfig: legacy ? { responseModalities: ["TEXT", "IMAGE"] } : { responseModalities: ["IMAGE"], imageConfig: { aspectRatio: "1:1" } },
    }),
    signal,
    cache: "no-store",
  });
  const body = (await res.json().catch(() => ({}))) as ApiError & {
    candidates?: { content?: { parts?: { inlineData?: { mimeType?: string; data?: string }; inline_data?: { mime_type?: string; data?: string } }[] }; finishReason?: string }[];
    promptFeedback?: { blockReason?: string };
  };
  if (!res.ok) throw classify(res.status, body);
  if (body.promptFeedback?.blockReason) throw new AiError("blocked", body.promptFeedback.blockReason);
  for (const part of body.candidates?.[0]?.content?.parts ?? []) {
    const mimeType = part.inlineData?.mimeType ?? part.inline_data?.mime_type ?? "";
    const data = part.inlineData?.data ?? part.inline_data?.data ?? "";
    if (data && MIME.includes(mimeType)) return { mimeType, data, model };
  }
  throw new AiError("blocked", `no image returned (${body.candidates?.[0]?.finishReason ?? "unknown"})`);
}

async function callImagen(model: string, prompt: string, signal: AbortSignal): Promise<ImageResult> {
  const res = await fetch(`${BASE}/models/${encodeURIComponent(model)}:predict`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-goog-api-key": serverEnv.geminiApiKey },
    body: JSON.stringify({ instances: [{ prompt }], parameters: { sampleCount: 1, aspectRatio: "1:1" } }),
    signal,
    cache: "no-store",
  });
  const body = (await res.json().catch(() => ({}))) as ApiError & { predictions?: { bytesBase64Encoded?: string; mimeType?: string }[] };
  if (!res.ok) throw classify(res.status, body);
  const p = body.predictions?.[0];
  if (!p?.bytesBase64Encoded) throw new AiError("blocked", "no image returned");
  return { mimeType: MIME.includes(p.mimeType ?? "") ? p.mimeType! : "image/png", data: p.bytesBase64Encoded, model };
}

/** Error priority when every model failed: the most actionable one wins. */
const RANK: AiErrorCode[] = ["auth", "quota", "blocked", "timeout", "unavailable", "modelUnavailable", "badRequest", "unknown"];

export async function generateImage(prompt: string, deadlineMs = 50_000): Promise<ImageResult> {
  if (!serverEnv.geminiApiKey) throw new AiError("notConfigured");
  const started = Date.now();
  const errors: AiError[] = [];
  for (const model of imageModels()) {
    const left = deadlineMs - (Date.now() - started);
    if (left < 8_000) break;
    try {
      const signal = AbortSignal.timeout(Math.min(left, 45_000));
      const img = model.startsWith("imagen") ? await callImagen(model, prompt, signal) : await callGemini(model, prompt, signal);
      if (decodedSize(img.data) > MAX_BYTES) throw new AiError("badRequest", "image too large");
      return img;
    } catch (err) {
      const e =
        err instanceof AiError ? err
        : err instanceof Error && (err.name === "TimeoutError" || err.name === "AbortError") ? new AiError("timeout", model)
        : new AiError("unavailable", String(err));
      console.warn(`[ai-image] ${model} failed: ${e.code} ${e.detail.slice(0, 160)}`);
      if (e.code === "auth") throw e;
      errors.push(e);
    }
  }
  if (!errors.length) throw new AiError("timeout");
  throw errors.sort((a, b) => RANK.indexOf(a.code) - RANK.indexOf(b.code))[0];
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

/**
 * Art direction wrapper around a concept's logo prompt: a clean, studio-grade
 * vector-style mark on a solid background — no mockups and no stray text.
 */
export function logoImagePrompt(opts: { brand: string; conceptIndex: number; conceptName: string; idea: string; logoPrompt: string; colors: string[]; industry?: string | null }) {
  const direction = [
    "an architectural, geometric emblem built from a strict grid: arches, intersecting arcs and intentional negative space",
    "an editorial, modernist abstract symbol with a subtle optical or industry motif and a confident silhouette",
    `a refined custom monogram of the letters "${initials(opts.brand)}" drawn as bespoke vector letterforms with balanced thick/thin contrast`,
  ][opts.conceptIndex] ?? "a refined abstract brand mark";
  const textRule =
    opts.conceptIndex === 2
      ? `The ONLY characters allowed are the letters "${initials(opts.brand)}" forming the monogram. No other words, no taglines.`
      : "Absolutely NO text, letters, words, numbers or watermarks anywhere in the image.";
  return [
    `Professional logo mark for "${opts.brand}"${opts.industry ? `, a ${opts.industry} brand` : ""} in Egypt / the Arab market.`,
    `Concept "${opts.conceptName}": ${opts.idea}`,
    `Art direction: ${opts.logoPrompt}`,
    `Design it as ${direction}.`,
    `Style: flat, minimalist, vector-style brand mark with crisp clean edges, perfectly centred, generous empty margin (the mark fills ~55% of the canvas), luxury design-agency aesthetic, timeless and memorable, legible when scaled down to 32px.`,
    `Colors: use only ${opts.colors.slice(0, 3).join(", ")} on a solid plain off-white (#FAFAF7) background. High contrast, at most one subtle gradient.`,
    textRule,
    "Square 1:1. No mockups, no business cards, no paper, no walls, no 3D render, no photo, no hands, no shadows on the background, no frames, no grid lines, no extra icons.",
  ].join("\n");
}
