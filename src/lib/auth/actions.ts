"use server";
import { redirect } from "next/navigation";
import { z } from "zod";
import { isLocale } from "@/i18n/config";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export type SignInState = { error?: "invalid" | "notConfigured" } | undefined;

const schema = z.object({
  email: z.email(),
  password: z.string().min(6).max(200),
  locale: z.string(),
  next: z.string().optional(),
});

export async function signIn(_prev: SignInState, formData: FormData): Promise<SignInState> {
  const parsed = schema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: "invalid" };
  const { email, password, next } = parsed.data;
  const locale = isLocale(parsed.data.locale) ? parsed.data.locale : "en";

  const supabase = await createSupabaseServerClient();
  if (!supabase) return { error: "notConfigured" };

  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) return { error: "invalid" };

  // Only allow same-app relative redirects.
  const safeNext = next && next.startsWith(`/${locale}/dashboard`) ? next : `/${locale}/dashboard`;
  redirect(safeNext);
}

export async function signOut(formData: FormData) {
  const locale = String(formData.get("locale") ?? "en");
  const supabase = await createSupabaseServerClient();
  await supabase?.auth.signOut();
  redirect(`/${isLocale(locale) ? locale : "en"}/login`);
}
