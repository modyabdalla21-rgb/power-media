import { NextResponse } from "next/server";
import { z } from "zod";
import { loadContext } from "@/lib/ai/context";
import { identityToMarkdown, parseIdentity, type BrandIdentity } from "@/lib/ai/identity";
import { buildPrompt } from "@/lib/ai/prompts";
import { GENERATION_DEADLINE_MS, generateText } from "@/lib/ai/provider";
import { getToolBySlug, type ToolDefinition } from "@/lib/ai/tools";
import { AiError } from "@/lib/ai/types";
import { isDashboardPreview } from "@/lib/env";
import { serverEnv } from "@/lib/env.server";
import { brandContextText, getActiveBrandKit, getClientWorkspace, getUsage } from "@/lib/client/workspace";
import { createSupabaseServerClient, getCurrentProfile } from "@/lib/supabase/server";

// Allow up to 60s on Vercel (Hobby without Fluid compute defaults to 10s).
// The model calls themselves are bounded at 52s (GENERATION_DEADLINE_MS),
// leaving headroom for loading context and saving the result.
export const maxDuration = 60;

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const DATE = /^\d{4}-\d{2}-\d{2}$/;

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
      : f.type === "client" || f.type === "project" ? UUID.test(v)
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
  if (supabase && values.client_id) {
    const [{ data: brand }, kit, { data: assets }] = await Promise.all([
      supabase.from("clients").select(BRAND_COLUMNS).eq("id", values.client_id).maybeSingle(),
      // A new identity shouldn't copy the current one.
      tool.output === "identity" ? Promise.resolve(null) : getActiveBrandKit(supabase, values.client_id),
      supabase.from("brand_assets").select("kind, file_name, caption").eq("client_id", values.client_id).order("created_at", { ascending: false }).limit(10),
    ]);
    brandContext = brandContextText(brand, kit, assets ?? []);
    brandKitName = kit?.name ?? null;
  }
  const context = [brandContext, ctxData.text].filter(Boolean).join("\n\n");

  try {
    const spec = buildPrompt(tool, values, context);
    const started = Date.now();
    let result = await generateText(spec);

    let identity: BrandIdentity | null = null;
    if (tool.output === "identity") {
      identity = parseIdentity(result.text);
      // One retry for malformed JSON — only if it fits in the function's time limit.
      const left = GENERATION_DEADLINE_MS - (Date.now() - started) - 3_000;
      if (!identity && left > 12_000) {
        result = await generateText(spec, left);
        identity = parseIdentity(result.text);
      }
      if (!identity) throw new AiError("badRequest", "identity output could not be parsed");
    }
    const outputText = identity ? identityToMarkdown(identity) : result.text;

    const subject =
      tool.key === "reportGenerator"
        ? `${"clientName" in ctxData ? ctxData.clientName : ""} · ${values.period_start} → ${values.period_end}`
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
          data: identity,
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

    return json({
      text: outputText,
      identity,
      id,
      truncated: result.truncated,
      provider: result.provider,
      model: result.model,
      language: values[tool.languageField] ?? "en",
      brandKit: brandKitName,
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
