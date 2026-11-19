import { notFound } from "next/navigation";
import { PageHeader } from "@/components/dashboard/primitives";
import { ToolWorkspace } from "@/components/ai/tool-workspace";
import { IconTile, toolIcons } from "@/components/site/icons";
import { locales } from "@/i18n/config";
import { aiTools, getToolBySlug } from "@/lib/ai/tools";
import { loadPage } from "@/lib/page";

export const dynamicParams = false;
export function generateStaticParams() {
  return locales.flatMap((locale) => aiTools.map((t) => ({ locale, tool: t.slug })));
}

export async function generateMetadata({ params }: PageProps<"/[locale]/dashboard/ai/[tool]">) {
  const { tool } = await params;
  const { dict } = await loadPage(params);
  const def = getToolBySlug(tool);
  return { title: def ? dict.aiTools[def.key].name : undefined };
}

export default async function AiToolPage({ params }: PageProps<"/[locale]/dashboard/ai/[tool]">) {
  const { tool: slug } = await params;
  const { locale, dict } = await loadPage(params);
  const tool = getToolBySlug(slug);
  if (!tool) notFound();
  const meta = dict.aiTools[tool.key];

  return (
    <div className="space-y-8">
      <div className="flex items-start gap-4">
        <IconTile icon={toolIcons[tool.key]} tone="energy" className="mt-1 hidden sm:inline-flex" />
        <div className="flex-1"><PageHeader title={meta.name} description={meta.description} /></div>
      </div>
      {/* Only serialisable field data goes to the client — never prompts or keys. */}
      <ToolWorkspace
        locale={locale}
        slug={tool.slug}
        fields={tool.fields.map((f) => ({
          name: f.name,
          type: f.type,
          required: !!f.required,
          label: f.label[locale],
          placeholder: f.placeholder?.[locale],
          options: f.options?.map((o) => ({ value: o.value, label: o.label[locale] })),
        }))}
        t={dict.dashboard.ai}
      />
    </div>
  );
}
