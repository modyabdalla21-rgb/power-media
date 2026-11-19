"use server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createSupabaseServerClient, getCurrentProfile } from "@/lib/supabase/server";

export type DecisionState = { ok?: boolean; error?: "invalid" | "forbidden" | "dbError" } | undefined;

/** Record a decision on a project (RLS: staff, or the project's own client). */
export async function decideProject(_prev: DecisionState, fd: FormData): Promise<DecisionState> {
  const supabase = await createSupabaseServerClient();
  const profile = await getCurrentProfile();
  if (!supabase || !profile) return { error: "forbidden" };
  const parsed = z
    .object({
      project_id: z.uuid(),
      decision_status: z.enum(["pending", "approved", "changes_requested", "on_hold"]),
      decision_notes: z.string().trim().max(4000).transform((v) => v || null),
    })
    .safeParse({ project_id: fd.get("project_id"), decision_status: fd.get("decision_status"), decision_notes: String(fd.get("decision_notes") ?? "") });
  if (!parsed.success) return { error: "invalid" };
  const { project_id, ...update } = parsed.data;
  const { error, count } = await supabase.from("projects").update(update, { count: "exact" }).eq("id", project_id);
  if (error) return { error: error.code === "42501" ? "forbidden" : "dbError" };
  if (count === 0) return { error: "forbidden" };
  revalidatePath("/[locale]/dashboard", "layout");
  return { ok: true };
}
