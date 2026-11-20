import { z } from "zod";

/** Smart Discovery: the questions behind the Growth Diagnosis (shared client/server). */
export const DISCOVERY = {
  channels: ["instagram", "tiktok", "facebook", "website", "whatsapp", "store", "marketplace"],
  stage: ["zero", "followers_no_sales", "some_sales", "scaling_ads"],
  budget: ["none", "starter", "growing", "serious", "scale"],
  bottleneck: ["awareness", "engagement", "conversions", "content", "time", "identity", "ad_costs", "other"],
  capacity: ["me", "team", "none"],
} as const;

export const discoverySchema = z.object({
  channels: z.array(z.enum(DISCOVERY.channels)).max(7).default([]),
  stage: z.enum(DISCOVERY.stage),
  budget: z.enum(DISCOVERY.budget),
  bottleneck: z.enum(DISCOVERY.bottleneck),
  capacity: z.enum(DISCOVERY.capacity),
  offer: z.string().trim().max(300).default(""),
  goal: z.string().trim().max(300).default(""),
  notes: z.string().trim().max(500).default(""),
  currency: z.enum(["EGP", "SAR", "AED", "USD"]).default("EGP"),
});
export type Discovery = z.infer<typeof discoverySchema>;

/** Monthly marketing budget ranges per currency (index matches DISCOVERY.budget). */
export const BUDGET_RANGES: Record<Discovery["currency"], string[]> = {
  EGP: ["0", "< 5,000", "5,000 – 20,000", "20,000 – 50,000", "50,000+"],
  SAR: ["0", "< 1,000", "1,000 – 5,000", "5,000 – 15,000", "15,000+"],
  AED: ["0", "< 1,000", "1,000 – 5,000", "5,000 – 15,000", "15,000+"],
  USD: ["0", "< 250", "250 – 1,000", "1,000 – 3,000", "3,000+"],
};

const STAGE_TEXT: Record<Discovery["stage"], string> = {
  zero: "starting from zero (no audience, no sales yet)",
  followers_no_sales: "has followers/engagement but few or no sales",
  some_sales: "making some sales, wants consistent growth",
  scaling_ads: "already selling and running ads, wants to scale",
};
const BOTTLENECK_TEXT: Record<Discovery["bottleneck"], string> = {
  awareness: "not enough people know the brand",
  engagement: "people see the content but don't engage",
  conversions: "people engage but don't buy",
  content: "can't produce enough good content",
  time: "no time to market consistently",
  identity: "brand identity feels weak / unclear",
  ad_costs: "ads are too expensive / not profitable",
  other: "other",
};
const CAPACITY_TEXT: Record<Discovery["capacity"], string> = {
  me: "the owner can film content themselves",
  team: "has a team/creator who can film",
  none: "nobody can film videos right now",
};

/** English evidence block for the AI prompt. */
export function discoveryToText(d: Discovery) {
  const budget = `${BUDGET_RANGES[d.currency][DISCOVERY.budget.indexOf(d.budget)]} ${d.currency}/month`;
  return [
    "Smart discovery answers (primary evidence):",
    `- Active channels / assets: ${d.channels.length ? d.channels.join(", ") : "none yet"}`,
    `- Stage: ${STAGE_TEXT[d.stage]}`,
    `- Monthly marketing budget: ${d.budget === "none" ? "no paid budget" : budget}`,
    `- Main bottleneck: ${BOTTLENECK_TEXT[d.bottleneck]}${d.notes ? ` — details: ${d.notes}` : ""}`,
    `- Content capacity: ${CAPACITY_TEXT[d.capacity]}`,
    d.offer ? `- What they sell & price: ${d.offer}` : "",
    d.goal ? `- 90-day goal: ${d.goal}` : "",
  ].filter(Boolean).join("\n");
}
