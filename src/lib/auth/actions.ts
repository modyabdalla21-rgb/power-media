"use server";
import { redirect } from "next/navigation";
import { z } from "zod";
import { isLocale, type Locale } from "@/i18n/config";
import { createSupabaseServerClient, getOrigin } from "@/lib/supabase/server";
import { safeNextPath } from "./redirect";

/** Keys map 1:1 to strings in dict.auth. */
export type AuthError =
  | "invalid" | "emailNotConfirmed" | "notConfigured" | "rateLimited" | "emailTaken"
  | "weakPassword" | "invalidEmail" | "mismatch" | "resetNoSession" | "genericError";
export type AuthState = { error?: AuthError; ok?: boolean } | undefined;

const localeOf = (fd: FormData): Locale => {
  const l = String(fd.get("locale") ?? "");
  return isLocale(l) ? l : "en";
};

function mapError(code: string | undefined, status?: number): AuthError {
  switch (code) {
    case "invalid_credentials": return "invalid";
    case "email_not_confirmed": return "emailNotConfirmed";
    case "user_already_exists":
    case "email_exists": return "emailTaken";
    case "weak_password": return "weakPassword";
    case "email_address_invalid":
    case "validation_failed": return "invalidEmail";
    case "over_request_rate_limit":
    case "over_email_send_rate_limit": return "rateLimited";
  }
  return status === 429 ? "rateLimited" : "genericError";
}

const email = z.email().max(200);
const password = z.string().min(8).max(200);

export async function signIn(_prev: AuthState, fd: FormData): Promise<AuthState> {
  const locale = localeOf(fd);
  const parsed = z.object({ email, password: z.string().min(1).max(200) }).safeParse(Object.fromEntries(fd));
  if (!parsed.success) return { error: "invalid" };

  const supabase = await createSupabaseServerClient();
  if (!supabase) return { error: "notConfigured" };

  const { error } = await supabase.auth.signInWithPassword(parsed.data);
  if (error) return { error: mapError(error.code, error.status) };
  redirect(safeNextPath(String(fd.get("next") ?? ""), locale));
}

export async function signUp(_prev: AuthState, fd: FormData): Promise<AuthState> {
  const locale = localeOf(fd);
  const parsed = z
    .object({ fullName: z.string().trim().min(2).max(120), email, password })
    .safeParse(Object.fromEntries(fd));
  if (!parsed.success) {
    const field = parsed.error.issues[0]?.path[0];
    return { error: field === "password" ? "weakPassword" : field === "email" ? "invalidEmail" : "genericError" };
  }

  const supabase = await createSupabaseServerClient();
  if (!supabase) return { error: "notConfigured" };

  const origin = await getOrigin();
  const { data, error } = await supabase.auth.signUp({
    email: parsed.data.email,
    password: parsed.data.password,
    options: {
      emailRedirectTo: `${origin}/auth/callback?next=/${locale}/dashboard`,
      // Only display data — the role is assigned by the database, never from here.
      data: { full_name: parsed.data.fullName, locale },
    },
  });
  if (error) return { error: mapError(error.code, error.status) };
  // With email confirmation on, an existing address returns a user with no identities.
  if (data.user && data.user.identities?.length === 0) return { error: "emailTaken" };
  if (data.session) redirect(`/${locale}/dashboard`);
  return { ok: true };
}

export async function requestPasswordReset(_prev: AuthState, fd: FormData): Promise<AuthState> {
  const locale = localeOf(fd);
  const parsed = email.safeParse(fd.get("email"));
  if (!parsed.success) return { error: "invalidEmail" };

  const supabase = await createSupabaseServerClient();
  if (!supabase) return { error: "notConfigured" };

  const origin = await getOrigin();
  const { error } = await supabase.auth.resetPasswordForEmail(parsed.data, {
    redirectTo: `${origin}/auth/callback?next=/${locale}/reset-password`,
  });
  // Don't reveal whether the account exists — only surface rate limiting.
  if (error && mapError(error.code, error.status) === "rateLimited") return { error: "rateLimited" };
  return { ok: true };
}

export async function updatePassword(_prev: AuthState, fd: FormData): Promise<AuthState> {
  const locale = localeOf(fd);
  const pw = password.safeParse(fd.get("password"));
  if (!pw.success) return { error: "weakPassword" };
  if (fd.get("password") !== fd.get("confirm")) return { error: "mismatch" };

  const supabase = await createSupabaseServerClient();
  if (!supabase) return { error: "notConfigured" };
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "resetNoSession" };

  const { error } = await supabase.auth.updateUser({ password: pw.data });
  if (error) return { error: error.code === "same_password" ? "weakPassword" : mapError(error.code, error.status) };
  redirect(`/${locale}/dashboard?notice=password`);
}

export async function signOut(fd: FormData) {
  const locale = localeOf(fd);
  const supabase = await createSupabaseServerClient();
  await supabase?.auth.signOut();
  redirect(`/${locale}/login`);
}
