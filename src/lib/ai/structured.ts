import "server-only";
import { z } from "zod";
import { enumLabel, outputDialect } from "./polish";

/**
 * Structured AI outputs for the Brand hub: brand analysis and growth plan.
 * Parsing is lenient per item (bad items are dropped) but strict overall.
 */

const CATEGORIES = ["content", "video", "ads", "social", "brand", "website", "research", "other"] as const;
const TOOLS = ["adStudio", "mediaPlanner", "brandIdentity", "growthPlan"] as const;
export type TaskCategory = (typeof CATEGORIES)[number];
export type TaskTool = (typeof TOOLS)[number];

const str = (max: number) => z.string().trim().min(1).transform((s) => s.slice(0, max));
// `.optional()` first: in Zod v4 a missing key only passes if the schema is optional.
const pick = <T extends readonly string[]>(values: T, fallback: T[number]) =>
  z.unknown().optional().transform((v) => (typeof v === "string" && (values as readonly string[]).includes(v) ? (v as T[number]) : fallback));
const toolHint = z.unknown().optional().transform((v) => (typeof v === "string" && (TOOLS as readonly string[]).includes(v) ? (v as TaskTool) : null));
/** Lenient integer: non-numeric → fallback, then clamped. */
const int = (min: number, max: number, fallback: number) =>
  z.unknown().optional().transform((v) => {
    const n = typeof v === "number" ? v : typeof v === "string" && v.trim() ? Number(v) : NaN;
    return Number.isFinite(n) ? Math.max(min, Math.min(max, Math.round(n))) : fallback;
  });
/** Array where invalid items are dropped; requires at least `min` valid ones. */
const items = <T extends z.ZodType>(schema: T, min: number, max: number) =>
  z
    .array(z.unknown())
    .transform((a) => a.map((x) => schema.safeParse(x)).filter((r) => r.success).map((r) => r.data as z.infer<T>).slice(0, max))
    .refine((a) => a.length >= min, `at least ${min} valid items`);

const step = z.object({
  title: str(200),
  why: z.string().trim().max(500).optional().default(""),
  category: pick(CATEGORIES, "other"),
  priority: pick(["low", "medium", "high"] as const, "medium"),
  effort: pick(["quick", "medium", "big"] as const, "medium"),
  tool: toolHint,
});

const analysisSchema = z.object({
  readiness_score: int(0, 100, 50),
  stage: pick(["foundation", "launch", "growth", "scale"] as const, "foundation"),
  summary: str(1200),
  strengths: items(str(240), 0, 5),
  gaps: items(z.object({ area: str(80), issue: str(300) }), 1, 6),
  next_steps: items(step, 2, 8),
});
export type BrandAnalysis = z.infer<typeof analysisSchema>;

const planTask = z.object({
  title: str(200),
  details: z.string().trim().max(1000).optional().default(""),
  category: pick(CATEGORIES, "other"),
  priority: pick(["low", "medium", "high"] as const, "medium"),
  due_in_days: int(0, 120, 7),
  tool: toolHint,
});

const planSchema = z.object({
  title: str(200),
  goal: str(1000),
  summary: str(2000),
  tasks: items(planTask, 3, 12),
});
export type GrowthPlan = z.infer<typeof planSchema>;

const diagnosisSchema = z.object({
  readiness_score: int(0, 100, 50),
  stage: pick(["foundation", "launch", "growth", "scale"] as const, "foundation"),
  summary: str(1200),
  bottleneck_insight: z.string().trim().max(1200).optional().default(""),
  strengths: items(str(240), 0, 5),
  gaps: items(z.object({ area: str(80), issue: str(300) }), 1, 6),
  next_steps: items(step, 1, 5),
  roadmap: z.object({
    title: str(200),
    goal: str(1000),
    summary: str(2000),
    phases: items(z.object({ name: str(120), focus: str(400), timeframe: z.string().trim().max(60).optional().default("") }), 1, 4),
  }),
  tasks: items(planTask, 3, 12),
});
/** Diagnosis is a superset of BrandAnalysis (same fields + bottleneck, roadmap, tasks). */
export type GrowthDiagnosis = z.infer<typeof diagnosisSchema>;

function extractJson(text: string): unknown {
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start === -1 || end <= start) return null;
  try {
    return JSON.parse(text.slice(start, end + 1));
  } catch {
    return null;
  }
}

function parseWith<T>(schema: z.ZodType<T>, text: string, label: string): T | null {
  const json = extractJson(text);
  if (!json) return null;
  const r = schema.safeParse(json);
  if (!r.success) {
    console.error(`[ai] ${label} schema mismatch`, r.error.issues.slice(0, 3).map((i) => `${i.path.join(".")}: ${i.message}`).join("; "));
    return null;
  }
  return r.data;
}

export const parseAnalysis = (text: string) => parseWith(analysisSchema, text, "analysis");
export const parsePlan = (text: string) => parseWith(planSchema, text, "plan");
export const parseDiagnosis = (text: string) => parseWith(diagnosisSchema, text, "diagnosis");

export function diagnosisToMarkdown(d: GrowthDiagnosis, lang?: string | null) {
  return [
    analysisToMarkdown(d, lang),
    "",
    ...(d.bottleneck_insight ? ["## Bottleneck", d.bottleneck_insight, ""] : []),
    `## Roadmap — ${d.roadmap.title}`,
    `**Goal:** ${d.roadmap.goal}`,
    "",
    d.roadmap.summary,
    "",
    ...d.roadmap.phases.map((p, i) => `${i + 1}. **${p.name}**${p.timeframe ? ` (${p.timeframe})` : ""} — ${p.focus}`),
    "",
    planToMarkdown({ title: "Tasks", goal: d.roadmap.goal, summary: "", tasks: d.tasks }, lang).split("\n").slice(5).join("\n"),
  ].join("\n");
}

export function analysisToMarkdown(a: BrandAnalysis, lang?: string | null) {
  const e = (v: string) => enumLabel(v, outputDialect(lang));
  return [
    `# Brand analysis — ${a.readiness_score}/100 (${e(a.stage)})`,
    "",
    a.summary,
    "",
    ...(a.strengths.length ? ["## Strengths", ...a.strengths.map((s) => `- ${s}`), ""] : []),
    "## Gaps",
    ...a.gaps.map((g) => `- **${g.area}:** ${g.issue}`),
    "",
    "## Next steps",
    ...a.next_steps.map((s, i) => `${i + 1}. **${s.title}** (${e(s.priority)}, ${e(s.effort)})${s.why ? ` — ${s.why}` : ""}`),
  ].join("\n");
}

export function planToMarkdown(p: GrowthPlan, lang?: string | null) {
  const e = (v: string) => enumLabel(v, outputDialect(lang));
  return [
    `# ${p.title}`,
    "",
    `**Goal:** ${p.goal}`,
    "",
    p.summary,
    "",
    "## Tasks",
    "| # | Task | Category | Priority | Due (days) |",
    "|---|---|---|---|---|",
    ...p.tasks.map((t, i) => `| ${i + 1} | ${t.title}${t.details ? ` — ${t.details}` : ""} | ${e(t.category)} | ${e(t.priority)} | ${t.due_in_days} |`),
  ].join("\n");
}
