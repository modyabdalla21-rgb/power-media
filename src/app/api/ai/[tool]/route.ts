import { NextResponse } from "next/server";
import { z } from "zod";
import { loadContext } from "@/lib/ai/context";
import { polishData, polishOutput } from "@/lib/ai/polish";
import { loadBrandState } from "@/lib/ai/brand-state";
import { identityToMarkdown, parseIdentity } from "@/lib/ai/identity";
import { analysisToMarkdown, diagnosisToMarkdown, legacyTaskRows, parseAnalysis, parseDiagnosis, parsePlan, planToMarkdown, type GrowthDiagnosis, type GrowthPlan } from "@/lib/ai/structured";
import { discoverySchema, discoveryToText } from "@/lib/client/discovery";
import { buildPrompt } from "@/lib/ai/prompts";
import { GENERATION_DEADLINE_MS, generateText } from "@/lib/ai/provider";
import { getToolBySlug, type ToolDefinition } from "@/lib/ai/tools";
import { kitColors, parseStaticPost, POST_FORMATS, staticPostToMarkdown, type PostBrand, type PostFormat } from "@/lib/ai/post";
import { AiError } from "@/lib/ai/types";
import { isDashboardPreview } from "@/lib/env";
import { serverEnv } from "@/lib/env.server";
import { BRAND_BUCKET, brandContextText, getActiveBrandKit, getClientWorkspace, getUsage } from "@/lib/client/workspace";
import { createSupabaseServerClient, getCurrentProfile } from "@/lib/supabase/server";

// Allow up to 60s on Vercel (Hobby without Fluid compute defaults to 10s).
// The model calls themselves are bounded at 52s (GENERATION_DEADLINE_MS),
// leaving headroom for loading context and saving the result.
export const maxDuration = 60;

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const DATE = /^\d{4}-\d{2}-\d{2}$/;
/** Image types the AI models accept as input. */
const VISION_MIME = ["image/png", "image/jpeg", "image/webp"];

const bodySchema = z.object({ inputs: z.record(z.string(), z.string().max(6000)) });

type FieldErrors = Record<string, "required" | "invalid">;

/** Validate inputs against the tool's field schema; unknown keys are dropped. */
function validate(tool: ToolDefinition, raw: Record<string, string>) {
  const values: Record<string, string> = {};
  const errors: FieldErrors = {};
  for (const f of tool.fields) {
    const v = (raw[f.name] ?? "").trim();
    if (!v) {
      if (f.required) errors[f.name] = "required";
      continue;
    }
    const ok =
      f.type === "select" ? !!f.options?.some((o) => o.value === v)
      : f.type === "client" || f.type === "project" || f.type === "image" ? UUID.test(v)
      : f.type === "date" ? DATE.test(v) && !Number.isNaN(Date.parse(v))
      : f.type === "number" ? Number.isFinite(Number(v)) && Number(v) > 0 && Number(v) < 1e12
      : v.length <= (f.max ?? (f.type === "textarea" ? 4000 : 300));
    if (ok) values[f.name] = v;
    else errors[f.name] = "invalid";
  }
  if (values.period_start && values.period_end && values.period_end < values.period_start) errors.period_end = "invalid";
  return { values, errors };
}

const json = (body: unknown, status = 200) => NextResponse.json(body, { status });

const BRAND_COLUMNS = "name, industry, market, audience, tone, dialect, website, brand_notes";

