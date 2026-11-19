import { ModuleView } from "@/components/dashboard/crud/module-view";
import { modules } from "@/config/modules";
import { loadPage } from "@/lib/page";

export async function generateMetadata({ params }: PageProps<"/[locale]/dashboard/ai/history">) {
  const { dict } = await loadPage(params);
  return { title: dict.dashboard.modules.generations.title };
}

/** AI library: staff see agency generations; clients see items shared with them (RLS). */
export default async function AiHistoryPage({ params, searchParams }: PageProps<"/[locale]/dashboard/ai/history">) {
  const { locale, dict } = await loadPage(params);
  return <ModuleView def={modules.generations} locale={locale} dict={dict} searchParams={await searchParams} />;
}
