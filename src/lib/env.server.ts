import "server-only";

/** Server-only secrets. Importing this from a client component fails the build. */
export const serverEnv = {
  /** Accepts the new `sb_secret_…` key or a legacy service_role JWT. */
  supabaseServiceRoleKey: (process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_SECRET_KEY ?? "").trim(),
  /** Optional: "gemini" | "anthropic". Empty = auto (Gemini first). */
  aiProvider: (["gemini", "anthropic"].includes(process.env.AI_PROVIDER ?? "") ? process.env.AI_PROVIDER : "") as "gemini" | "anthropic" | "",
  /** Opaque — `AIza…` and `AQ.…` key formats are both accepted. */
  geminiApiKey: (process.env.GEMINI_API_KEY ?? process.env.GOOGLE_API_KEY ?? "").trim(),
  geminiModel: (process.env.GEMINI_MODEL ?? "").trim(),
  anthropicApiKey: (process.env.ANTHROPIC_API_KEY ?? "").trim(),
  anthropicModel: (process.env.ANTHROPIC_MODEL ?? "").trim(),
  /** Successful generations allowed per user per hour (protects free-tier quota). */
  aiHourlyLimit: Math.max(1, Number(process.env.AI_HOURLY_LIMIT) || 30),
  stripeSecretKey: process.env.STRIPE_SECRET_KEY ?? "",
  resendApiKey: process.env.RESEND_API_KEY ?? "",
  contactInboxEmail: process.env.CONTACT_INBOX_EMAIL ?? "",
};
