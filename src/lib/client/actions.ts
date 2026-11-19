"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { isLocale, type Locale } from "@/i18n/config";
import { sanitizeSvg, type BrandIdentity } from "@/lib/ai/identity";
import { createSupabaseServerClient, getCurrentProfile } from "@/lib/supabase/server";
import { getClientWorkspace } from "./workspace";

const HEX = /^#[0-9a-f]{6}$/i;
const UUID = z.uuid();

const opt = (max: number) => z.string().trim().max(max).transform((v) => v || null);
const profileSchema = z.object({
  name: z.string().trim().min(1).max(160),
  industry: opt(120),
  market: z.enum(["egypt", "ksa", "uae", "gcc", "other", ""]).transform((v) => v || null),
  audience: opt(2000),
  tone: opt(300),
  dialect: z.enum(["en", "ar_msa", "ar_eg", "ar_gulf", ""]).transform((v) => v || null),
  website: opt(300),
  brand_notes: opt(4000),
});

export type BrandProfileState = { ok?: boolean; error?: "invalid" | "forbidden" | "dbError"; fields?: string[] } | undefined;

const field = (fd: FormData, k: string) => String(fd.get(k) ?? "");
const localeOf = (fd: FormData, key = "locale"): Locale => {
  const l = field(fd, key);
  return isLocale(l) ? l : "en";
};

/**
 * Save the client's brand profile. In onboarding mode it also marks the
 * workspace as onboarded, optionally stores an existing identity as the
 * active brand kit, applies the chosen interface language and routes the
 * client to the identity generator (no identity yet) or the dashboard.
 */
