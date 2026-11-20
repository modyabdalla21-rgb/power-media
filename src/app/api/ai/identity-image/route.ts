import { NextResponse } from "next/server";
import { z } from "zod";
import { generateImage, ImageGenError, logoImagePrompt } from "@/lib/ai/image";
import type { BrandIdentity } from "@/lib/ai/identity";
import { kitColors } from "@/lib/ai/post";
import { AiError } from "@/lib/ai/types";
import { BRAND_BUCKET } from "@/lib/client/workspace";
import { isDashboardPreview } from "@/lib/env";
import { createSupabaseServerClient, getCurrentProfile } from "@/lib/supabase/server";

// Image models can take 10–40s; each concept is rendered in its own request.
export const maxDuration = 60;

const bodySchema = z.object({
  generationId: z.uuid().nullable().optional(),
  concept: z.number().int().min(0).max(2),
  /** Preview mode only (no database): the concept to render. Ignored otherwise. */
  preview: z
    .object({ brand: z.string().max(120), name: z.string().max(80), idea: z.string().max(600), logoPrompt: z.string().max(1200), colors: z.array(z.string().regex(/^#[0-9a-f]{6}$/i)).max(6) })
    .optional(),
});

const json = (body: unknown, status = 200) => NextResponse.json(body, { status });
const EXT: Record<string, string> = { "image/png": "png", "image/jpeg": "jpg", "image/webp": "webp" };
const HOURLY_IMAGE_LIMIT = 30;
const TTL = 60 * 60;

/**
 * Error → response. `fallback`: the UI keeps the vector logo. `reason` tells
 * a temporary rate limit from a key without image quota or an unavailable
 * model; per-model `attempts` are for diagnostics (Google's messages only for staff).
 */
function aiErrorResponse(err: unknown, staff: boolean) {
  const e = err instanceof AiError ? err : new AiError("unknown", String(err));
  if (!(err instanceof AiError)) console.error("[ai-image] unexpected", err);
  const status = e.code === "quota" || e.code === "rateLimited" ? 429 : e.code === "timeout" ? 504 : e.code === "blocked" || e.code === "badRequest" ? 422 : 503;
  const img = err instanceof ImageGenError ? err : null;
  return json(
    {
      code: e.code,
      reason: img?.reason ?? (e.code === "notConfigured" ? "notConfigured" : e.code === "auth" ? "auth" : "unavailable"),
      retryAfter: e.retryAfterSec,
      attempts: img?.attempts.map((a) => ({ model: a.model, status: a.status, reason: a.reason, ...(staff ? { message: a.message } : {}) })),
      fallback: true,
    },
    status,
  );
}

async function signed(supabase: NonNullable<Awaited<ReturnType<typeof createSupabaseServerClient>>>, path: string, fileName: string) {
  const [view, download] = await Promise.all([
    supabase.storage.from(BRAND_BUCKET).createSignedUrl(path, TTL),
    supabase.storage.from(BRAND_BUCKET).createSignedUrl(path, TTL, { download: fileName }),
  ]);
  return { url: view.data?.signedUrl ?? null, downloadUrl: download.data?.signedUrl ?? null };
}

const fileNameFor = (brand: string, concept: number, mime: string) =>
  `${(brand || "logo").replace(/[^\p{L}\p{N}]+/gu, "-").replace(/^-|-$/g, "").slice(0, 40) || "logo"}-logo-${concept + 1}.${EXT[mime] ?? "png"}`;

export async function POST(request: Request) {
  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return json({ code: "badRequest" }, 400);
  const { generationId, concept } = parsed.data;

  const supabase = await createSupabaseServerClient();
  const profile = await getCurrentProfile();

  // ── Preview mode (no Supabase): render and return inline, nothing is stored.
  if (!supabase) {
    if (!isDashboardPreview || !parsed.data.preview) return json({ code: "unauthorized" }, 401);
    const p = parsed.data.preview;
    try {
      const img = await generateImage(logoImagePrompt({ brand: p.brand, conceptIndex: concept, conceptName: p.name, idea: p.idea, logoPrompt: p.logoPrompt, colors: kitColors(p.colors.map((hex) => ({ hex }))) }));
      const url = `data:${img.mimeType};base64,${img.data}`;
      return json({ url, downloadUrl: url, fileName: fileNameFor(p.brand, concept, img.mimeType), model: img.model, stored: false });
    } catch (err) {
      return aiErrorResponse(err, true);
    }
  }

  if (!profile) return json({ code: "unauthorized" }, 401);
  if (!generationId) return json({ code: "badRequest" }, 400);

  // The concept always comes from the saved generation (RLS-scoped), never from the browser.
  const { data: gen } = await supabase.from("ai_generations").select("id, tool, user_id, client_id, data, inputs").eq("id", generationId).maybeSingle();
  const identity = gen?.data as BrandIdentity | null;
  const c = identity?.concepts?.[concept];
  if (!gen || gen.tool !== "brandIdentity" || !identity || !c) return json({ code: "badRequest" }, 404);
  if (profile.role === "client" && gen.user_id !== profile.id) return json({ code: "forbidden" }, 403);

  // Already rendered: return it (no second image call for the same concept).
  if (gen.client_id) {
    const { data: existing } = await supabase.from("brand_logo_images").select("storage_path, mime_type, model").eq("generation_id", gen.id).eq("concept", concept).maybeSingle();
    if (existing) {
      const fileName = fileNameFor(identity.brand_name, concept, existing.mime_type);
      return json({ ...(await signed(supabase, existing.storage_path, fileName)), fileName, model: existing.model, stored: true });
    }
    const since = new Date(Date.now() - 60 * 60 * 1000).toISOString();
    const { count } = await supabase.from("brand_logo_images").select("id", { count: "exact", head: true }).eq("created_by", profile.id).gte("created_at", since);
    if ((count ?? 0) >= HOURLY_IMAGE_LIMIT) return json({ code: "userLimit", reason: "userLimit", fallback: true, retryAfter: 3600 }, 429);
  }

  const inputs = (gen.inputs ?? {}) as Record<string, string>;
  let img;
  try {
    img = await generateImage(
      logoImagePrompt({ brand: identity.brand_name, conceptIndex: concept, conceptName: c.name, idea: c.idea, logoPrompt: c.logo_prompt, colors: kitColors(identity.palette), industry: inputs.industry }),
    );
  } catch (err) {
    console.error(`[ai-image] generation ${gen.id} concept ${concept + 1} fell back to vector`);
    return aiErrorResponse(err, profile.role !== "client");
  }
  const fileName = fileNameFor(identity.brand_name, concept, img.mimeType);

  // Staff generation not linked to a client: show it, but there's no brand folder to store it in.
  if (!gen.client_id) {
    const url = `data:${img.mimeType};base64,${img.data}`;
    return json({ url, downloadUrl: url, fileName, model: img.model, stored: false });
  }

  const path = `${gen.client_id}/ai-logo-${gen.id}-${concept + 1}-${Date.now().toString(36)}.${EXT[img.mimeType] ?? "png"}`;
  const { error: uploadError } = await supabase.storage
    .from(BRAND_BUCKET)
    .upload(path, Buffer.from(img.data, "base64"), { contentType: img.mimeType, upsert: false, cacheControl: "31536000" });
  if (uploadError) {
    console.error("[ai-image] upload failed", uploadError.message);
    const url = `data:${img.mimeType};base64,${img.data}`;
    return json({ url, downloadUrl: url, fileName, model: img.model, stored: false });
  }
  const { error: rowError } = await supabase
    .from("brand_logo_images")
    .insert({ generation_id: gen.id, concept, client_id: gen.client_id, storage_path: path, mime_type: img.mimeType, model: img.model.slice(0, 80) });
  if (rowError) {
    await supabase.storage.from(BRAND_BUCKET).remove([path]);
    // Another request rendered the same concept first: use that one.
    const { data: winner } = await supabase.from("brand_logo_images").select("storage_path, mime_type, model").eq("generation_id", gen.id).eq("concept", concept).maybeSingle();
    if (winner) return json({ ...(await signed(supabase, winner.storage_path, fileName)), fileName, model: winner.model, stored: true });
    console.error("[ai-image] save failed", rowError.code, rowError.message);
    const url = `data:${img.mimeType};base64,${img.data}`;
    return json({ url, downloadUrl: url, fileName, model: img.model, stored: false });
  }
  return json({ ...(await signed(supabase, path, fileName)), fileName, model: img.model, stored: true });
}
