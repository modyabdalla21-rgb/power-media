import { notFound } from "next/navigation";
import { Plus, Search } from "lucide-react";
import { DataTable, EmptyState, PageHeader } from "@/components/dashboard/primitives";
import { Button } from "@/components/ui/button";
import { moduleIcons, moduleKeys, type ModuleKey } from "@/config/dashboard";
import { locales } from "@/i18n/config";
import { loadPage } from "@/lib/page";

/**
 * Generic agency module view (clients, projects, campaigns, …).
 * Phase 2 replaces the empty rows with Supabase queries and enables the
 * create actions. A dedicated folder (e.g. dashboard/clients/) will take
 * precedence over this dynamic route when a module needs custom UI.
 */
export const dynamicParams = false;
export function generateStaticParams() {
  return locales.flatMap((locale) => moduleKeys.map((module) => ({ locale, module })));
}

export async function generateMetadata({ params }: PageProps<"/[locale]/dashboard/[module]">) {
  const { module } = await params;
  const { dict } = await loadPage(params);
  return { title: dict.dashboard.modules[module as ModuleKey]?.title };
}

export default async function ModulePage({ params }: PageProps<"/[locale]/dashboard/[module]">) {
  const { module } = await params;
  if (!(moduleKeys as readonly string[]).includes(module)) notFound();
  const { dict } = await loadPage(params);
  const key = module as ModuleKey;
  const m = dict.dashboard.modules[key];
  const Icon = moduleIcons[key];
  const phaseNote = dict.dashboard.comingInPhase;

  return (
    <div className="space-y-6">
      <PageHeader
        title={m.title}
        description={m.description}
        actions={
          <Button disabled title={phaseNote} aria-describedby={`${key}-phase`}>
            <Plus className="size-4" aria-hidden />
            {m.action}
          </Button>
        }
      />
      <p id={`${key}-phase`} className="sr-only">{phaseNote}</p>
      <div className="relative max-w-sm">
        <Search className="pointer-events-none absolute start-3 top-1/2 size-4 -translate-y-1/2 text-ink-subtle" aria-hidden />
        <input type="search" disabled placeholder={dict.dashboard.search} aria-label={dict.dashboard.search}
          className="h-10 w-full rounded-(--radius-control) border border-line-strong bg-surface-1 ps-9 pe-3 text-sm placeholder:text-ink-subtle disabled:opacity-60" />
      </div>
      <DataTable
        columns={m.columns}
        rows={[]}
        empty={<EmptyState icon={Icon} title={m.emptyTitle} body={m.emptyBody} action={<span className="rounded-full border border-line-strong px-3 py-1 text-xs text-ink-subtle">{phaseNote}</span>} />}
      />
    </div>
  );
}