export async function saveBrandProfile(_prev: BrandProfileState, fd: FormData): Promise<BrandProfileState> {
  const profile = await getCurrentProfile();
  const supabase = await createSupabaseServerClient();
  const workspace = await getClientWorkspace();
  if (!profile || !supabase || !workspace) return { error: "forbidden" };

  const parsed = profileSchema.safeParse(Object.fromEntries(["name", "industry", "market", "audience", "tone", "dialect", "website", "brand_notes"].map((k) => [k, field(fd, k)])));
  if (!parsed.success) return { error: "invalid", fields: parsed.error.issues.map((i) => String(i.path[0])) };

  const mode = field(fd, "mode") === "onboarding" ? "onboarding" : "profile";
  const current = localeOf(fd);
  const uiLocale = isLocale(field(fd, "ui_locale")) ? (field(fd, "ui_locale") as Locale) : current;
  const hasIdentity = field(fd, "has_identity") === "yes";
  const colors = field(fd, "colors").split(/[\s,]+/).map((c) => (c.startsWith("#") ? c : `#${c}`)).filter((c) => HEX.test(c)).slice(0, 8);
  const logoUrlRaw = field(fd, "logo_url").trim();
  const logoUrl = /^https:\/\/[^\s"'<>]{4,490}$/.test(logoUrlRaw) ? logoUrlRaw : null;
  if (logoUrlRaw && !logoUrl) return { error: "invalid", fields: ["logo_url"] };

  const { error } = await supabase
    .from("clients")
    .update({ ...parsed.data, ...(mode === "onboarding" ? { onboarded_at: new Date().toISOString() } : {}) })
    .eq("id", workspace.id);
  if (error) {
    console.error("[brand] profile save failed", error.code, error.message);
    return { error: "dbError" };
  }

  if (mode === "onboarding" && hasIdentity && (colors.length || logoUrl)) {
    const roles = ["primary", "secondary", "accent", "neutral", "background"];
    const { data: kit, error: kitError } = await supabase
      .from("brand_kits")
      .insert({
        client_id: workspace.id,
        name: field(fd, "kit_name").slice(0, 160) || parsed.data.name,
        source: "existing",
        palette: colors.map((hex, i) => ({ name: roles[i] ?? `color ${i + 1}`, hex, role: roles[i] ?? "accent" })),
        logo_url: logoUrl,
      })
      .select("id")
      .single();
    if (kitError) console.error("[brand] existing kit save failed", kitError.code, kitError.message);
    if (kit) await supabase.rpc("activate_brand_kit", { kit: kit.id });
  }

  if (uiLocale !== profile.locale) await supabase.from("profiles").update({ locale: uiLocale }).eq("id", profile.id);
  revalidatePath("/[locale]/dashboard", "layout");

  if (mode === "onboarding") redirect(hasIdentity ? `/${uiLocale}/dashboard` : `/${uiLocale}/dashboard/ai/brand-identity`);
  if (uiLocale !== current) redirect(`/${uiLocale}/dashboard/brand`);
  return { ok: true };
}

export type ApplyState = { ok?: boolean; kitId?: string; error?: "invalid" | "forbidden" | "dbError" } | undefined;

/** Turn one concept of an AI brand-identity generation into the active brand kit. */
export async function applyIdentityConcept(_prev: ApplyState, fd: FormData): Promise<ApplyState> {
  const profile = await getCurrentProfile();
  const supabase = await createSupabaseServerClient();
  if (!profile || !supabase) return { error: "forbidden" };
  const id = UUID.safeParse(fd.get("generation_id"));
  const index = Number(fd.get("concept"));
  if (!id.success || !Number.isInteger(index) || index < 0 || index > 2) return { error: "invalid" };

  const { data: gen } = await supabase.from("ai_generations").select("id, tool, data, client_id").eq("id", id.data).maybeSingle();
  const identity = gen?.data as BrandIdentity | null;
  const concept = identity?.concepts?.[index];
  if (!gen || gen.tool !== "brandIdentity" || !identity || !concept || !gen.client_id) return { error: "invalid" };

  const { data: kit, error } = await supabase
    .from("brand_kits")
    .insert({
      client_id: gen.client_id,
      name: `${identity.brand_name} — ${concept.name}`.slice(0, 160),
      source: "ai",
      tagline: identity.tagline?.slice(0, 300) ?? null,
      positioning: identity.positioning?.slice(0, 2000) ?? null,
      palette: identity.palette,
      typography: identity.typography,
      voice: { do: identity.voice?.do ?? [], dont: identity.voice?.dont ?? [], personality: identity.personality ?? [] },
      // Re-sanitise on the way into a long-lived record (defence in depth).
      logo_svg: sanitizeSvg(concept.svg),
      logo_prompt: concept.logo_prompt?.slice(0, 2000) || null,
      generation_id: gen.id,
    })
    .select("id")
    .single();
  if (error || !kit) {
    console.error("[brand] apply concept failed", error?.code, error?.message);
    return { error: error?.code === "42501" ? "forbidden" : "dbError" };
  }
  const { error: activateError } = await supabase.rpc("activate_brand_kit", { kit: kit.id });
  if (activateError) return { error: "dbError" };
  revalidatePath("/[locale]/dashboard", "layout");
  return { ok: true, kitId: kit.id };
}

export async function activateKit(_prev: ApplyState, fd: FormData): Promise<ApplyState> {
  const supabase = await createSupabaseServerClient();
  const id = UUID.safeParse(fd.get("kit_id"));
  if (!supabase || !id.success) return { error: "invalid" };
  const { error } = await supabase.rpc("activate_brand_kit", { kit: id.data });
  if (error) return { error: error.code === "42501" ? "forbidden" : "dbError" };
  revalidatePath("/[locale]/dashboard", "layout");
  return { ok: true };
}

export type RequestState = { ok?: "sent" | "pending"; error?: "invalid" | "forbidden" | "dbError" } | undefined;

/** Client → agency: plan upgrade or brand/logo help (no payment gateway). */
export async function submitClientRequest(_prev: RequestState, fd: FormData): Promise<RequestState> {
  const profile = await getCurrentProfile();
  const supabase = await createSupabaseServerClient();
  const workspace = await getClientWorkspace();
  if (!profile || !supabase || !workspace) return { error: "forbidden" };

  const parsed = z
    .object({
      kind: z.enum(["upgrade", "brand_help", "general"]),
      requested_tier: z.enum(["growth", "pro", ""]).transform((v) => v || null),
      message: z.string().trim().max(2000).transform((v) => v || null),
    })
    .safeParse({ kind: fd.get("kind"), requested_tier: field(fd, "requested_tier"), message: field(fd, "message") });
  if (!parsed.success || (parsed.data.kind === "upgrade" && !parsed.data.requested_tier)) return { error: "invalid" };

  // One open request of each kind is enough.
  const { count } = await supabase
    .from("client_requests")
    .select("id", { count: "exact", head: true })
    .eq("client_id", workspace.id)
    .eq("kind", parsed.data.kind)
    .eq("status", "new");
  if ((count ?? 0) > 0) return { ok: "pending" };

  const { error } = await supabase.from("client_requests").insert({ client_id: workspace.id, requested_by: profile.id, ...parsed.data });
  if (error) {
    console.error("[requests] insert failed", error.code, error.message);
    return { error: "dbError" };
  }
  revalidatePath("/[locale]/dashboard", "layout");
  return { ok: "sent" };
}
