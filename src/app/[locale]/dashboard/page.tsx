import Link from "next/link";
import { Activity, Briefcase, CalendarClock, FolderKanban, Megaphone, Plus, Wallet } from "lucide-react";
import { EmptyState, PageHeader, Panel, StatCard } from "@/components/dashboard/primitives";
import { IconTile, toolIcons } from "@/components/site/icons";
import { localizedHref } from "@/i18n/config";
import { aiTools } from "@/lib/ai/tools";
import { loadPage } from "@/lib/page";

export default async function DashboardOverview({ params }: PageProps<"/[locale]/dashboard">) {
  const { locale, dict } = await loadPage(params);
  const t = dict.dashboard;
  const o = t.overview;
  // Phase 2: replace with Supabase aggregate queries. "—" means no data, never a made-up number.
  const kpis = [
    { label: o.kpis.activeClients, icon: Briefcase },
    { label: o.kpis.activeProjects, icon: FolderKanban },
    { label: o.kpis.liveCampaigns, icon: Megaphone },
    { label: o.kpis.mrr, icon: Wallet, accent: "energy" as const },
  ];
  const quick = [
    { label: t.modules.clients.action, href: "/dashboard/clients" },
    { label: t.modules.projects.action, href: "/dashboard/projects" },
    { label: t.modules.campaigns.action, href: "/dashboard/campaigns" },
    { label: t.modules.invoices.action, href: "/dashboard/invoices" },
  ];

  return (
    <div className="space-y-8">
      <PageHeader title={o.greeting} description={o.subtitle} />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {kpis.map((k) => <StatCard key={k.label} label={k.label} value="—" icon={k.icon} hint={o.noData} accent={k.accent} />)}
      </div>
      <div className="grid gap-4 xl:grid-cols-3">
        <Panel title={o.recentActivity} className="xl:col-span-2">
          <EmptyState icon={Activity} title={o.noData} body={o.activityEmpty} />
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
          <Panel title={o.upcoming}>
            <EmptyState icon={CalendarClock} title={o.upcomingEmpty} className="py-8" />
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
    </div>
  );
}
