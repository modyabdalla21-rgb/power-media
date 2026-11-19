import "server-only";
import { cache } from "react";
import type { SupabaseClient } from "@supabase/supabase-js";
import { isPlanTier, planLimits, type PlanTier } from "@/config/plans";
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
  is_active: boolean;
  created_at: string;
};

const WORKSPACE_COLUMNS = "id, name, industry, market, audience, tone, dialect, website, brand_notes, plan_tier, source, onboarded_at";
export const BRAND_KIT_COLUMNS = "id, client_id, name, source, tagline, positioning, palette, typography, voice, logo_svg, logo_url, logo_prompt, notes, is_active, created_at";

/**
 * The signed-in client's workspace, created on first access if missing
 * (security-definer RPC). Null for staff or when Supabase isn't set up.
 */
export const getClientWorkspace = cache(async (): Promise<Workspace | null> => {
  const profile = await getCurrentProfile();
  const supabase = await createSupabaseServerClient();
  if (!profile || !supabase || profile.role !== "client") return null;

  const { data: id, error } = await supabase.rpc("ensure_client_workspace");
  if (error) console.error("[workspace] ensure failed", error.code, error.message);
  let query = supabase.from("clients").select(WORKSPACE_COLUMNS).eq("portal_user_id", profile.id);
  if (typeof id === "string") query = query.eq("id", id);
  const { data } = await query.order("created_at").limit(1).maybeSingle();
  if (!data) return null;
  return { ...(data as Workspace), plan_tier: isPlanTier(data.plan_tier) ? data.plan_tier : "free" };
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
  const [ai, identity] = await Promise.all([base().in("tool", ["adStudio", "mediaPlanner"]), base().eq("tool", "brandIdentity")]);
  const limits = planLimits[workspace.plan_tier];
  return {
    tier: workspace.plan_tier,
    ai: { used: ai.count ?? 0, limit: limits.aiPerMonth },
    identity: { used: identity.count ?? 0, limit: limits.identityPerMonth },
    resetsAt: nextMonthStartIso(),
  };
}

/** Text block describing the brand for AI prompts (profile + active kit). */
export function brandContextText(ws: Pick<Workspace, "name" | "industry" | "market" | "audience" | "tone" | "dialect" | "website" | "brand_notes"> | null, kit: BrandKit | null) {
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
  }
  return lines.length ? `Brand profile & identity (stay consistent with this):\n${lines.map((l) => `- ${l}`).join("\n")}` : "";
}
