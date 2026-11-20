import "server-only";
import { cache } from "react";
import { cookies, headers } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import { isSupabaseConfigured, publicEnv } from "@/lib/env";

export type Role = "admin" | "team" | "client";
export type Profile = { id: string; email: string; full_name: string | null; role: Role; locale: "en" | "ar" | "eg" };

/** Supabase client for Server Components, Server Actions and Route Handlers. */
export async function createSupabaseServerClient() {
  if (!isSupabaseConfigured) return null;
  const cookieStore = await cookies();
  return createServerClient(publicEnv.supabaseUrl, publicEnv.supabaseAnonKey, {
    cookies: {
      getAll: () => cookieStore.getAll(),
      setAll: (toSet) => {
        try {
          toSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
        } catch {
          // Called from a Server Component — the proxy refreshes the session instead.
        }
      },
    },
  });
}

export type SessionUser = { id: string; email: string | null };

/**
 * Authenticated user, memoised per request. `getClaims()` verifies the
 * session JWT — locally with asymmetric signing keys (no Auth round trip on
 * every navigation), or via Supabase Auth for legacy symmetric keys — so it's
 * as trustworthy as `getUser()` but much faster.
 */
export const getCurrentUser = cache(async (): Promise<SessionUser | null> => {
  const supabase = await createSupabaseServerClient();
  if (!supabase) return null;
  const { data, error } = await supabase.auth.getClaims();
  const claims = data?.claims;
  if (error || !claims?.sub) return null;
  return { id: claims.sub, email: typeof claims.email === "string" ? claims.email : null };
});

/** Current user's profile incl. role, memoised per request. */
export const getCurrentProfile = cache(async (): Promise<Profile | null> => {
  const user = await getCurrentUser();
  const supabase = await createSupabaseServerClient();
  if (!user || !supabase) return null;
  const { data } = await supabase.from("profiles").select("id, email, full_name, role, locale").eq("id", user.id).maybeSingle();
  if (data) return data as Profile;
  // Profile row missing (e.g. schema not yet applied) — least privilege.
  return { id: user.id, email: user.email ?? "", full_name: null, role: "client", locale: "en" };
});

/**
 * Absolute origin for auth email links. Prefers NEXT_PUBLIC_SITE_URL, then
 * the request's forwarded host (works on Vercel previews and production).
 */
export async function getOrigin() {
  if (publicEnv.siteUrl) return publicEnv.siteUrl;
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "localhost:3000";
  const proto = h.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  return `${proto}://${host}`;
}
