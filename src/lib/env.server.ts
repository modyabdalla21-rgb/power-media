import "server-only";

/** Server-only secrets. Importing this from a client component fails the build. */
export const serverEnv = {
  /** Accepts the new `sb_secret_…` key or a legacy service_role JWT. */
  supabaseServiceRoleKey: (process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_SECRET_KEY ?? "").trim(),
  aiProvider: (process.env.AI_PROVIDER ?? "anthropic") as "anthropic" | "openai",
  anthropicApiKey: process.env.ANTHROPIC_API_KEY ?? "",
  openaiApiKey: process.env.OPENAI_API_KEY ?? "",
  stripeSecretKey: process.env.STRIPE_SECRET_KEY ?? "",
  resendApiKey: process.env.RESEND_API_KEY ?? "",
  contactInboxEmail: process.env.CONTACT_INBOX_EMAIL ?? "",
};
