import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowRight, CheckCircle2, Circle, Gem, Sparkles, Stethoscope } from "lucide-react";
import { AnalyzePanel } from "@/components/hub/analyze-panel";
import { NextSteps, type Step } from "@/components/hub/next-steps";
import { PlanActions } from "@/components/hub/plan-actions";
import { PlanDialog } from "@/components/hub/plan-dialog";
import { TaskBoard, type HubTask } from "@/components/hub/task-board";
import { PaletteSwatches, SvgLogo, TypographyList, VoiceList } from "@/components/brand/brand-visuals";
import { ActivateKitButton } from "@/components/client/apply-concept";
import { BrandProfileForm } from "@/components/client/brand-profile-form";
import { BrandHelpButton } from "@/components/client/request-forms";
import { EmptyState, PageHeader, Panel } from "@/components/dashboard/primitives";
import { StatusBadge } from "@/components/dashboard/crud/status-badge";
import { LinkButton } from "@/components/ui/button";
import { localizedHref } from "@/i18n/config";
import { BRAND_KIT_COLUMNS, getClientWorkspace, listBrandAssets, resolveKitLogo, type BrandKit } from "@/lib/client/workspace";
import { AssetUploader } from "@/components/client/asset-uploader";
import { RemoveAssetButton } from "@/components/client/asset-remove";
import { fill, formatDate } from "@/lib/format";
import type { BrandAnalysis } from "@/lib/ai/structured";
import { cn } from "@/lib/utils";
import { loadPage } from "@/lib/page";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function generateMetadata({ params }: PageProps<"/[locale]/dashboard/brand">) {
  const { dict } = await loadPage(params);
  return { title: dict.dashboard.brand.title };
}

