import "server-only";
import { cache } from "react";
import type { SupabaseClient } from "@supabase/supabase-js";
import { isPlanTier, planLimits, type PlanTier } from "@/config/plans";
import { aiTools } from "@/lib/ai/tools";
import { createSupabaseServerClient, getCurrentProfile } from "@/lib/supabase/server";

export type Workspace = {
  id: string;
  name: string;
  industry: string | null;
  market: string | null;
  audience: string | null;
  tone: string | null;
  dialect: string | null;
  website: string | null;
  brand_notes: string | null;
  plan_tier: PlanTier;
  source: "agency" | "self_serve";
  onboarded_at: string | null;
};

export type BrandKit = {
  id: string;
  client_id: string;
  name: string;
  source: "ai" | "existing";
  tagline: string | null;
  positioning: string | null;
  palette: { name?: string; hex: string; role?: string; usage?: string }[];
  typography: { heading?: { family: string; why?: string }; body?: { family: string; why?: string }; arabic?: { family: string; why?: string } };
  voice: { do?: string[]; dont?: string[]; personality?: string[] };
  logo_svg: string | null;
  logo_url: string | null;
  logo_prompt: string | null;
  notes: string | null;
  logo_asset_id: string | null;
  is_active: boolean;
  created_at: string;
};

export type BrandAsset = {
  id: string;
  kind: "logo" | "reference" | "product";
  storage_path: string;
  file_name: string | null;
  mime_type: string;
  caption: string | null;
  created_at: string;
  /** Short-lived signed URL (private bucket). */
  url: string | null;
};

export const BRAND_BUCKET = "brand-assets";
const SIGNED_URL_TTL = 60 * 60;

const WORKSPACE_COLUMNS = "id, name, industry, market, audience, tone, dialect, website, brand_notes, plan_tier, source, onboarded_at";
export const BRAND_KIT_COLUMNS = "id, client_id, name, source, tagline, positioning, palette, typography, voice, logo_svg, logo_url, logo_prompt, notes, logo_asset_id, is_active, created_at";

/**
 * The signed-in client's workspace, created on first access if missing
 * (security-definer RPC). Null for staff or when Supabase isn't set up.
 */
export const getClientWorkspace = cache(async (): Promise<Workspace | null> => {
  const profile = await getCurrentProfile();
  const supabase = await createSupabaseServerClient();
  if (!profile || !supabase || profile.role !== "client") return null;

  // Fast path (every navigation): one select. Same row the RPC would pick (oldest workspace).
  const select = () => supabase.from("clients").select(WORKSPACE_COLUMNS).eq("portal_user_id", profile.id).order("created_at").limit(1).maybeSingle();
  let { data } = await select();
  if (!data) {
    // First visit: provision the workspace (security-definer RPC), then read it.
    const { error } = await supabase.rpc("ensure_client_workspace");
    if (error) console.error("[workspace] ensure failed", error.code, error.message);
    ({ data } = await select());
  }
  if (!data) return null;
  return { ...(data as Workspace), plan_tier: isPlanTier(data.plan_tier) ? data.plan_tier : "free" };
});

/**
 * Whether the agency actually runs work for this client (projects, campaigns,
 * published reports or issued invoices). Clients without any only see their
 * AI brand-growth workspace; agency views appear once there is real data.
 */
export const hasAgencyWork = cache(async (): Promise<boolean> => {
  const ws = await getClientWorkspace();
  const supabase = await createSupabaseServerClient();
  if (!ws || !supabase || ws.source !== "agency") return false;
  const profile = await getCurrentProfile();
  const head = { count: "exact" as const, head: true };
  const [projects, campaigns, reports, invoices] = await Promise.all([
    // Projects the client opened themselves don't count as agency work.
    supabase.from("projects").select("id", head).eq("client_id", ws.id).or(`created_by.is.null,created_by.neq.${profile?.id ?? "00000000-0000-0000-0000-000000000000"}`),
    supabase.from("campaigns").select("id", head).eq("client_id", ws.id),
    supabase.from("reports").select("id", head).eq("client_id", ws.id).neq("status", "draft"),
    supabase.from("invoices").select("id", head).eq("client_id", ws.id).neq("status", "draft"),
  ]);
  return [projects, campaigns, reports, invoices].some((r) => (r.count ?? 0) > 0);
});

export async function getActiveBrandKit(supabase: SupabaseClient, clientId: string): Promise<BrandKit | null> {
  const { data } = await supabase.from("brand_kits").select(BRAND_KIT_COLUMNS).eq("client_id", clientId).eq("is_active", true).maybeSingle();
  return (data as BrandKit | null) ?? null;
}

export const monthStartIso = () => {
  const d = new Date();
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1)).toISOString();
};
export const nextMonthStartIso = () => {
  const d = new Date();
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 1)).toISOString();
};

export type Usage = { tier: PlanTier; ai: { used: number; limit: number }; identity: { used: number; limit: number }; resetsAt: string };

