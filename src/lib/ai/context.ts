import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";

type Rec = Record<string, unknown>;
const v = (x: unknown) => (x === null || x === undefined || x === "" ? "—" : String(x));

/**
 * Factual context from the dashboard for prompts. Uses the caller's own
 * Supabase client, so Row Level Security limits what can be read.
 */
export async function loadContext(
  supabase: SupabaseClient,
  opts: { clientId?: string; projectId?: string; periodStart?: string; periodEnd?: string; detailed: boolean },
): Promise<{ text: string; clientName?: string; projectName?: string; projectClientId?: string }> {
  const parts: string[] = [];
  let clientName: string | undefined;
  let projectName: string | undefined;
  let projectClientId: string | undefined;

  if (opts.clientId) {
    const { data: c } = await supabase
      .from("clients")
      .select("name, industry, market, status, retainer_amount, currency, notes")
      .eq("id", opts.clientId)
      .maybeSingle();
    if (c) {
      clientName = c.name;
      parts.push(
        `Client: ${c.name} | industry: ${v(c.industry)} | market: ${v(c.market)} | status: ${v(c.status)}` +
          (opts.detailed && c.retainer_amount ? ` | monthly retainer: ${c.retainer_amount} ${c.currency}` : "") +
          (c.notes ? `\nClient notes: ${String(c.notes).slice(0, 1500)}` : ""),
      );
    }
  }

  if (opts.projectId) {
    const { data: p } = await supabase.from("projects").select("name, client_id, stage, status, progress, due_date, description").eq("id", opts.projectId).maybeSingle();
    if (p) {
      projectName = p.name;
      projectClientId = p.client_id;
      parts.push(`Project: ${p.name} | stage: ${p.stage} | status: ${p.status} | progress: ${p.progress}% | due: ${v(p.due_date)}${p.description ? `\nProject description: ${String(p.description).slice(0, 1500)}` : ""}`);
    }
  }

  if (opts.detailed && opts.clientId) {
    let projects = supabase.from("projects").select("id, name, stage, status, progress, due_date").eq("client_id", opts.clientId).limit(25);
    if (opts.projectId) projects = projects.eq("id", opts.projectId);
    const campaigns = supabase
      .from("campaigns")
      .select("name, platform, objective, budget, currency, status, starts_on, ends_on")
      .eq("client_id", opts.clientId)
      .order("starts_on", { ascending: false, nullsFirst: false })
      .limit(100);

    const [{ data: ps }, { data: allCampaigns }] = await Promise.all([projects, campaigns]);
    // Keep campaigns overlapping the report period (ISO dates compare as strings).
    const cs = (allCampaigns ?? []).filter((c: Rec) => {
      const start = c.starts_on as string | null, end = c.ends_on as string | null;
      return (!opts.periodEnd || !start || start <= opts.periodEnd) && (!opts.periodStart || !end || end >= opts.periodStart);
    }).slice(0, 40);
    const projectIds = (ps ?? []).map((p: Rec) => p.id as string);
    const { data: ts } = projectIds.length
      ? await supabase.from("tasks").select("title, status, project_id").in("project_id", projectIds).eq("status", "done").limit(60)
      : { data: [] as Rec[] };

    if (ps?.length) {
      parts.push(
        "Projects:\n" + ps.map((p: Rec) => `- ${p.name} (stage: ${p.stage}, status: ${p.status}, progress: ${p.progress}%, due: ${v(p.due_date)})`).join("\n"),
      );
    }
    if (cs?.length) {
      parts.push(
        "Campaigns in or overlapping the period:\n" +
          cs.map((c: Rec) => `- ${c.name} | ${c.platform} | objective: ${v(c.objective)} | budget: ${c.budget ? `${c.budget} ${c.currency}` : "—"} | status: ${c.status} | ${v(c.starts_on)} → ${v(c.ends_on)}`).join("\n"),
      );
    }
    if (ts?.length) parts.push("Completed tasks:\n" + ts.map((t: Rec) => `- ${t.title}`).join("\n"));
  }

  return { text: parts.join("\n\n"), clientName, projectName, projectClientId };
}
