"use server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import type { BrandAnalysis } from "@/lib/ai/structured";
import { getClientWorkspace } from "@/lib/client/workspace";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export type HubResult = { ok: true; count?: number } | { ok: false; error: "invalid" | "forbidden" | "dbError" };

const CATEGORY = z.enum(["content", "video", "ads", "social", "brand", "website", "research", "other"]);
const STATUS = z.enum(["todo", "in_progress", "done"]);

/** Brand hub writes always target the signed-in client's own workspace (RLS enforces it too). */
async function ctx() {
  const supabase = await createSupabaseServerClient();
  const workspace = await getClientWorkspace();
  return supabase && workspace ? { supabase, workspace } : null;
}
const done = (r: HubResult): HubResult => {
  if (r.ok) revalidatePath("/[locale]/dashboard/brand", "page");
  return r;
};

export async function addTask(input: { title: string; details?: string; category?: string; priority?: string; dueDate?: string; planId?: string }): Promise<HubResult> {
  const c = await ctx();
  if (!c) return { ok: false, error: "forbidden" };
  const parsed = z
    .object({
      title: z.string().trim().min(1).max(200),
      details: z.string().trim().max(2000).optional(),
      category: CATEGORY.default("other"),
      priority: z.enum(["low", "medium", "high"]).default("medium"),
      dueDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().or(z.literal("")),
      planId: z.uuid().optional().or(z.literal("")),
    })
    .safeParse(input);
  if (!parsed.success) return { ok: false, error: "invalid" };
  const v = parsed.data;
  const { error } = await c.supabase.from("brand_tasks").insert({
    client_id: c.workspace.id,
    title: v.title,
    details: v.details || null,
    category: v.category,
    priority: v.priority,
    due_date: v.dueDate || null,
    plan_id: v.planId || null,
    source: "manual",
  });
  return done(error ? { ok: false, error: "dbError" } : { ok: true });
}

/** Turn next steps from a saved AI analysis into tasks (indices into next_steps). */
export async function addStepsAsTasks(generationId: string, indices: number[]): Promise<HubResult> {
  const c = await ctx();
  if (!c || !z.uuid().safeParse(generationId).success) return { ok: false, error: "invalid" };
  const { data: gen } = await c.supabase.from("ai_generations").select("tool, data, client_id").eq("id", generationId).maybeSingle();
  const analysis = gen?.data as BrandAnalysis | null;
  if (!gen || !["brandAnalysis", "growthDiagnosis"].includes(gen.tool) || gen.client_id !== c.workspace.id || !analysis?.next_steps) return { ok: false, error: "invalid" };

  const steps = [...new Set(indices)].filter((i) => Number.isInteger(i) && i >= 0 && i < analysis.next_steps.length).map((i) => analysis.next_steps[i]);
  if (!steps.length) return { ok: false, error: "invalid" };

  // Skip steps already added (same title, still open or done).
  const { data: existing } = await c.supabase.from("brand_tasks").select("title").eq("client_id", c.workspace.id).in("title", steps.map((s) => s.title));
  const have = new Set((existing ?? []).map((t) => t.title));
  const rows = steps
    .filter((s) => !have.has(s.title))
    .map((s, i) => ({
      client_id: c.workspace.id,
      title: s.title,
      details: s.why || null,
      category: s.category,
      priority: s.priority,
      tool_hint: s.tool,
      source: "ai",
      sort_order: i,
    }));
  if (!rows.length) return { ok: true, count: 0 };
  const { error } = await c.supabase.from("brand_tasks").insert(rows);
  return done(error ? { ok: false, error: "dbError" } : { ok: true, count: rows.length });
}

export async function setTaskStatus(taskId: string, status: string): Promise<HubResult> {
  const c = await ctx();
  const id = z.uuid().safeParse(taskId);
  const st = STATUS.safeParse(status);
  if (!c || !id.success || !st.success) return { ok: false, error: "invalid" };
  const { error, count } = await c.supabase.from("brand_tasks").update({ status: st.data }, { count: "exact" }).eq("id", id.data).eq("client_id", c.workspace.id);
  return done(error ? { ok: false, error: "dbError" } : count ? { ok: true } : { ok: false, error: "forbidden" });
}

export async function deleteTask(taskId: string): Promise<HubResult> {
  const c = await ctx();
  const id = z.uuid().safeParse(taskId);
  if (!c || !id.success) return { ok: false, error: "invalid" };
  const { error, count } = await c.supabase.from("brand_tasks").delete({ count: "exact" }).eq("id", id.data).eq("client_id", c.workspace.id);
  return done(error ? { ok: false, error: "dbError" } : count ? { ok: true } : { ok: false, error: "forbidden" });
}

export async function setPlanStatus(planId: string, status: string): Promise<HubResult> {
  const c = await ctx();
  const id = z.uuid().safeParse(planId);
  const st = z.enum(["active", "completed", "archived"]).safeParse(status);
  if (!c || !id.success || !st.success) return { ok: false, error: "invalid" };
  const { error, count } = await c.supabase.from("brand_plans").update({ status: st.data }, { count: "exact" }).eq("id", id.data).eq("client_id", c.workspace.id);
  return done(error ? { ok: false, error: "dbError" } : count ? { ok: true } : { ok: false, error: "forbidden" });
}

/** Save the brand's Smart Discovery answers (validated; RLS limits to own workspace). */
export async function saveDiscovery(input: unknown): Promise<HubResult> {
  const c = await ctx();
  if (!c) return { ok: false, error: "forbidden" };
  const { discoverySchema } = await import("@/lib/client/discovery");
  const parsed = discoverySchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "invalid" };
  const { error } = await c.supabase.from("clients").update({ discovery: parsed.data, discovery_updated_at: new Date().toISOString() }).eq("id", c.workspace.id);
  if (!error) revalidatePath("/[locale]/dashboard", "layout");
  return error ? { ok: false, error: "dbError" } : { ok: true };
}
