/**
 * Central env access. Public values (NEXT_PUBLIC_*) may be read anywhere;
 * server values must only be read from server code (see lib/env.server.ts).
 */
export const publicEnv = {
  siteUrl: process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000",
  supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL ?? "",
  supabaseAnonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "",
};

export const isSupabaseConfigured = Boolean(publicEnv.supabaseUrl && publicEnv.supabaseAnonKey);

/** Dashboard preview without auth — development only, never in production. */
export const isDashboardPreview =
  !isSupabaseConfigured &&
  process.env.NODE_ENV !== "production" &&
  process.env.DASHBOARD_PREVIEW_MODE !== "false";