/** This month's usage of the client user's own generations against the plan. */
export async function getUsage(supabase: SupabaseClient, userId: string, workspace: Workspace): Promise<Usage> {
  const since = monthStartIso();
  const base = () => supabase.from("ai_generations").select("id", { count: "exact", head: true }).eq("user_id", userId).eq("client_id", workspace.id).gte("created_at", since);
  const [ai, identity] = await Promise.all([base().in("tool", aiTools.filter((t) => t.quota === "ai" && !t.hub).map((t) => t.key)), base().eq("tool", "brandIdentity")]);
  const limits = planLimits[workspace.plan_tier];
  return {
    tier: workspace.plan_tier,
    ai: { used: ai.count ?? 0, limit: limits.aiPerMonth },
    identity: { used: identity.count ?? 0, limit: limits.identityPerMonth },
    resetsAt: nextMonthStartIso(),
  };
}

/** Text block describing the brand for AI prompts (profile + active kit). */
export function brandContextText(
  ws: Pick<Workspace, "name" | "industry" | "market" | "audience" | "tone" | "dialect" | "website" | "brand_notes"> | null,
  kit: BrandKit | null,
  assets: { kind: string; file_name: string | null; caption: string | null }[] = [],
) {
  const lines: string[] = [];
  if (ws) {
    lines.push(`Brand: ${ws.name}`);
    if (ws.industry) lines.push(`Industry: ${ws.industry}`);
    if (ws.market) lines.push(`Main market: ${ws.market}`);
    if (ws.audience) lines.push(`Audience: ${ws.audience}`);
    if (ws.tone) lines.push(`Tone & style: ${ws.tone}`);
    if (ws.dialect) lines.push(`Preferred content language: ${ws.dialect}`);
    if (ws.brand_notes) lines.push(`Brand notes: ${ws.brand_notes.slice(0, 1200)}`);
  }
  if (kit) {
    lines.push(`Active brand kit: ${kit.name}`);
    if (kit.tagline) lines.push(`Tagline: ${kit.tagline}`);
    if (kit.positioning) lines.push(`Positioning: ${kit.positioning}`);
    if (kit.palette?.length) lines.push(`Palette: ${kit.palette.map((c) => `${c.name ?? c.role ?? "color"} ${c.hex}`).join(", ")}`);
    const t = kit.typography;
    if (t?.heading || t?.body) lines.push(`Typography: headings ${t.heading?.family ?? "—"}, body ${t.body?.family ?? "—"}${t.arabic ? `, Arabic ${t.arabic.family}` : ""}`);
    if (kit.voice?.personality?.length) lines.push(`Personality: ${kit.voice.personality.join(", ")}`);
    if (kit.voice?.do?.length) lines.push(`Voice — do: ${kit.voice.do.join("; ")}`);
    if (kit.voice?.dont?.length) lines.push(`Voice — avoid: ${kit.voice.dont.join("; ")}`);
    if (kit.logo_asset_id) lines.push("Logo: the client's own uploaded logo (keep creative directions compatible with it)");
  }
  const products = assets.filter((a) => a.kind === "product" && a.caption).slice(0, 8);
  if (products.length) lines.push(`Product photos uploaded: ${products.map((a) => a.caption).join("; ")}`);
  return lines.length ? `Brand profile & identity (stay consistent with this):\n${lines.map((l) => `- ${l}`).join("\n")}` : "";
}

/** Brand assets for a client with signed URLs (RLS limits what can be read). */
export async function listBrandAssets(supabase: SupabaseClient, clientId: string): Promise<BrandAsset[]> {
  const { data } = await supabase
    .from("brand_assets")
    .select("id, kind, storage_path, file_name, mime_type, caption, created_at")
    .eq("client_id", clientId)
    .order("created_at", { ascending: false })
    .limit(40);
  const rows = (data ?? []) as Omit<BrandAsset, "url">[];
  if (!rows.length) return [];
  const { data: signed } = await supabase.storage.from(BRAND_BUCKET).createSignedUrls(rows.map((r) => r.storage_path), SIGNED_URL_TTL);
  const urls = new Map((signed ?? []).map((x) => [x.path, x.signedUrl]));
  return rows.map((r) => ({ ...r, url: urls.get(r.storage_path) ?? null }));
}

/** How to show a kit's logo: uploaded file first, then AI SVG, then a link. */
export async function resolveKitLogo(supabase: SupabaseClient, kit: Pick<BrandKit, "logo_asset_id" | "logo_svg" | "logo_url"> | null) {
  if (!kit) return { svg: null as string | null, url: null as string | null };
  if (kit.logo_asset_id) {
    const { data: asset } = await supabase.from("brand_assets").select("storage_path").eq("id", kit.logo_asset_id).maybeSingle();
    if (asset) {
      const { data } = await supabase.storage.from(BRAND_BUCKET).createSignedUrl(asset.storage_path, SIGNED_URL_TTL);
      if (data?.signedUrl) return { svg: null, url: data.signedUrl };
    }
  }
  return { svg: kit.logo_svg, url: kit.logo_url };
}
