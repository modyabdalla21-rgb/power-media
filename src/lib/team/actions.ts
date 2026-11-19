"use server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { isLocale } from "@/i18n/config";
import type { CrudState } from "@/lib/crud/actions";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSupabaseServerClient, getCurrentProfile, getOrigin } from "@/lib/supabase/server";

export type InviteState =
  | { ok?: "sent" | "savedNoEmail"; error?: "forbidden" | "invalid" | "exists" | "dbError" | "notConfigured" }
  | undefined;

const roleSchema = z.enum(["admin", "team", "client"]);
const UUID = z.uuid();

async function requireAdmin() {
  const profile = await getCurrentProfile();
  return profile?.role === "admin" ? profile : null;
}

/**
 * Invite a member: records the intended role in `team_invites` (the signup
 * trigger applies it), then sends a Supabase invite email when the secret
 * key is configured.
 */
export async function inviteMember(_prev: InviteState, fd: FormData): Promise<InviteState> {
  const admin = await requireAdmin();
  if (!admin) return { error: "forbidden" };
  const parsed = z.object({ email: z.email().max(200), role: roleSchema }).safeParse({ email: fd.get("email"), role: fd.get("role") });
  if (!parsed.success) return { error: "invalid" };
  const email = parsed.data.email.toLowerCase();
  const rawLocale = String(fd.get("locale") ?? "");
  const locale = isLocale(rawLocale) ? rawLocale : "en";

  const supabase = await createSupabaseServerClient();
  if (!supabase) return { error: "notConfigured" };

  const { data: existing } = await supabase.from("profiles").select("id").eq("email", email).maybeSingle();
  if (existing) return { error: "exists" };

  // Replace any earlier pending invite for the same email.
  await supabase.from("team_invites").delete().eq("email", email).is("accepted_at", null);
  const { error } = await supabase.from("team_invites").insert({ email, role: parsed.data.role, invited_by: admin.id });
  if (error) {
    console.error("[team] invite insert failed", error.code, error.message);
    return { error: "dbError" };
  }

  const service = createSupabaseAdminClient();
  let result: InviteState = { ok: "savedNoEmail" };
  if (service) {
    const origin = await getOrigin();
    const { error: inviteError } = await service.auth.admin.inviteUserByEmail(email, {
      redirectTo: `${origin}/auth/callback?next=/${locale}/reset-password`,
      data: { locale },
    });
    if (!inviteError) result = { ok: "sent" };
    else {
      console.error("[team] invite email failed", inviteError.code, inviteError.message);
      result = inviteError.code === "email_exists" ? { error: "exists" } : { ok: "savedNoEmail" };
    }
  }
  revalidatePath("/[locale]/dashboard/team", "page");
  return result;
}

export async function updateMemberRole(_prev: CrudState, fd: FormData): Promise<CrudState> {
  const admin = await requireAdmin();
  if (!admin) return { error: "forbidden" };
  const parsed = z.object({ _id: UUID, role: roleSchema }).safeParse({ _id: fd.get("_id"), role: fd.get("role") });
  if (!parsed.success || parsed.data._id === admin.id) return { error: "invalid" };

  const supabase = await createSupabaseServerClient();
  if (!supabase) return { error: "notConfigured" };
  const { error, count } = await supabase
    .from("profiles")
    .update({ role: parsed.data.role }, { count: "exact" })
    .eq("id", parsed.data._id);
  if (error || count === 0) return { error: error?.code === "42501" || count === 0 ? "forbidden" : "dbError" };
  revalidatePath("/[locale]/dashboard", "layout");
  return { ok: true };
}

export async function revokeInvite(_prev: CrudState, fd: FormData): Promise<CrudState> {
  if (!(await requireAdmin())) return { error: "forbidden" };
  const id = UUID.safeParse(fd.get("_id"));
  if (!id.success) return { error: "invalid" };
  const supabase = await createSupabaseServerClient();
  if (!supabase) return { error: "notConfigured" };
  const { error } = await supabase.from("team_invites").delete().eq("id", id.data);
  if (error) return { error: "dbError" };
  revalidatePath("/[locale]/dashboard/team", "page");
  return { ok: true };
}

/** Deletes the auth user (profile cascades). Requires the secret key. */
export async function removeMember(_prev: CrudState, fd: FormData): Promise<CrudState> {
  const admin = await requireAdmin();
  if (!admin) return { error: "forbidden" };
  const id = UUID.safeParse(fd.get("_id"));
  if (!id.success || id.data === admin.id) return { error: "invalid" };
  const service = createSupabaseAdminClient();
  if (!service) return { error: "notConfigured" };
  const { error } = await service.auth.admin.deleteUser(id.data);
  if (error) {
    console.error("[team] remove failed", error.code, error.message);
    return { error: "dbError" };
  }
  revalidatePath("/[locale]/dashboard", "layout");
  return { ok: true };
}

export type ProfileState = { ok?: boolean; error?: "invalid" | "dbError" | "notConfigured" } | undefined;

export async function updateOwnProfile(_prev: ProfileState, fd: FormData): Promise<ProfileState> {
  const profile = await getCurrentProfile();
  const supabase = await createSupabaseServerClient();
  if (!profile || !supabase) return { error: "notConfigured" };
  const parsed = z
    .object({ full_name: z.string().trim().min(1).max(120), locale: z.enum(["en", "ar", "eg"]) })
    .safeParse({ full_name: fd.get("full_name"), locale: fd.get("locale") });
  if (!parsed.success) return { error: "invalid" };
  const { error } = await supabase.from("profiles").update(parsed.data).eq("id", profile.id);
  if (error) return { error: "dbError" };
  revalidatePath("/[locale]/dashboard", "layout");
  return { ok: true };
}