/** The client's AI Brand hub: readiness, analysis, next steps, plans, tasks, identity, profile. */
export default async function BrandPage({ params, searchParams }: PageProps<"/[locale]/dashboard/brand">) {
  const { locale, dict } = await loadPage(params);
  const sp = await searchParams;
  const workspace = await getClientWorkspace();
  const supabase = await createSupabaseServerClient();
  if (!workspace || !supabase) redirect(localizedHref(locale, "/dashboard"));
  if (!workspace.onboarded_at) redirect(localizedHref(locale, "/dashboard/onboarding"));
  const d = dict.dashboard;
  const b = d.brand;

  // All independent reads in one parallel round trip (RLS: own workspace only).
  const [{ data }, assets, { data: analysisRow }, { data: planRows }, { data: taskRows }] = await Promise.all([
    supabase.from("brand_kits").select(BRAND_KIT_COLUMNS).eq("client_id", workspace.id).order("created_at", { ascending: false }).limit(20),
    listBrandAssets(supabase, workspace.id),
    supabase.from("ai_generations").select("id, data, created_at").eq("client_id", workspace.id).in("tool", ["brandAnalysis", "growthDiagnosis"]).order("created_at", { ascending: false }).limit(1).maybeSingle(),
    supabase.from("brand_plans").select("id, title, goal, summary, horizon, status, source, created_at").eq("client_id", workspace.id).order("created_at", { ascending: false }).limit(20),
    supabase.from("brand_tasks").select("id, title, details, category, priority, status, due_date, plan_id, tool_hint, source").eq("client_id", workspace.id).order("status").order("sort_order").order("created_at", { ascending: false }).limit(200),
  ]);
  const kits = (data ?? []) as BrandKit[];
  const active = kits.find((k) => k.is_active) ?? null;
  const others = kits.filter((k) => !k.is_active);
  // Kit logos reuse the asset list's signed URLs; only unknown assets cost an extra lookup.
  const signed = new Map(assets.map((a) => [a.id, a.url]));
  const logoOf = (k: BrandKit | null) =>
    k?.logo_asset_id && signed.get(k.logo_asset_id) ? Promise.resolve({ svg: null, url: signed.get(k.logo_asset_id)! }) : resolveKitLogo(supabase, k);
  const [activeLogo, otherLogos] = await Promise.all([logoOf(active), Promise.all(others.map(logoOf))]);
  // Product photos feed the Static Post Studio (optional — not part of readiness).
  const products = assets.filter((a) => a.kind === "product");
  const identityHref = localizedHref(locale, "/dashboard/ai/brand-identity");
  const h = d.hub;
  const opts = d.options as Record<string, string>;
  // Latest of a quick analysis or a full Growth Diagnosis (a superset of the analysis shape).
  const analysis = (analysisRow?.data ?? null) as (BrandAnalysis & { bottleneck_insight?: string; roadmap?: { title: string; phases: { name: string; focus: string; timeframe?: string }[] } }) | null;
  const plans = (planRows ?? []) as { id: string; title: string; goal: string | null; summary: string | null; horizon: string; status: string; source: string; created_at: string }[];
  const tasks = (taskRows ?? []) as HubTask[];
  const activePlans = plans.filter((p) => p.status === "active");
  const otherPlans = plans.filter((p) => p.status !== "active");
  const progress = (planId: string) => {
    const pt = tasks.filter((t) => t.plan_id === planId);
    return { done: pt.filter((t) => t.status === "done").length, total: pt.length };
  };

  // AI language follows the brand's content dialect, else the UI language.
  const language = workspace.dialect ?? (locale === "eg" ? "ar_eg" : locale === "ar" ? "ar_msa" : "en");
  const currency = { egypt: "EGP", ksa: "SAR", uae: "AED", gcc: "SAR" }[workspace.market ?? ""] ?? "USD";
  const toolHrefs: Record<string, string> = {
    adStudio: localizedHref(locale, "/dashboard/ai/ad-copy-studio"),
    mediaPlanner: localizedHref(locale, "/dashboard/ai/campaign-media-planner"),
    brandIdentity: localizedHref(locale, "/dashboard/ai/brand-identity"),
    staticPost: localizedHref(locale, "/dashboard/ai/static-post-studio"),
    metaAds: localizedHref(locale, "/dashboard/ai/meta-ads-strategy"),
    marketingStrategy: localizedHref(locale, "/dashboard/ai/marketing-strategy"),
    offerAngles: localizedHref(locale, "/dashboard/ai/offer-angles"),
    growthPlan: "#plans",
  };
  const dateFmt = Object.fromEntries(tasks.filter((t) => t.due_date).map((t) => [t.due_date!, formatDate(t.due_date, locale)]));

  // ── Readiness (no AI needed): what's in place, with one-click fixes.
  const hasLogo = !!(active?.logo_asset_id || active?.logo_svg || active?.logo_url);
  const checklist = [
    { key: "profile", ok: !!(workspace.industry && workspace.audience && workspace.tone), href: "#profile" },
    { key: "identity", ok: !!active, href: identityHref },
    { key: "logo", ok: hasLogo, href: "#identity" },
    { key: "analysis", ok: !!analysis, href: localizedHref(locale, "/dashboard/growth") },
    { key: "plan", ok: plans.length > 0, href: "#plans" },
    { key: "task", ok: tasks.some((t) => t.status === "done"), href: "#tasks" },
  ] as const;
  const readiness = Math.round((checklist.filter((c) => c.ok).length / checklist.length) * 100);
  const sections = [["analysis", h.sections.analysis], ["plans", h.sections.plans], ["tasks", h.sections.tasks], ["identity", h.sections.identity], ["profile", h.sections.profile]] as const;

  return (
    <div className="space-y-8">
      <PageHeader title={`${h.title} · ${workspace.name}`} description={h.subtitle} actions={<PlanDialog d={d} language={language} currency={currency} />} />
      {sp.notice === "password" && <p role="status" className="rounded-xl border border-blue/30 bg-blue/10 p-3 text-sm">{dict.auth.passwordUpdated}</p>}

      <nav aria-label={h.title} className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
        {sections.map(([id, label]) => (
          <a key={id} href={`#${id}`} className="inline-flex h-10 shrink-0 items-center rounded-full border border-line px-4 text-sm text-ink-muted hover:border-blue/40 hover:text-white">{label}</a>
        ))}
      </nav>

      <div className="grid gap-6 lg:grid-cols-5">
        {/* Readiness */}
        <section className="surface-card p-5 lg:col-span-2" aria-labelledby="readiness-title">
          <div className="flex items-center gap-4">
            <div className="relative size-20 shrink-0" role="img" aria-label={`${h.readinessTitle}: ${readiness}%`}>
              <svg viewBox="0 0 36 36" className="size-20 -rotate-90">
                <circle cx="18" cy="18" r="15.5" fill="none" stroke="currentColor" strokeWidth="3" className="text-white/10" />
                <circle cx="18" cy="18" r="15.5" fill="none" stroke="url(#ready)" strokeWidth="3" strokeLinecap="round" strokeDasharray={`${(readiness / 100) * 97.4} 97.4`} />
                <defs><linearGradient id="ready"><stop offset="0" stopColor="#0789E8" /><stop offset="1" stopColor="#FFB800" /></linearGradient></defs>
              </svg>
              <span className="absolute inset-0 flex items-center justify-center text-lg font-bold tabular-nums">{readiness}%</span>
            </div>
            <div>
              <h2 id="readiness-title" className="font-semibold">{h.readinessTitle}</h2>
              <p className="mt-1 text-xs leading-relaxed text-ink-subtle">{h.readinessHint}</p>
            </div>
          </div>
          <ul className="mt-4 space-y-1">
            {checklist.map((c) => (
              <li key={c.key} className="flex min-h-10 items-center gap-3 text-sm">
                {c.ok ? <CheckCircle2 className="size-5 shrink-0 text-blue-300" aria-hidden /> : <Circle className="size-5 shrink-0 text-ink-subtle" aria-hidden />}
                <span className={cn("flex-1", c.ok && "text-ink-subtle line-through")}>{h.checklist[c.key]}</span>
                {!c.ok && <a href={c.href} className="inline-flex h-9 items-center rounded-lg px-3 text-xs font-semibold text-blue-300 hover:bg-blue/10 hover:text-white">{h.fix}</a>}
              </li>
            ))}
          </ul>
        </section>

        {/* AI analysis */}
        <section id="analysis" className="surface-card scroll-mt-24 p-5 lg:col-span-3" aria-labelledby="analysis-title">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <h2 id="analysis-title" className="font-semibold">{h.analysisTitle}</h2>
            {analysisRow && <span className="text-xs text-ink-subtle">{fill(h.lastAnalysis, { date: formatDate(analysisRow.created_at, locale) })}</span>}
          </div>
          {analysis ? (
            <div className="mt-4 space-y-4">
              <div className="flex flex-wrap items-center gap-3">
                <span className="rounded-xl bg-gradient-to-br from-blue/25 to-blue/5 px-3 py-2 text-sm"><span className="text-ink-subtle">{h.score} </span><b className="tabular-nums">{analysis.readiness_score}/100</b></span>
                <StatusBadge value="active" label={`${h.stage}: ${opts[analysis.stage] ?? analysis.stage}`} />
              </div>
              <p className="text-sm leading-relaxed" dir="auto">{analysis.summary}</p>
              {analysis.bottleneck_insight && (
                <div className="rounded-xl border border-orange/25 bg-orange/5 p-3">
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-yellow">{h.bottleneck}</h3>
                  <p className="mt-1 text-sm leading-relaxed" dir="auto">{analysis.bottleneck_insight}</p>
                </div>
              )}
              {analysis.roadmap?.phases?.length ? (
                <div>
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-blue-300">{h.roadmap} · <span className="normal-case" dir="auto">{analysis.roadmap.title}</span></h3>
                  <ol className="mt-2 grid gap-2 sm:grid-cols-2">
                    {analysis.roadmap.phases.map((ph, i) => (
                      <li key={ph.name + i} className="rounded-lg border border-line p-2.5 text-sm" dir="auto">
                        <p className="font-medium">{i + 1}. {ph.name}{ph.timeframe ? <span className="text-xs text-ink-subtle"> · {ph.timeframe}</span> : null}</p>
                        <p className="mt-0.5 text-xs leading-relaxed text-ink-muted">{ph.focus}</p>
                      </li>
                    ))}
                  </ol>
                </div>
              ) : null}
              <div className="grid gap-4 sm:grid-cols-2">
                {analysis.strengths.length > 0 && (
                  <div>
                    <h3 className="text-xs font-semibold uppercase tracking-wider text-blue-300">{h.strengths}</h3>
                    <ul className="mt-2 list-disc space-y-1 ps-4 text-sm text-ink-muted" dir="auto">{analysis.strengths.map((x) => <li key={x}>{x}</li>)}</ul>
                  </div>
                )}
                <div>
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-yellow">{h.gaps}</h3>
                  <ul className="mt-2 space-y-1.5 text-sm" dir="auto">{analysis.gaps.map((g) => <li key={g.area + g.issue}><b>{g.area}:</b> <span className="text-ink-muted">{g.issue}</span></li>)}</ul>
                </div>
              </div>
            </div>
          ) : (
            <p className="mt-3 text-sm leading-relaxed text-ink-muted">{h.analysisEmpty}</p>
          )}
          <Link href={localizedHref(locale, "/dashboard/growth")} className="mt-5 flex items-center gap-3 rounded-xl border border-blue/30 bg-blue/10 p-3 transition-colors hover:border-blue/60">
            <Stethoscope className="size-5 shrink-0 text-blue-300" aria-hidden />
            <span className="min-w-0 flex-1">
              <span className="block text-sm font-semibold">{h.runDiscovery}</span>
              <span className="block text-xs text-ink-muted">{h.discoveryHint}</span>
            </span>
            <ArrowRight className="flip-rtl size-4 shrink-0 text-blue-300" aria-hidden />
          </Link>
          <div className="mt-4 border-t border-line pt-4"><AnalyzePanel d={d} language={language} hasAnalysis={!!analysis} /></div>
        </section>
      </div>

      {analysis && analysisRow && (
        <Panel title={h.nextSteps}>
          <div className="p-4 sm:p-5">
            <NextSteps d={d} generationId={analysisRow.id} steps={analysis.next_steps as Step[]} addedTitles={tasks.map((t) => t.title)} toolHrefs={toolHrefs} />
          </div>
        </Panel>
      )}

      {/* Plans */}
      <section id="plans" className="scroll-mt-24 space-y-3" aria-labelledby="plans-title">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 id="plans-title" className="text-lg font-semibold">{h.plansTitle}</h2>
          <PlanDialog d={d} language={language} currency={currency} />
        </div>
        {activePlans.length === 0 && <p className="rounded-xl border border-dashed border-line p-6 text-center text-sm text-ink-subtle">{h.plansEmpty}</p>}
        <ul className="grid gap-4 md:grid-cols-2">
          {activePlans.map((p) => {
            const pr = progress(p.id);
            const pct = pr.total ? Math.round((pr.done / pr.total) * 100) : 0;
            return (
              <li key={p.id} className="surface-card flex flex-col p-5">
                <div className="flex items-start justify-between gap-3">
                  <h3 className="font-semibold" dir="auto">{p.title}</h3>
                  <span className="shrink-0 text-xs text-ink-subtle">{opts[p.horizon] ?? p.horizon}</span>
                </div>
                {p.goal && <p className="mt-1 text-sm text-blue-300" dir="auto">{p.goal}</p>}
                {p.summary && <p className="mt-2 line-clamp-3 text-sm leading-relaxed text-ink-muted" dir="auto">{p.summary}</p>}
                <div className="mt-4">
                  <div className="flex justify-between text-xs"><span className="text-ink-subtle">{fill(h.planProgress, { done: pr.done, total: pr.total })}</span><span className="tabular-nums">{pct}%</span></div>
                  <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-white/10" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100}>
                    <div className="h-full rounded-full bg-gradient-to-r from-blue to-yellow" style={{ width: `${pct}%` }} />
                  </div>
                </div>
                <div className="mt-3 flex items-center justify-between gap-2 border-t border-line pt-2">
                  <a href="#tasks" className="inline-flex h-10 items-center text-xs font-medium text-blue-300 hover:text-white">{h.tasksTitle} →</a>
                  <PlanActions planId={p.id} status={p.status} h={h} />
                </div>
              </li>
            );
          })}
        </ul>
        {otherPlans.length > 0 && (
          <ul className="divide-y divide-line rounded-xl border border-line">
            {otherPlans.map((p) => (
              <li key={p.id} className="flex flex-wrap items-center justify-between gap-2 px-4 py-2 text-sm">
                <span className="min-w-0 break-words text-ink-muted" dir="auto">{p.title}</span>
                <span className="flex items-center gap-2"><StatusBadge value={p.status === "completed" ? "completed" : "draft"} label={opts[p.status] ?? p.status} /><PlanActions planId={p.id} status={p.status} h={h} /></span>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Tasks */}
      <section id="tasks" className="scroll-mt-24 space-y-3" aria-labelledby="tasks-title">
        <h2 id="tasks-title" className="text-lg font-semibold">{h.tasksTitle}</h2>
        <TaskBoard d={d} tasks={tasks} plans={plans.map((p) => ({ id: p.id, title: p.title }))} toolHrefs={toolHrefs} dateFmt={dateFmt} />
      </section>

      {/* Identity */}
      <div id="identity" className="scroll-mt-24 flex flex-wrap items-center justify-between gap-3 pt-4">
        <h2 className="text-lg font-semibold">{h.identityTitle}</h2>
        <LinkButton href={identityHref} variant="secondary"><Sparkles className="size-4" aria-hidden />{active ? b.regenerate : b.generate}</LinkButton>
      </div>

      <Panel title={b.kitTitle} actions={active && <StatusBadge value="active" label={b.active} />}>
        {active ? (
          <div className="grid gap-6 p-5 lg:grid-cols-3">
            <div className="space-y-3">
              <SvgLogo svg={activeLogo.svg} url={activeLogo.url} alt={active.name} className="aspect-square w-full max-w-60" />
              <p className="font-semibold">{active.name}</p>
              {active.tagline && <p className="text-sm text-blue-300">{active.tagline}</p>}
              {active.positioning && <p className="text-sm leading-relaxed text-ink-muted">{active.positioning}</p>}
              {active.logo_prompt && (
                <details className="text-xs text-ink-subtle">
                  <summary className="cursor-pointer hover:text-white">{b.logoPrompt}</summary>
                  <p className="mt-1 whitespace-pre-wrap" dir="ltr">{active.logo_prompt}</p>
                </details>
              )}
            </div>
            <div className="space-y-6 lg:col-span-2">
              {!!active.palette?.length && (
                <section>
                  <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-ink-subtle">{b.palette}</h3>
                  <PaletteSwatches palette={active.palette} roles={b.colorRoles} />
                </section>
              )}
              <div className="grid gap-6 sm:grid-cols-2">
                {(active.typography?.heading || active.typography?.body) && (
                  <section>
                    <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-ink-subtle">{b.typography}</h3>
                    <TypographyList typography={active.typography} t={b} />
                  </section>
                )}
                {(active.voice?.do?.length || active.voice?.personality?.length) && (
                  <section>
                    <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-ink-subtle">{b.voice}</h3>
                    <VoiceList voice={active.voice} t={b} />
                  </section>
                )}
              </div>
            </div>
          </div>
        ) : (
          <EmptyState icon={Gem} title={b.noKit} body={b.noKitBody} action={<LinkButton href={identityHref} variant="energy"><Sparkles className="size-4" aria-hidden />{b.generate}</LinkButton>} />
        )}
      </Panel>

      <Panel title={b.assetsTitle}>
        <div className="grid gap-6 p-5 lg:grid-cols-2">
          <div className="space-y-3">
            <p className="text-sm leading-relaxed text-ink-muted">{b.assetsBody}</p>
            <AssetUploader clientId={workspace.id} kind="logo" t={b} kitName={b.existingKitName} />
            <Link href={identityHref} className="inline-flex min-h-10 items-center text-xs text-blue-300 hover:text-white">{b.generateInstead} →</Link>
          </div>
          <div className="space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h3 className="text-sm font-semibold">{b.productsTitle}</h3>
              <Link href={localizedHref(locale, "/dashboard/ai/static-post-studio")} className="inline-flex min-h-10 items-center text-xs text-blue-300 hover:text-white">{dict.dashboard.nav.postTool} →</Link>
            </div>
            <AssetUploader clientId={workspace.id} kind="product" t={b} />
            {products.length ? (
              <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                {products.map((a) => (
                  <li key={a.id} className="group relative overflow-hidden rounded-xl border border-line">
                    {a.url ? (
                      // eslint-disable-next-line @next/next/no-img-element -- signed URL from private storage
                      <img src={a.url} alt={a.caption ?? a.file_name ?? ""} className="aspect-square w-full bg-white object-contain" loading="lazy" referrerPolicy="no-referrer" />
                    ) : (
                      <div className="aspect-square w-full bg-white/5" />
                    )}
                    {(a.caption || a.file_name) && <p className="line-clamp-2 break-all px-2 py-1.5 text-xs text-ink-muted" dir="auto" title={a.caption ?? a.file_name ?? undefined}>{a.caption ?? a.file_name}</p>}
                    <div className="absolute end-1.5 top-1.5"><RemoveAssetButton assetId={a.id} label={b.removeAsset} /></div>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-xs text-ink-subtle">{b.noProducts}</p>
            )}
          </div>
        </div>
      </Panel>

      {others.length > 0 && (
        <Panel title={b.otherKits}>
          <ul className="divide-y divide-line">
            {others.map((k, i) => (
              <li key={k.id} className="flex items-center gap-4 px-5 py-3">
                <SvgLogo svg={otherLogos[i].svg} url={otherLogos[i].url} alt={k.name} className="size-12 shrink-0" />
                <div className="min-w-0 flex-1">
                  <p className="break-words text-sm font-medium" dir="auto">{k.name}</p>
                  <p className="text-xs text-ink-subtle">{formatDate(k.created_at, locale)}</p>
                </div>
                <div className="hidden gap-1 sm:flex" aria-hidden>
                  {k.palette?.slice(0, 5).map((c, i) => <span key={i} className="size-4 rounded-full border border-line" style={{ backgroundColor: c.hex }} />)}
                </div>
                <ActivateKitButton kitId={k.id} d={d} />
              </li>
            ))}
          </ul>
        </Panel>
      )}

      <section id="profile" className="scroll-mt-24">
        <Panel title={b.profileTitle}>
          <div className="p-5"><BrandProfileForm mode="profile" d={d} locale={locale} values={workspace} clientId={workspace.id} /></div>
        </Panel>
      </section>

      {/* Human help stays available, but secondary to self-serve AI. */}
      <div className="flex flex-col gap-3 border-t border-line pt-6 text-sm text-ink-subtle sm:flex-row sm:items-center sm:justify-between">
        <details className="group">
          <summary className="inline-flex min-h-10 cursor-pointer items-center hover:text-white">{h.helpLink}</summary>
          <div className="mt-2 max-w-md space-y-3">
            <p className="text-xs leading-relaxed">{b.helpBody}</p>
            <BrandHelpButton d={d} />
          </div>
        </details>
        <Link href={localizedHref(locale, "/dashboard/plan")} className="inline-flex min-h-10 items-center hover:text-white">{d.plan.title} →</Link>
      </div>
    </div>
  );
}
