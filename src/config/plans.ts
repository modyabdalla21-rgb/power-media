/**
 * Client plan tiers. Limits are enforced server-side before any AI call
 * (see lib/client/workspace.ts). No payment gateway yet — upgrades are
 * requested and then applied by the agency (Clients → Plan).
 */
export const PLAN_TIERS = ["free", "growth", "pro"] as const;
export type PlanTier = (typeof PLAN_TIERS)[number];

export const planLimits: Record<PlanTier, { aiPerMonth: number; identityPerMonth: number }> = {
  free: { aiPerMonth: 10, identityPerMonth: 3 },
  growth: { aiPerMonth: 100, identityPerMonth: 20 },
  pro: { aiPerMonth: 500, identityPerMonth: 100 },
};

export const isPlanTier = (v: unknown): v is PlanTier => typeof v === "string" && (PLAN_TIERS as readonly string[]).includes(v);
