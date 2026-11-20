import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft, FileText, Gem, Megaphone, PenLine, Target } from "lucide-react";
import { SvgLogo } from "@/components/brand/brand-visuals";
import { DecisionForm } from "@/components/client/decision-form";
import { clientFields } from "@/components/dashboard/crud/module-view";
import { ConfirmDelete } from "@/components/dashboard/crud/delete-button";
import { RecordDialog } from "@/components/dashboard/crud/record-dialog";
import { StatusBadge } from "@/components/dashboard/crud/status-badge";
import { EmptyState, Panel } from "@/components/dashboard/primitives";
import { toolIcons } from "@/components/site/icons";
import { LinkButton } from "@/components/ui/button";
import { fieldsForRole, modules } from "@/config/modules";
import { localizedHref } from "@/i18n/config";
import { getActiveBrandKit, getClientWorkspace, resolveKitLogo, BRAND_KIT_COLUMNS, type BrandKit } from "@/lib/client/workspace";
import { deleteRecord } from "@/lib/crud/actions";
import { loadRelationOptions } from "@/lib/crud/queries";
import { getToolByKey } from "@/lib/ai/tools";
import { fill, formatDate } from "@/lib/format";
import { loadPage } from "@/lib/page";
import { createSupabaseServerClient, getCurrentProfile } from "@/lib/supabase/server";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

type Project = {
  id: string; name: string; client_id: string; objective: string | null; deliverables: string | null; priority: string;
  decision_status: string; decision_notes: string | null; decided_at: string | null; stage: string; status: string;
  progress: number; due_date: string | null; description: string | null; created_by: string | null; brand_kit_id: string | null;
  lead_id: string | null; client: { name: string } | null; lead: { full_name: string | null; email: string } | null;
};

export async function generateMetadata({ params }: PageProps<"/[locale]/dashboard/projects/[id]">) {
  const { dict } = await loadPage(params);
  return { title: dict.dashboard.modules.projects.title, robots: { index: false } };
}

