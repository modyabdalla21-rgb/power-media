import Link from "next/link";
import { redirect } from "next/navigation";
import { SvgLogo } from "@/components/brand/brand-visuals";
import { getActiveBrandKit, getClientWorkspace, getUsage, resolveKitLogo, type Workspace } from "@/lib/client/workspace";
import type { SupabaseClient } from "@supabase/supabase-js";
import { BarChart3, Briefcase, CalendarClock, CheckCircle2, FileText, FolderKanban, Inbox, ListChecks, Megaphone, Plus, Wallet } from "lucide-react";
import { EmptyState, PageHeader, Panel, StatCard } from "@/components/dashboard/primitives";
import { StatusBadge } from "@/components/dashboard/crud/status-badge";
import { IconTile, toolIcons } from "@/components/site/icons";
import { localizedHref, type Locale } from "@/i18n/config";
import type { Dictionary } from "@/i18n/dictionaries/en";
import { aiTools } from "@/lib/ai/tools";
import { formatDate, formatMoney, formatNumber } from "@/lib/format";
import { loadPage } from "@/lib/page";
import { createSupabaseServerClient, getCurrentProfile, type Profile } from "@/lib/supabase/server";

type Filter = ["eq" | "neq", string, string] | ["in", string, string[]];

/** Live row count respecting RLS. Returns null on error (shown as "—"). */
async function count(supabase: SupabaseClient, table: string, filter?: Filter) {
  let q = supabase.from(table).select("id", { count: "exact", head: true });
  if (filter?.[0] === "eq") q = q.eq(filter[1], filter[2]);
  else if (filter?.[0] === "neq") q = q.neq(filter[1], filter[2]);
  else if (filter?.[0] === "in") q = q.in(filter[1], filter[2]);
  const { count: n, error } = await q;
  return error ? null : (n ?? 0);
}

export default async function DashboardOverview({ params, searchParams }: PageProps<"/[locale]/dashboard">) {
  const { locale, dict } = await loadPage(params);
  const sp = await searchParams;
  const t = dict.dashboard;
  const profile = await getCurrentProfile();
  const supabase = await createSupabaseServerClient();
  const name = profile?.full_name?.split(" ")[0];

  const notice = sp.notice === "password" && (
    <p role="status" className="flex items-center gap-2 rounded-xl border border-blue/30 bg-blue/10 p-3 text-sm">
      <CheckCircle2 className="size-4 text-blue-300" aria-hidden />
      {dict.auth.passwordUpdated}
    </p>
  );

  if (!supabase || !profile) return <PreviewOverview dict={dict} locale={locale} />;

  // Self-serve clients: workspace is provisioned on first visit; brand setup comes first.
  const workspace = profile.role === "client" ? await getClientWorkspace() : null;
  if (workspace && !workspace.onboarded_at) redirect(localizedHref(locale, "/dashboard/onboarding"));

  return (
    <div className="space-y-8">
      <PageHeader
        title={name ? `${t.overview.greeting}, ${name}` : t.overview.greeting}
        description={profile.role === "client" ? t.overview.clientSubtitle : t.overview.subtitle}
      />
      {notice}
      {profile.role === "client" ? (
        <>
          {workspace && <WorkspaceSummary supabase={supabase} dict={dict} locale={locale} workspace={workspace} userId={profile.id} />}
          <ClientOverview supabase={supabase} dict={dict} locale={locale} />
        </>
      ) : (
        <StaffOverview supabase={supabase} dict={dict} locale={locale} profile={profile} />
      )}
    </div>
  );
}

