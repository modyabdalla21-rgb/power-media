/**
 * Plan pricing. `null` = not published (renders "Custom quote" / "Early access").
 * Set real numbers only after they are approved by the business.
 */
export const agencyPlanPricing: Record<string, { monthlyUsd: number | null; featured?: boolean }> = {
  launch: { monthlyUsd: null },
  growth: { monthlyUsd: null, featured: true },
  dominate: { monthlyUsd: null },
};

export const saasPlanPricing: Record<string, { monthlyUsd: number | null; featured?: boolean }> = {
  starter: { monthlyUsd: null },
  pro: { monthlyUsd: null, featured: true },
  agency: { monthlyUsd: null },
};
