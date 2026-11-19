/**
 * Central env access. Public values (NEXT_PUBLIC_*) may be read anywhere;
 * server values must only be read from server code (see lib/env.server.ts).
 *
 * Supabase keys are treated as opaque strings: both the new
 * `sb_publishable_…` / `sb_secret_…` keys and legacy JWT keys work.
 * Each process.env access is written out literally so Next can inline it.
 */
export const publicEnv = {
  siteUrl: (process.env.NEXT_PUBLIC_SITE_URL ?? "").replace(/\/$/, ""),
  supabaseUrl: (process.env.NEXT_PUBLIC_SUPABASE_URL ?? "").trim().replace(/\/$/, ""),
  supabaseAnonKey: (process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? "").trim(),
};

/** Absolute base URL for metadata (falls back to Vercel's production domain). */
export const metadataBaseUrl =
  publicEnv.siteUrl ||
  (process.env.VERCEL_PROJECT_PRODUCTION_URL ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}` : "http://localhost:3000");

export const isSupabaseConfigured = Boolean(publicEnv.supabaseUrl && publicEnv.supabaseAnonKey);

/** Dashboard preview without auth — development only, never in production. */
export const isDashboardPreview =
  !isSupabaseConfigured &&
  process.env.NODE_ENV !== "production" &&
  process.env.DASHBOARD_PREVIEW_MODE !== "false";