export default async function ProjectPage({ params }: PageProps<"/[locale]/dashboard/projects/[id]">) {
  const { id } = await params;
  const { locale, dict } = await loadPage(params);
  if (!UUID.test(id)) notFound();
  const supabase = await createSupabaseServerClient();
  const profile = await getCurrentProfile();
  if (!supabase || !profile) notFound();
  if (profile.role === "client" && (await getClientWorkspace())?.source === "self_serve") redirect(localizedHref(locale, "/dashboard/brand"));

  const def = modules.projects;
  const { data } = await supabase.from("projects").select(def.select).eq("id", id).maybeSingle();
  if (!data) notFound(); // missing or not visible under RLS
  const p = data as unknown as Project;

  const d = dict.dashboard;
  const t = d.projectDetail;
  const opts = d.options;
  const isStaff = profile.role !== "client";
  const listHref = localizedHref(locale, "/dashboard/projects");

  // Brand used by this project: its linked kit, else the client's active kit.
  const linkedKit = p.brand_kit_id
    ? ((await supabase.from("brand_kits").select(BRAND_KIT_COLUMNS).eq("id", p.brand_kit_id).maybeSingle()).data as BrandKit | null)
    : null;
  const kit = linkedKit ?? (await getActiveBrandKit(supabase, p.client_id));
  const [logo, { data: outputs }, relations] = await Promise.all([
    resolveKitLogo(supabase, kit),
    supabase.from("ai_generations").select("id, title, tool, created_at").eq("project_id", p.id).order("created_at", { ascending: false }).limit(20),
    loadRelationOptions(supabase, fieldsForRole(def, profile.role).flatMap((f) => (f.relation ? [f.relation] : []))),
  ]);

  const fields = clientFields(def, dict, relations, profile.role);
  const values = Object.fromEntries(fields.map((f) => [f.column, (p as unknown as Record<string, unknown>)[f.column] == null ? "" : String((p as unknown as Record<string, unknown>)[f.column])]));
  const canDelete = isStaff || p.created_by === profile.id;

  const actions = [
    { label: t.writeCopy, href: `/dashboard/ai/ad-copy-studio?project=${p.id}`, icon: PenLine },
    { label: t.planCampaign, href: `/dashboard/ai/campaign-media-planner?project=${p.id}`, icon: Target },
    ...(isStaff ? [{ label: dict.aiTools.reportGenerator.name, href: `/dashboard/ai/client-report-generator?project=${p.id}`, icon: FileText }] : []),
  ];

  return (
    <div className="space-y-6">
      <Link href={listHref} className="inline-flex min-h-10 items-center gap-1.5 text-sm text-ink-muted hover:text-white">
        <ArrowLeft className="flip-rtl size-4" aria-hidden />
        {t.back}
      </Link>

      <header className="flex flex-col gap-4 border-b border-line pb-6 lg:flex-row lg:items-end lg:justify-between">
        <div className="min-w-0">
          {isStaff && p.client && <p className="text-xs font-semibold uppercase tracking-wider text-blue-300">{p.client.name}</p>}
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-balance sm:text-3xl">{p.name}</h1>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <StatusBadge value={p.decision_status} label={opts[p.decision_status as keyof typeof opts] ?? p.decision_status} />
            <StatusBadge value={p.priority} label={`${d.fields.priority}: ${opts[p.priority as keyof typeof opts] ?? p.priority}`} />
            <StatusBadge value={p.status} label={opts[p.status as keyof typeof opts] ?? p.status} />
            {p.due_date && <span className="text-xs text-ink-subtle">{d.fields.dueDate}: {formatDate(p.due_date, locale)}</span>}
          </div>
        </div>
        <div className="flex shrink-0 flex-wrap items-center gap-2">
          <RecordDialog moduleKey="projects" title={`${d.crud.editTitle} — ${p.name}`} fields={fields} values={{ id: p.id, ...values }} t={d.crud} triggerVariant="edit" triggerLabel={d.crud.edit} />
          {canDelete && <ConfirmDelete action={deleteRecord} hidden={{ _module: "projects", _id: p.id, _redirect: listHref }} t={d.crud} />}
        </div>
      </header>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <section className="surface-card grid gap-6 p-5 sm:grid-cols-2 sm:p-6">
            <div>
              <h2 className="flex items-center gap-2 text-sm font-semibold"><Target className="size-4 text-yellow" aria-hidden />{t.objective}</h2>
              <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-ink-muted" dir="auto">{p.objective || t.noObjective}</p>
            </div>
            <div>
              <h2 className="flex items-center gap-2 text-sm font-semibold"><Megaphone className="size-4 text-blue-300" aria-hidden />{t.deliverables}</h2>
              <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-ink-muted" dir="auto">{p.deliverables || t.noDeliverables}</p>
            </div>
          </section>

          <Panel title={t.outputsTitle}>
            {outputs?.length ? (
              <ul className="divide-y divide-line">
                {outputs.map((g) => {
                  const tool = getToolByKey(g.tool);
                  const Icon = tool ? toolIcons[tool.key] : FileText;
                  return (
                    <li key={g.id}>
                      <Link href={localizedHref(locale, `/dashboard/ai/history/${g.id}`)} className="flex min-h-12 items-center gap-3 px-5 py-3 text-sm hover:bg-white/[0.02]">
                        <Icon className="size-4 shrink-0 text-yellow" aria-hidden />
                        <span className="min-w-0 flex-1 truncate font-medium">{g.title}</span>
                        <span className="hidden shrink-0 text-xs text-ink-subtle sm:inline">{opts[g.tool as keyof typeof opts] ?? g.tool}</span>
                        <span className="shrink-0 text-xs text-ink-subtle">{formatDate(g.created_at, locale)}</span>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            ) : (
              <p className="px-5 py-6 text-sm text-ink-subtle">{t.noOutputs}</p>
            )}
            <div className="flex flex-wrap gap-2 border-t border-line p-4">
              {actions.map((a) => (
                <LinkButton key={a.href} href={localizedHref(locale, a.href)} variant="secondary" size="sm" className="h-10">
                  <a.icon className="size-4" aria-hidden />
                  {a.label}
                </LinkButton>
              ))}
            </div>
          </Panel>
        </div>

        <aside className="space-y-6">
          <Panel title={t.decisionTitle}>
            <div className="space-y-4 p-5">
              <p className="text-xs leading-relaxed text-ink-subtle">{t.decisionHelp}</p>
              <DecisionForm projectId={p.id} status={p.decision_status} notes={p.decision_notes ?? ""} d={d} />
              {p.decided_at && <p className="text-xs text-ink-subtle">{fill(t.lastDecision, { date: formatDate(p.decided_at, locale) })}</p>}
            </div>
          </Panel>

          <Panel title={t.brandTitle}>
            {kit ? (
              <div className="flex items-center gap-4 p-5">
                <SvgLogo svg={logo.svg} url={logo.url} alt={kit.name} className="size-16 shrink-0" />
                <div className="min-w-0">
                  <p className="truncate font-semibold">{kit.name}</p>
                  {kit.tagline && <p className="truncate text-xs text-blue-300">{kit.tagline}</p>}
                  <div className="mt-2 flex gap-1" aria-hidden>
                    {kit.palette?.slice(0, 6).map((c, i) => <span key={i} className="size-4 rounded-full border border-line" style={{ backgroundColor: c.hex }} />)}
                  </div>
                </div>
              </div>
            ) : (
              <EmptyState
                icon={Gem}
                title={t.noBrand}
                className="py-8"
                action={!isStaff ? <LinkButton href={localizedHref(locale, "/dashboard/brand")} size="sm" className="h-10">{t.setupBrand}</LinkButton> : undefined}
              />
            )}
          </Panel>

          <Panel title={t.details}>
            <dl className="divide-y divide-line text-sm">
              {[
                [d.fields.stage, opts[p.stage as keyof typeof opts] ?? p.stage],
                [d.fields.progress, `${p.progress}%`],
                [d.fields.projectLead, p.lead?.full_name ?? p.lead?.email ?? "—"],
                [d.fields.dueDate, formatDate(p.due_date, locale)],
              ].map(([k, v]) => (
                <div key={k} className="flex justify-between gap-3 px-5 py-3">
                  <dt className="text-ink-subtle">{k}</dt>
                  <dd className="text-end">{v}</dd>
                </div>
              ))}
            </dl>
            {p.description && <p className="border-t border-line px-5 py-3 text-sm whitespace-pre-wrap text-ink-muted" dir="auto">{p.description}</p>}
          </Panel>
        </aside>
      </div>
    </div>
  );
}
