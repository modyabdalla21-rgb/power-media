import { NextResponse } from "next/server";
import { z } from "zod";
import { getToolBySlug } from "@/lib/ai/tools";
import { AiNotConfiguredError, AiNotImplementedError, getAiProvider } from "@/lib/ai/provider";
import { isSupabaseConfigured } from "@/lib/env";
import { getCurrentUser } from "@/lib/supabase/server";

const bodySchema = z.object({
  inputs: z.record(z.string(), z.string().max(4000)),
  outputLanguage: z.enum(["en", "ar"]).default("en"),
});

export async function POST(request: Request, ctx: { params: Promise<{ tool: string }> }) {
  const { tool: slug } = await ctx.params;
  const tool = getToolBySlug(slug);
  if (!tool) return NextResponse.json({ code: "UNKNOWN_TOOL" }, { status: 404 });

  // Auth: when Supabase is configured every AI call requires a signed-in user.
  if (isSupabaseConfigured && !(await getCurrentUser())) {
    return NextResponse.json({ code: "UNAUTHORIZED" }, { status: 401 });
  }

  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ code: "INVALID_BODY" }, { status: 400 });

  const { inputs, outputLanguage } = parsed.data;
  const missing = tool.fields.filter((f) => f.required && !inputs[f.name]?.trim()).map((f) => f.name);
  if (missing.length) return NextResponse.json({ code: "MISSING_FIELDS", missing }, { status: 422 });

  // Only keep known fields.
  const clean = Object.fromEntries(tool.fields.map((f) => [f.name, (inputs[f.name] ?? "").trim()]));

  try {
    const provider = getAiProvider();
    const result = await provider.generate({ tool, inputs: clean, outputLanguage });
    return NextResponse.json({ text: result.text });
  } catch (err) {
    if (err instanceof AiNotConfiguredError) return NextResponse.json({ code: err.code }, { status: 503 });
    if (err instanceof AiNotImplementedError) return NextResponse.json({ code: err.code }, { status: 501 });
    console.error("[ai] generation failed", err);
    return NextResponse.json({ code: "AI_ERROR" }, { status: 500 });
  }
}
