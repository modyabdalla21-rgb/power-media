import { NextResponse } from "next/server";
import { z } from "zod";
import { loadContext } from "@/lib/ai/context";
import { buildPrompt } from "@/lib/ai/prompts";
import { generateText } from "@/lib/ai/provider";
import { getToolBySlug, type ToolDefinition } from "@/lib/ai/tools";
import { AiError } from "@/lib/ai/types";
import { isDashboardPreview } from "@/lib/env";
import { serverEnv } from "@/lib/env.server";
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

export async function POST(request: Request, ctx: { params: Promise<{ tool: string }> }) {
  const { tool: slug } = await ctx.params;
  const tool = getToolBySlug(slug);
  if (!tool) return json({ code: "badRequest" }, 404);

  // ── Auth: staff only (clients can read shared outputs, not generate).
  const supabase = await createSupabaseServerClient();
  const profile = await getCurrentProfile();
  if (supabase) {
    if (!profile) return json({ code: "unauthorized" }, 401);
    if (profile.role === "client") return json({ code: "forbidden" }, 403);
  } else if (!isDashboardPreview) {
    return json({ code: "unauthorized" }, 401);
  }

  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return json({ code: "badRequest" }, 400);
  const { values, errors } = validate(tool, parsed.data.inputs);
  if (Object.keys(errors).length) return json({ code: "invalidInput", fields: errors }, 422);

  // ── Per-user hourly cap (protects the shared free-tier quota).
  if (supabase && profile) {
    const since = new Date(Date.now() - 60 * 60 * 1000).toISOString();
    const { count } = await supabase
      .from("ai_generations")
      .select("id", { count: "exact", head: true })
      .eq("user_id", profile.id)
      .gte("created_at", since);
    if ((count ?? 0) >= serverEnv.aiHourlyLimit) return json({ code: "userLimit", retryAfter: 3600 }, 429);
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

  try {
    const spec = buildPrompt(tool, values, ctxData.text);
    const result = await generateText(spec);

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
          output: result.text.slice(0, 100_000),
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

    return json({ text: result.text, id, truncated: result.truncated, provider: result.provider, model: result.model, language: values[tool.languageField] ?? "en" });
  } catch (err) {
    const e = err instanceof AiError ? err : new AiError("unknown", String(err));
    if (!(err instanceof AiError)) console.error("[ai] unexpected", err);
    const status =
      e.code === "notConfigured" ? 503
      : e.code === "rateLimited" || e.code === "quota" ? 429
      : e.code === "timeout" ? 504
      : e.code === "blocked" || e.code === "badRequest" ? 422
      : 502;
    // Only the normalised code (and a retry hint) reaches the browser.
    return json({ code: e.code, retryAfter: e.retryAfterSec }, status);
  }
}
