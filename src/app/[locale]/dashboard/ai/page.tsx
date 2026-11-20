import Link from "next/link";
import { ArrowUpRight, CircleCheck, CircleDashed, Library } from "lucide-react";
import { EmptyState, PageHeader, Panel } from "@/components/dashboard/primitives";
import { IconTile, toolIcons } from "@/components/site/icons";
import { localizedHref } from "@/i18n/config";
import { activeProviderIds } from "@/lib/ai/provider";
import { aiTools } from "@/lib/ai/tools";
import { formatDate } from "@/lib/format";
import { loadPage } from "@/lib/page";
import { createSupabaseServerClient, getCurrentProfile } from "@/lib/supabase/server";

export async function generateMetadata({ params }: PageProps<"/[locale]/dashboard/ai">) {
  const { dict } = await loadPage(params);
  return { title: dict.dashboard.ai.hubTitle };
}

export default async function AiHubPage({ params }: PageProps<"/[locale]/dashboard/ai">) {
  const { locale, dict } = await loadPage(params);
  const t = dict.dashboard.ai;
  const profile = await getCurrentProfile();
  const isClient = profile?.role === "client";
  const tools = aiTools.filter((tool) => !tool.hub && (!isClient || tool.access === "all"));

  const supabase = await createSupabaseServerClient();
  const providerReady = activeProviderIds().length > 0;
  const { data: recent } = supabase
    ? await supabase.from("ai_generations").select("id, title, tool, created_at").order("created_at", { ascending: false }).limit(6)
    : { data: null };
  const opts = dict.dashboard.options;

  return (
    <div className="space-y-8">
      <PageHeader
        title={t.hubTitle}
        description={isClient ? t.clientHubSubtitle : t.hubSubtitle}
        actions={isClient ? undefined : 
          <span className={providerReady ? "inline-flex items-center gap-1.5 text-xs text-blue-300" : "inline-flex items-center gap-1.5 text-xs text-yellow"}>
            {providerReady ? <CircleCheck className="size-4" aria-hidden /> : <CircleDashed className="size-4" aria-hidden />}
            {providerReady ? t.providerReady : ""}
          </span>
        }
      />
      {!providerReady && !isClient && (
        <p role="status" className="rounded-xl border border-orange/30 bg-orange/10 p-4 text-sm">{t.providerMissing}</p>
      )}
      <ul className="grid gap-4 md:grid-cols-3">
        {tools.map((tool, i) => (
          <li key={tool.key}>
            <Link href={localizedHref(locale, `/dashboard/ai/${tool.slug}`)} className="surface-card ring-glow-hover group flex h-full flex-col p-6">
              <div className="flex items-center justify-between">
                <IconTile icon={toolIcons[tool.key]} tone={i === 0 ? "energy" : "blue"} />
                <ArrowUpRight className="flip-rtl size-5 text-ink-subtle transition-colors group-hover:text-white" aria-hidden />
              </div>
              <h2 className="mt-5 font-semibold">{tool.output === "identity" ? dict.dashboard.identity.title : dict.aiTools[tool.key].name}</h2>
              <p className="mt-1.5 flex-1 text-sm leading-relaxed text-ink-muted">{dict.aiTools[tool.key].description}</p>
              <span className="mt-5 text-sm font-medium text-blue-300 group-hover:text-white">{t.open}</span>
            </Link>
          </li>
        ))}
      </ul>
      <Panel
        title={t.recent}
        actions={<Link href={localizedHref(locale, "/dashboard/ai/history")} className="text-xs font-medium text-blue-300 hover:text-white">{t.viewLibrary}</Link>}
      >
        {recent?.length ? (
          <ul className="divide-y divide-line">
            {recent.map((g) => (
              <li key={g.id}>
                <Link href={localizedHref(locale, `/dashboard/ai/history/${g.id}`)} className="flex items-center justify-between gap-4 px-5 py-3.5 text-sm transition-colors hover:bg-white/[0.02]">
                  <span className="min-w-0">
                    <span className="block break-words font-medium" dir="auto">{g.title}</span>
                    <span className="text-xs text-ink-subtle">{opts[g.tool as keyof typeof opts] ?? g.tool}</span>
                  </span>
                  <span className="shrink-0 text-xs text-ink-subtle">{formatDate(g.created_at, locale)}</span>
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <EmptyState icon={Library} title={t.noRecent} className="py-10" />
        )}
      </Panel>
    </div>
  );
}
