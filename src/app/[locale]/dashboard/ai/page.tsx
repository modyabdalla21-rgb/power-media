import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { PageHeader } from "@/components/dashboard/primitives";
import { IconTile, toolIcons } from "@/components/site/icons";
import { localizedHref } from "@/i18n/config";
import { aiTools } from "@/lib/ai/tools";
import { loadPage } from "@/lib/page";

export default async function AiHubPage({ params }: PageProps<"/[locale]/dashboard/ai">) {
  const { locale, dict } = await loadPage(params);
  const t = dict.dashboard.ai;
  return (
    <div className="space-y-8">
      <PageHeader title={t.hubTitle} description={t.hubSubtitle} />
      <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {aiTools.map((tool, i) => (
          <li key={tool.key}>
            <Link href={localizedHref(locale, `/dashboard/ai/${tool.slug}`)} className="surface-card ring-glow-hover group flex h-full flex-col p-6">
              <div className="flex items-center justify-between">
                <IconTile icon={toolIcons[tool.key]} tone={i === 0 ? "energy" : "blue"} />
                <ArrowUpRight className="flip-rtl size-5 text-ink-subtle transition-colors group-hover:text-white" aria-hidden />
              </div>
              <h2 className="mt-5 font-semibold">{dict.aiTools[tool.key].name}</h2>
              <p className="mt-1.5 flex-1 text-sm leading-relaxed text-ink-muted">{dict.aiTools[tool.key].description}</p>
              <span className="mt-5 text-sm font-medium text-blue-300 group-hover:text-white">{t.open}</span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
