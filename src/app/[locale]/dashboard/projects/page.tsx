import { ModuleView } from "@/components/dashboard/crud/module-view";
import { modules } from "@/config/modules";
import { loadPage } from "@/lib/page";

export async function generateMetadata({ params }: PageProps<"/[locale]/dashboard/projects">) {
  const { dict } = await loadPage(params);
  return { title: dict.dashboard.modules.projects.title };
}

/** Projects list — staff see all; clients see and manage their own (RLS). Rows open the decision view. */
export default async function ProjectsPage({ params, searchParams }: PageProps<"/[locale]/dashboard/projects">) {
  const { locale, dict } = await loadPage(params);
  return <ModuleView def={modules.projects} locale={locale} dict={dict} searchParams={await searchParams} />;
}