export async function POST(request: Request, ctx: { params: Promise<{ tool: string }> }) {
  const { tool: slug } = await ctx.params;
  const tool = getToolBySlug(slug);
  if (!tool) return json({ code: "badRequest" }, 404);

  // ── Auth: staff use every tool; clients only tools open to them, in their own workspace.
  const supabase = await createSupabaseServerClient();
  const profile = await getCurrentProfile();
  if (supabase) {
    if (!profile) return json({ code: "unauthorized" }, 401);
    if (profile.role === "client" && tool.access !== "all") return json({ code: "forbidden" }, 403);
  } else if (!isDashboardPreview) {
    return json({ code: "unauthorized" }, 401);
  }
  const isClient = profile?.role === "client";

  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return json({ code: "badRequest" }, 400);
  const raw = { ...parsed.data.inputs };

  // Clients: generation is always for their own workspace (never another client / project).
  const workspace = isClient ? await getClientWorkspace() : null;
  if (isClient) {
    if (!workspace) return json({ code: "noWorkspace" }, 409);
    raw.client_id = workspace.id; // a project, if given, must belong to it (checked below)
  }

  const { values, errors } = validate(tool, raw);
  if (Object.keys(errors).length) return json({ code: "invalidInput", fields: errors }, 422);

  if (supabase && profile) {
    // ── Per-user hourly cap (protects the shared provider quota).
    const since = new Date(Date.now() - 60 * 60 * 1000).toISOString();
    const { count } = await supabase
      .from("ai_generations")
      .select("id", { count: "exact", head: true })
      .eq("user_id", profile.id)
      .gte("created_at", since);
    if ((count ?? 0) >= serverEnv.aiHourlyLimit) return json({ code: "userLimit", retryAfter: 3600 }, 429);

    // ── Client plan quota (checked before any AI call).
    if (isClient && workspace) {
      const usage = await getUsage(supabase, profile.id, workspace);
      const bucket = usage[tool.quota];
      if (bucket.used >= bucket.limit) {
        return json({ code: "planLimit", tier: usage.tier, quota: tool.quota, limit: bucket.limit, used: bucket.used }, 402);
      }
    }
  }

  // ── Context from dashboard records (RLS-scoped to the caller).
  const ctxData = supabase
    ? await loadContext(supabase, {
        clientId: values.client_id,
        projectId: values.project_id,
        periodStart: values.period_start,
        periodEnd: values.period_end,
        detailed: tool.key === "reportGenerator",
      })
    : { text: "" };
  if (supabase && "clientName" in ctxData) {
    if (values.client_id && !ctxData.clientName) return json({ code: "invalidInput", fields: { client_id: "invalid" } }, 422);
    if (values.project_id && !ctxData.projectName) return json({ code: "invalidInput", fields: { project_id: "invalid" } }, 422);
    if (values.project_id && values.client_id && ctxData.projectClientId !== values.client_id) {
      return json({ code: "invalidInput", fields: { project_id: "invalid" } }, 422);
    }
  }

  // ── Brand profile + active brand kit keep every output on-brand.
  let brandContext = "";
  let brandKitName: string | null = null;
  let brandName = "";
  let brandColors: string[] = kitColors(null);
  if (supabase && values.client_id) {
    const [{ data: brand }, kit, { data: assets }] = await Promise.all([
      supabase.from("clients").select(BRAND_COLUMNS).eq("id", values.client_id).maybeSingle(),
      // A new identity shouldn't copy the current one.
      tool.output === "identity" ? Promise.resolve(null) : getActiveBrandKit(supabase, values.client_id),
      supabase.from("brand_assets").select("kind, file_name, caption").eq("client_id", values.client_id).order("created_at", { ascending: false }).limit(10),
    ]);
    brandContext = brandContextText(brand, kit, assets ?? []);
    // Analyser, planner & diagnosis also see what the brand has already done.
    if (tool.output === "analysis" || tool.output === "plan" || tool.output === "diagnosis") brandContext += `\n\n${await loadBrandState(supabase, values.client_id)}`;
    // Diagnosis is driven by the Smart Discovery answers.
    if (tool.output === "diagnosis") {
      const { data: disc } = await supabase.from("clients").select("discovery").eq("id", values.client_id).maybeSingle();
      const parsedDisc = discoverySchema.safeParse(disc?.discovery);
      if (!parsedDisc.success) return json({ code: "invalidInput", fields: { discovery: "required" } }, 422);
      brandContext = `${discoveryToText(parsedDisc.data)}\n\n${brandContext}`;
    }
    brandKitName = kit?.name ?? null;
    brandName = kit?.name ?? brand?.name ?? "";
    brandColors = kitColors(kit?.palette);
  }

  // ── Static posts: the product photo must belong to this brand; the AI gets to see it.
  let images: { mimeType: string; data: string }[] | undefined;
  if (tool.output === "post" && values.image) {
    if (!supabase || !values.client_id) return json({ code: "invalidInput", fields: { image: "invalid" } }, 422);
    const { data: asset } = await supabase.from("brand_assets").select("storage_path, mime_type").eq("id", values.image).eq("client_id", values.client_id).maybeSingle();
    if (!asset) return json({ code: "invalidInput", fields: { image: "invalid" } }, 422);
    if (VISION_MIME.includes(asset.mime_type)) {
      const { data: file } = await supabase.storage.from(BRAND_BUCKET).download(asset.storage_path);
      if (file && file.size <= 4 * 1024 * 1024) images = [{ mimeType: asset.mime_type, data: Buffer.from(await file.arrayBuffer()).toString("base64") }];
    }
  }
  const context = [brandContext, ctxData.text].filter(Boolean).join("\n\n");

  try {
    const spec = { ...buildPrompt(tool, values, context), images };
    const started = Date.now();
    let result = await generateText(spec);

    const outLang = values[tool.languageField] ?? "en";
    const polished = <T,>(v: T | null) => (v ? polishData(v, outLang) : v);
    // Structured tools: parse + validate JSON, with one bounded retry.
    const parsers = {
      identity: (t: string) => { const v = polished(parseIdentity(t)); return v && { data: v, md: identityToMarkdown(v, outLang) }; },
      analysis: (t: string) => { const v = polished(parseAnalysis(t)); return v && { data: v, md: analysisToMarkdown(v, outLang) }; },
      plan: (t: string) => { const v = polished(parsePlan(t)); return v && { data: v, md: planToMarkdown(v, outLang) }; },
      diagnosis: (t: string) => { const v = polished(parseDiagnosis(t)); return v && { data: v, md: diagnosisToMarkdown(v, outLang) }; },
      post: (t: string) => {
        const v = polished(parseStaticPost(t));
        const brand: PostBrand = { name: brandName, colors: brandColors, format: (POST_FORMATS as readonly string[]).includes(values.format) ? (values.format as PostFormat) : "square", imageId: values.image ?? null };
        return v && { data: { ...v, brand }, md: staticPostToMarkdown(v) };
      },
    } as const;
    let structured: { data: unknown; md: string } | null = null;
    if (tool.output !== "markdown") {
      const parse = parsers[tool.output];
      structured = parse(result.text);
      const left = GENERATION_DEADLINE_MS - (Date.now() - started) - 3_000;
      if (!structured && left > 12_000) {
        result = await generateText(spec, left);
        structured = parse(result.text);
      }
      if (!structured) throw new AiError("badRequest", `${tool.output} output could not be parsed`);
    }
    const identity = tool.output === "identity" ? structured?.data ?? null : null;
    // Localized headings/labels and no raw "[...]" placeholders in what users see.
    const outputText = polishOutput(structured ? structured.md : result.text, outLang);

    const subject =
      tool.key === "reportGenerator"
        ? `${"clientName" in ctxData ? ctxData.clientName : ""} · ${values.period_start} → ${values.period_end}`
        : tool.output === "analysis" || tool.output === "diagnosis"
          ? `${"clientName" in ctxData && ctxData.clientName ? ctxData.clientName : "Brand"} · ${new Date().toISOString().slice(0, 10)}`
          : values[tool.titleField] ?? "";
    const title = subject.trim().slice(0, 180) || tool.key;

    let id: string | null = null;
    if (supabase && profile) {
      const { data, error } = await supabase
        .from("ai_generations")
        .insert({
          user_id: profile.id,
          tool: tool.key,
          title,
          inputs: values,
          output: outputText.slice(0, 100_000),
          data: structured?.data ?? null,
          provider: result.provider,
          model: result.model,
          language: values[tool.languageField] ?? null,
          tokens_in: result.tokensIn ?? null,
          tokens_out: result.tokensOut ?? null,
          truncated: result.truncated,
          client_id: values.client_id ?? null,
          project_id: values.project_id ?? null,
        })
        .select("id")
        .single();
      if (error) console.error("[ai] save failed", error.code, error.message);
      id = data?.id ?? null;
    }

    // Growth plan → a trackable plan with dated tasks.
    let planId: string | null = null;
    if (tool.output === "plan" && structured && supabase && values.client_id) {
      planId = await createPlanWithTasks(supabase, values.client_id, structured.data as GrowthPlan, values, id);
    }
    // Diagnosis → its roadmap becomes a tracked plan with prioritised tasks.
    if (tool.output === "diagnosis" && structured && supabase && values.client_id) {
      const dg = structured.data as GrowthDiagnosis;
      planId = await createPlanWithTasks(supabase, values.client_id, { title: dg.roadmap.title, goal: dg.roadmap.goal, summary: dg.roadmap.summary, tasks: dg.tasks }, values, id);
    }

    return json({
      text: outputText,
      identity,
      id,
      truncated: result.truncated,
      provider: result.provider,
      model: result.model,
      language: values[tool.languageField] ?? "en",
      brandKit: brandKitName,
      analysis: tool.output === "analysis" || tool.output === "diagnosis" ? structured?.data : undefined,
      post: tool.output === "post" ? structured?.data : undefined,
      planId,
    });
  } catch (err) {
    const e = err instanceof AiError ? err : new AiError("unknown", String(err));
    if (!(err instanceof AiError)) console.error("[ai] unexpected", err);
    const status =
      e.code === "notConfigured" ? 503
      : e.code === "rateLimited" || e.code === "quota" ? 429
      : e.code === "timeout" ? 504
      : e.code === "unavailable" ? 503
      : e.code === "blocked" || e.code === "badRequest" ? 422
      : 502;
    // Only the normalised code (and a retry hint) reaches the browser.
    return json({ code: e.code, retryAfter: e.retryAfterSec }, status);
  }
}

