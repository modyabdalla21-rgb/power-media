import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Factual snapshot of a brand's current state for the analyser / planner:
 * identity, assets, plans, task progress, recent AI outputs and projects.
 * Uses the caller's client, so RLS scopes it to what they may see.
 */
export async function loadBrandState(supabase: SupabaseClient, clientId: string) {
  const [kit, assets, plans, tasks, outputs, projects] = await Promise.all([
    supabase.from("brand_kits").select("name, source, logo_asset_id, logo_svg, palette").eq("client_id", clientId).eq("is_active", true).maybeSingle(),
    supabase.from("brand_assets").select("kind").eq("client_id", clientId),
    supabase.from("brand_plans").select("title, status, horizon, created_at").eq("client_id", clientId).order("created_at", { ascending: false }).limit(5),
    supabase.from("brand_tasks").select("title, status, category").eq("client_id", clientId).order("created_at", { ascending: false }).limit(60),
    supabase.from("ai_generations").select("tool, title, created_at").eq("client_id", clientId).neq("tool", "brandAnalysis").order("created_at", { ascending: false }).limit(12),
    supabase.from("projects").select("name, status, decision_status").eq("client_id", clientId).order("created_at", { ascending: false }).limit(5),
  ]);

  const lines: string[] = [];
  const k = kit.data;
  lines.push(
    k
      ? `Brand identity: active kit "${k.name}" (${k.source === "ai" ? "AI-generated" : "existing/uploaded"}), logo: ${k.logo_asset_id ? "uploaded file" : k.logo_svg ? "AI concept" : "none"}, colors: ${Array.isArray(k.palette) ? k.palette.length : 0}`
      : "Brand identity: none yet (no logo, no palette)",
  );
  const logos = (assets.data ?? []).filter((a) => a.kind === "logo").length;
  const refs = (assets.data ?? []).filter((a) => a.kind === "reference").length;
  lines.push(`Uploaded assets: ${logos} logo file(s), ${refs} visual reference(s)`);

  if (plans.data?.length) lines.push(`Plans: ${plans.data.map((p) => `"${p.title}" (${p.status}, ${p.horizon})`).join("; ")}`);
  else lines.push("Plans: none yet");

  const t = tasks.data ?? [];
  const by = (s: string) => t.filter((x) => x.status === s);
  lines.push(`Tasks: ${by("done").length} done, ${by("in_progress").length} in progress, ${by("todo").length} to do`);
  const open = [...by("in_progress"), ...by("todo")].slice(0, 12);
  if (open.length) lines.push(`Open tasks (don't duplicate): ${open.map((x) => x.title).join("; ")}`);
  const done = by("done").slice(0, 10);
  if (done.length) lines.push(`Completed tasks: ${done.map((x) => x.title).join("; ")}`);

  if (outputs.data?.length) lines.push(`Recent AI outputs: ${outputs.data.map((o) => `${o.tool}: ${o.title}`).join("; ")}`);
  else lines.push("Recent AI outputs: none");
  if (projects.data?.length) lines.push(`Projects: ${projects.data.map((p) => `${p.name} (${p.status}, decision: ${p.decision_status})`).join("; ")}`);

  return `Current brand state (evidence):\n${lines.map((l) => `- ${l}`).join("\n")}`;
}
