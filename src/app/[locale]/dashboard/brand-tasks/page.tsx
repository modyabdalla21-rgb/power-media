import { ModuleView } from "@/components/dashboard/crud/module-view";
import { modules } from "@/config/modules";
import { loadPage } from "@/lib/page";

export async function generateMetadata({ params }: PageProps<"/[locale]/dashboard/brand-tasks">) {
  const { dict } = await loadPage(params);
  return { title: dict.dashboard.modules.brandTasks.title };
}

/** Staff oversight of brand tasks (brands manage their own in the Brand hub). */
export default async function BrandTasksPage({ params, searchParams }: PageProps<"/[locale]/dashboard/brand-tasks">) {
  const { locale, dict } = await loadPage(params);
  return <ModuleView def={modules.brandTasks} locale={locale} dict={dict} searchParams={await searchParams} />;
}
