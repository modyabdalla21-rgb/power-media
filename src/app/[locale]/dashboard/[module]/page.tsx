import { notFound } from "next/navigation";
import { ModuleView } from "@/components/dashboard/crud/module-view";
import { genericModuleKeys, modules, type ModuleKey } from "@/config/modules";
import { locales } from "@/i18n/config";
import { loadPage } from "@/lib/page";

/** Generic CRUD route. Team, Revenue and the AI library have dedicated routes. */
export const dynamicParams = false;
export function generateStaticParams() {
  return locales.flatMap((locale) => genericModuleKeys.map((module) => ({ locale, module })));
}

export async function generateMetadata({ params }: PageProps<"/[locale]/dashboard/[module]">) {
  const { module } = await params;
  const { dict } = await loadPage(params);
  return { title: dict.dashboard.modules[module as ModuleKey]?.title };
}

export default async function ModulePage({ params, searchParams }: PageProps<"/[locale]/dashboard/[module]">) {
  const { module } = await params;
  if (!(genericModuleKeys as readonly string[]).includes(module)) notFound();
  const { locale, dict } = await loadPage(params);
  return <ModuleView def={modules[module as ModuleKey]} locale={locale} dict={dict} searchParams={await searchParams} />;
}
