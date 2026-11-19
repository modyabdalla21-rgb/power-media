"use server";
import { revalidatePath } from "next/cache";
import { can, modules, type ModuleKey } from "@/config/modules";
import { createSupabaseServerClient, getCurrentProfile } from "@/lib/supabase/server";
import { parseRecord, type FieldError } from "./parse";

export type CrudError = "forbidden" | "dbError" | "inUse" | "invalid" | "notConfigured";
export type CrudState = { ok?: boolean; error?: CrudError; fieldErrors?: Record<string, FieldError> } | undefined;

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function resolveModule(fd: FormData) {
  const key = String(fd.get("_module") ?? "");
  return key in modules ? modules[key as ModuleKey] : null;
}

function dbErrorKey(code?: string): CrudError {
  if (code === "42501") return "forbidden"; // RLS / insufficient privilege
  if (code === "23503") return "inUse"; // foreign key
  if (code === "23514" || code === "22P02" || code === "23502") return "invalid";
  return "dbError";
}

/** Create (no `_id`) or update (`_id` set) a record of any dashboard module. */
export async function saveRecord(_prev: CrudState, fd: FormData): Promise<CrudState> {
  const def = resolveModule(fd);
  if (!def) return { error: "invalid" };
  const id = String(fd.get("_id") ?? "");
  const mode = id ? "update" : "create";
  if (id && !UUID.test(id)) return { error: "invalid" };

  const profile = await getCurrentProfile();
  if (!can(profile?.role, mode === "create" ? def.roles.create : def.roles.update)) return { error: "forbidden" };

  const parsed = parseRecord(def.fields, fd, mode);
  if (!parsed.ok) return { fieldErrors: parsed.fieldErrors };

  const supabase = await createSupabaseServerClient();
  if (!supabase) return { error: "notConfigured" };

  const { error, count } =
    mode === "create"
      ? await supabase.from(def.table).insert(parsed.values)
      : await supabase.from(def.table).update(parsed.values, { count: "exact" }).eq("id", id);
  if (error) {
    console.error(`[crud] ${mode} ${def.table} failed`, error.code, error.message);
    return { error: dbErrorKey(error.code) };
  }
  if (mode === "update" && count === 0) return { error: "forbidden" };
  revalidatePath("/[locale]/dashboard", "layout");
  return { ok: true };
}

export async function deleteRecord(_prev: CrudState, fd: FormData): Promise<CrudState> {
  const def = resolveModule(fd);
  const id = String(fd.get("_id") ?? "");
  if (!def || !UUID.test(id)) return { error: "invalid" };

  const profile = await getCurrentProfile();
  if (!can(profile?.role, def.roles.delete)) return { error: "forbidden" };

  const supabase = await createSupabaseServerClient();
  if (!supabase) return { error: "notConfigured" };

  // `count` lets us detect RLS silently filtering the row out.
  const { error, count } = await supabase.from(def.table).delete({ count: "exact" }).eq("id", id);
  if (error) return { error: dbErrorKey(error.code) };
  if (count === 0) return { error: "forbidden" };
  revalidatePath("/[locale]/dashboard", "layout");
  return { ok: true };
}