async function StaffOverview({ supabase, dict, locale, profile }: { supabase: SupabaseClient; dict: Dictionary; locale: Locale; profile: Profile }) {
  const t = dict.dashboard;
  const o = t.overview;
  const isAdmin = profile.role === "admin";
  const today = new Date().toISOString().slice(0, 10);

  const [clients, projects, campaigns, newLeads, openTasks, retainers, leads, tasks] = await Promise.all([
    count(supabase, "clients", ["eq", "status", "active"]),
    count(supabase, "projects", ["eq", "status", "active"]),
    count(supabase, "campaigns", ["eq", "status", "active"]),
    count(supabase, "leads", ["eq", "status", "new"]),
    count(supabase, "tasks", ["neq", "status", "done"]),
    isAdmin ? supabase.from("clients").select("retainer_amount, currency").eq("status", "active").not("retainer_amount", "is", null) : Promise.resolve({ data: null }),
    supabase.from("leads").select("id, name, email, company, status, created_at").order("created_at", { ascending: false }).limit(5),
    supabase.from("tasks").select("id, title, due_date, priority, status, project:projects(name)").neq("status", "done").order("due_date", { ascending: true, nullsFirst: false }).limit(5),
  ]);

  const mrrTotals: Record<string, number> = {};
  for (const r of retainers.data ?? []) mrrTotals[r.currency] = (mrrTotals[r.currency] ?? 0) + Number(r.retainer_amount);
  const mrrEntries = Object.entries(mrrTotals).sort((a, b) => b[1] - a[1]);
  const fmt = (n: number | null) => (n === null ? "—" : formatNumber(n, locale));

  const kpis = [
    { label: o.kpis.activeClients, value: fmt(clients), icon: Briefcase },
    { label: o.kpis.activeProjects, value: fmt(projects), icon: FolderKanban },
    { label: o.kpis.liveCampaigns, value: fmt(campaigns), icon: Megaphone },
    isAdmin
      ? {
          label: o.kpis.mrr,
          value: mrrEntries.length ? formatMoney(mrrEntries[0][1], mrrEntries[0][0], locale) : "—",
          hint: mrrEntries.length > 1 ? `+ ${mrrEntries.slice(1).map(([c, v]) => formatMoney(v, c, locale)).join(" · ")}` : undefined,
          icon: Wallet,
          accent: "energy" as const,
        }
      : { label: o.kpis.openTasks, value: fmt(openTasks), icon: ListChecks, accent: "energy" as const },
  ];

  const quick = [
    { label: t.modules.clients.action, href: "/dashboard/clients" },
    { label: t.modules.projects.action, href: "/dashboard/projects" },
    { label: t.modules.campaigns.action, href: "/dashboard/campaigns" },
    { label: t.modules.tasks.action, href: "/dashboard/tasks" },
  ];
  const opts = t.options;

  return (
    <>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {kpis.map((k) => <StatCard key={k.label} label={k.label} value={k.value} icon={k.icon} hint={"hint" in k ? k.hint : undefined} accent={k.accent} />)}
      </div>
      <div className="grid gap-4 xl:grid-cols-3">
        <Panel
          title={`${o.latestLeads}${newLeads ? ` · ${formatNumber(newLeads, locale)} ${opts.new}` : ""}`}
          className="xl:col-span-2"
          actions={<Link href={localizedHref(locale, "/dashboard/leads")} className="text-xs font-medium text-blue-300 hover:text-white">{dict.common.viewAll}</Link>}
        >
          {leads.data?.length ? (
            <ul className="divide-y divide-line">
              {leads.data.map((l) => (
                <li key={l.id} className="flex items-center justify-between gap-4 px-5 py-3.5 text-sm">
                  <div className="min-w-0">
                    <p className="truncate font-medium">{l.name}{l.company ? <span className="text-ink-subtle"> · {l.company}</span> : null}</p>
                    <p className="truncate text-xs text-ink-subtle" dir="ltr">{l.email}</p>
                  </div>
                  <div className="flex shrink-0 items-center gap-3">
                    <span className="hidden text-xs text-ink-subtle sm:inline">{formatDate(l.created_at, locale)}</span>
                    <StatusBadge value={l.status} label={opts[l.status as keyof typeof opts] ?? l.status} />
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <EmptyState icon={Inbox} title={o.noData} body={o.leadsEmpty} />
          )}
        </Panel>
        <div className="space-y-4">
          <Panel title={o.quickActions}>
            <ul className="grid grid-cols-2 gap-2 p-4">
              {quick.map((q) => (
                <li key={q.href}>
                  <Link href={localizedHref(locale, q.href)} className="flex h-full items-center gap-2 rounded-lg border border-line px-3 py-2.5 text-sm text-ink-muted transition-colors hover:border-blue/40 hover:text-white">
                    <Plus className="size-4 shrink-0 text-blue" aria-hidden />{q.label}
                  </Link>
                </li>
              ))}
            </ul>
          </Panel>
          <Panel title={o.upcoming} actions={<Link href={localizedHref(locale, "/dashboard/tasks")} className="text-xs font-medium text-blue-300 hover:text-white">{dict.common.viewAll}</Link>}>
            {tasks.data?.length ? (
              <ul className="divide-y divide-line">
                {tasks.data.map((task) => {
                  const overdue = task.due_date && task.due_date < today;
                  return (
                    <li key={task.id} className="px-5 py-3 text-sm">
                      <p className="truncate font-medium">{task.title}</p>
                      <p className={overdue ? "text-xs text-yellow" : "text-xs text-ink-subtle"}>
                        {formatDate(task.due_date, locale)} · {opts[task.priority as keyof typeof opts]}
                        {(task.project as unknown as { name: string } | null)?.name ? ` · ${(task.project as unknown as { name: string }).name}` : ""}
                      </p>
                    </li>
                  );
                })}
              </ul>
            ) : (
              <EmptyState icon={CalendarClock} title={o.upcomingEmpty} className="py-8" />
            )}
          </Panel>
        </div>
      </div>
      <Panel title={t.ai.hubTitle} actions={<Link href={localizedHref(locale, "/dashboard/ai")} className="text-xs font-medium text-blue-300 hover:text-white">{dict.common.viewAll}</Link>}>
        <ul className="grid gap-px bg-line sm:grid-cols-2 lg:grid-cols-4">
          {aiTools.slice(0, 4).map((tool) => (
            <li key={tool.key} className="bg-surface-1">
              <Link href={localizedHref(locale, `/dashboard/ai/${tool.slug}`)} className="flex items-center gap-3 p-4 transition-colors hover:bg-white/[0.03]">
                <IconTile icon={toolIcons[tool.key]} className="size-9" />
                <span className="text-sm font-medium">{dict.aiTools[tool.key].name}</span>
              </Link>
            </li>
          ))}
        </ul>
      </Panel>
    </>
  );
}

async function ClientOverview({ supabase, dict, locale }: { supabase: SupabaseClient; dict: Dictionary; locale: Locale }) {
  const t = dict.dashboard;
  const o = t.overview;
  const [linked, projects, campaigns, reports, outstanding, projectRows] = await Promise.all([
    count(supabase, "clients"),
    count(supabase, "projects", ["eq", "status", "active"]),
    count(supabase, "campaigns", ["eq", "status", "active"]),
    count(supabase, "reports"),
    count(supabase, "invoices", ["in", "status", ["sent", "overdue"]]),
    supabase.from("projects").select("id, name, stage, status, progress, due_date, decision_status").order("created_at", { ascending: false }).limit(6),
  ]);
  const fmt = (n: number | null) => (n === null ? "—" : formatNumber(n, locale));

  if (!linked) {
    return <div className="surface-card"><EmptyState icon={Briefcase} title={o.noData} body={o.noClientAccount} /></div>;
  }
  // Self-serve workspaces with no agency work yet: keep the overview focused on brand & AI.
  if (!projects && !campaigns && !reports && !outstanding && !projectRows.data?.length) return null;

  return (
    <>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label={o.kpis.activeProjects} value={fmt(projects)} icon={FolderKanban} />
        <StatCard label={o.kpis.liveCampaigns} value={fmt(campaigns)} icon={Megaphone} />
        <StatCard label={o.kpis.publishedReports} value={fmt(reports)} icon={BarChart3} />
        <StatCard label={o.kpis.outstandingInvoices} value={fmt(outstanding)} icon={FileText} accent="energy" />
      </div>
      <Panel title={o.yourProjects} actions={<Link href={localizedHref(locale, "/dashboard/projects")} className="text-xs font-medium text-blue-300 hover:text-white">{dict.common.viewAll}</Link>}>
        {projectRows.data?.length ? (
          <ul className="divide-y divide-line">
            {projectRows.data.map((p) => (
              <li key={p.id}>
                <Link href={localizedHref(locale, `/dashboard/projects/${p.id}`)} className="flex flex-wrap items-center justify-between gap-4 px-5 py-3.5 text-sm hover:bg-white/[0.02]">
                  <div>
                    <p className="font-medium">{p.name}</p>
                    <p className="text-xs text-ink-subtle">{t.options[p.stage as keyof typeof t.options]} · {formatDate(p.due_date, locale)}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <StatusBadge value={p.decision_status} label={t.options[p.decision_status as keyof typeof t.options] ?? p.decision_status} />
                    <div className="h-1.5 w-24 overflow-hidden rounded-full bg-white/10"><div className="h-full rounded-full bg-blue" style={{ width: `${p.progress}%` }} /></div>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <EmptyState icon={FolderKanban} title={t.modules.projects.emptyTitle} />
        )}
      </Panel>
    </>
  );
}

/** Client workspace: brand kit, plan usage and on-brand AI tools. */
async function WorkspaceSummary({ supabase, dict, locale, workspace, userId }: { supabase: SupabaseClient; dict: Dictionary; locale: Locale; workspace: Workspace; userId: string }) {
  const d = dict.dashboard;
  const [kit, usage] = await Promise.all([getActiveBrandKit(supabase, workspace.id), getUsage(supabase, userId, workspace)]);
  const logo = await resolveKitLogo(supabase, kit);
  const clientTools = aiTools.filter((tool) => tool.access === "all");
  return (
    <div className="grid gap-4 lg:grid-cols-3">
      <Link href={localizedHref(locale, "/dashboard/brand")} className="surface-card ring-glow-hover flex items-center gap-4 p-5">
        <SvgLogo svg={logo.svg} url={logo.url} alt={kit?.name ?? workspace.name} className="size-16 shrink-0" />
        <div className="min-w-0">
          <p className="text-xs text-ink-subtle">{d.brand.kitTitle}</p>
          <p className="truncate font-semibold">{kit?.name ?? workspace.name}</p>
          {kit ? (
            <div className="mt-1.5 flex gap-1" aria-hidden>{kit.palette?.slice(0, 5).map((c, i) => <span key={i} className="size-3.5 rounded-full border border-line" style={{ backgroundColor: c.hex }} />)}</div>
          ) : (
            <p className="mt-1 text-xs text-yellow">{d.brand.noKit} — {d.brand.generate}</p>
          )}
        </div>
      </Link>
      <Link href={localizedHref(locale, "/dashboard/plan")} className="surface-card ring-glow-hover p-5">
        <div className="flex items-center justify-between">
          <p className="text-xs text-ink-subtle">{d.plan.usageTitle}</p>
          <span className="text-xs font-semibold text-blue-300">{d.plan.tiers[usage.tier].name}</span>
        </div>
        {[
          [d.plan.aiGenerations, usage.ai],
          [d.plan.identityGenerations, usage.identity],
        ].map(([label, m]) => {
          const meter = m as { used: number; limit: number };
          const pct = Math.min(100, Math.round((meter.used / Math.max(1, meter.limit)) * 100));
          return (
            <div key={label as string} className="mt-3">
              <div className="flex justify-between text-xs"><span className="text-ink-muted">{label as string}</span><span className="tabular-nums">{meter.used}/{meter.limit}</span></div>
              <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-white/10"><div className={pct >= 100 ? "h-full bg-orange" : "h-full bg-blue"} style={{ width: `${pct}%` }} /></div>
            </div>
          );
        })}
      </Link>
      <div className="surface-card p-5">
        <p className="text-xs text-ink-subtle">{d.ai.hubTitle}</p>
        <ul className="mt-2 space-y-1">
          {clientTools.map((tool) => {
            const Icon = toolIcons[tool.key];
            return (
              <li key={tool.key}>
                <Link href={localizedHref(locale, `/dashboard/ai/${tool.slug}`)} className="flex items-center gap-2.5 rounded-lg px-2 py-1.5 text-sm hover:bg-white/5">
                  <Icon className="size-4 text-yellow" aria-hidden />
                  {dict.aiTools[tool.key].name}
                </Link>
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}

/** Development preview without Supabase — no numbers are invented. */
function PreviewOverview({ dict }: { dict: Dictionary; locale: Locale }) {
  const o = dict.dashboard.overview;
  return (
    <div className="space-y-8">
      <PageHeader title={o.greeting} description={o.subtitle} />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[
          { label: o.kpis.activeClients, icon: Briefcase },
          { label: o.kpis.activeProjects, icon: FolderKanban },
          { label: o.kpis.liveCampaigns, icon: Megaphone },
          { label: o.kpis.newLeads, icon: Inbox },
        ].map((k) => <StatCard key={k.label} label={k.label} value="—" icon={k.icon} hint={o.noData} />)}
      </div>
      <div className="surface-card"><EmptyState icon={Inbox} title={o.noData} body={dict.dashboard.crud.notConfigured} /></div>
    </div>
  );
}
