import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { ModuleDef, RelationSource } from "@/config/modules";

export const PAGE_SIZE = 20;
export type Row = Record<string, unknown> & { id: string };
export type Option = { value: string; label: string };

/** Strip characters that have meaning in PostgREST filter syntax. */
const sanitize = (q: string) => q.replace(/[,()"'\\%*:]/g, " ").trim().slice(0, 80);

export async function listRecords(
  supabase: SupabaseClient,
  def: ModuleDef,
  { q, status, page }: { q?: string; status?: string; page: number },
) {
  let query = supabase
    .from(def.table)
    .select(def.select, { count: "exact" })
    .order(def.order.column, { ascending: def.order.ascending, nullsFirst: false })
    .order("created_at", { ascending: false })
    .range((page - 1) * PAGE_SIZE, page * PAGE_SIZE - 1);

  const term = q ? sanitize(q) : "";
  if (term) query = query.or(def.search.map((c) => `${c}.ilike.%${term}%`).join(","));
  if (status && def.filter.options.includes(status as never)) query = query.eq(def.filter.column, status);

  const { data, error, count } = await query;
  return { rows: (data ?? []) as unknown as Row[], error, count: count ?? 0 };
}

const personLabel = (p: { full_name: string | null; email: string }) => (p.full_name ? `${p.full_name} · ${p.email}` : p.email);

/** Load <select> options for relation fields (only the sources a module needs). */
export async function loadRelationOptions(supabase: SupabaseClient, sources: RelationSource[]) {
  const out: Partial<Record<RelationSource, Option[]>> = {};
  await Promise.all(
    [...new Set(sources)].map(async (source) => {
      if (source === "clients") {
        const { data } = await supabase.from("clients").select("id, name").order("name").limit(500);
        out.clients = (data ?? []).map((r) => ({ value: r.id, label: r.name }));
      } else if (source === "projects") {
        const { data } = await supabase.from("projects").select("id, name, client:clients(name)").order("name").limit(500);
        out.projects = (data ?? []).map((r) => {
          const client = (r.client as unknown as { name: string } | null)?.name;
          return { value: r.id, label: client ? `${r.name} — ${client}` : r.name };
        });
      } else {
        const roles = source === "staff" ? ["admin", "team"] : ["client"];
        const { data } = await supabase.from("profiles").select("id, full_name, email").in("role", roles).order("full_name").limit(500);
        out[source] = (data ?? []).map((p) => ({ value: p.id, label: personLabel(p) }));
      }
    }),
  );
  return out;
}