async function createPlanWithTasks(
  supabase: NonNullable<Awaited<ReturnType<typeof createSupabaseServerClient>>>,
  clientId: string,
  plan: GrowthPlan,
  values: Record<string, string>,
  generationId: string | null,
) {
  const horizon = ["2w", "1m", "3m"].includes(values.horizon) ? values.horizon : "1m";
  const { data: row, error } = await supabase
    .from("brand_plans")
    .insert({ client_id: clientId, title: plan.title, goal: plan.goal, summary: plan.summary, horizon, source: "ai", generation_id: generationId })
    .select("id")
    .single();
  if (error || !row) {
    console.error("[ai] plan save failed", error?.code, error?.message);
    return null;
  }
  const today = Date.now();
  const taskRows = plan.tasks.map((t, i) => ({
      client_id: clientId,
      plan_id: row.id,
      title: t.title,
      details: t.details || null,
      category: t.category,
      priority: t.priority,
      due_date: new Date(today + t.due_in_days * 86_400_000).toISOString().slice(0, 10),
      tool_hint: t.tool,
      source: "ai",
      sort_order: i,
  }));
  let { error: taskError } = await supabase.from("brand_tasks").insert(taskRows);
  // Database not yet migrated (0007): fall back to the older tool hints.
  if (taskError?.code === "23514") ({ error: taskError } = await supabase.from("brand_tasks").insert(legacyTaskRows(taskRows)));
  if (taskError) console.error("[ai] plan tasks save failed", taskError.code, taskError.message);
  return row.id as string;
}
