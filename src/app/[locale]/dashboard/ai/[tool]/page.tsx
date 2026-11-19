import { notFound, redirect } from "next/navigation";
import { PageHeader } from "@/components/dashboard/primitives";
import { ToolWorkspace, type ClientToolField } from "@/components/ai/tool-workspace";
import { IconTile, toolIcons } from "@/components/site/icons";
import { localizedHref, locales } from "@/i18n/config";
import { aiTools, getToolBySlug } from "@/lib/ai/tools";
import { loadPage } from "@/lib/page";
import { createSupabaseServerClient, getCurrentProfile } from "@/lib/supabase/server";

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
  const profile = await getCurrentProfile();
  if (profile?.role === "client") redirect(localizedHref(locale, "/dashboard/ai/history"));
  const meta = dict.aiTools[tool.key];

  // Link targets (RLS-scoped). Projects carry their client for filtering.
  const supabase = await createSupabaseServerClient();
  const [clients, projects] = supabase
    ? await Promise.all([
        supabase.from("clients").select("id, name").order("name").limit(500),
        supabase.from("projects").select("id, name, client_id, client:clients(name)").order("name").limit(500),
      ])
    : [{ data: [] }, { data: [] }];
  const clientOptions = (clients.data ?? []).map((c) => ({ value: c.id as string, label: c.name as string }));
  const projectOptions = (projects.data ?? []).map((p) => {
    const client = (p.client as unknown as { name: string } | null)?.name;
    return { value: p.id as string, label: client ? `${p.name} — ${client}` : (p.name as string), clientId: p.client_id as string };
  });

  // Only serialisable labels/options go to the client — prompts stay on the server.
  const fields: ClientToolField[] = tool.fields.map((f) => ({
    name: f.name,
    type: f.type,
    required: !!f.required,
    label: f.label[locale],
    placeholder: f.placeholder?.[locale],
    options: f.type === "client" ? clientOptions : f.type === "project" ? projectOptions : (f.options ?? []).map((o) => ({ value: o.value, label: o.label[locale] })),
    defaultValue: f.defaultValue,
    max: f.max,
    wide: f.wide,
  }));

  return (
    <div className="space-y-8">
      <div className="flex items-start gap-4">
        <IconTile icon={toolIcons[tool.key]} tone="energy" className="mt-1 hidden sm:inline-flex" />
        <div className="flex-1"><PageHeader title={meta.name} description={meta.description} /></div>
      </div>
      <ToolWorkspace
        slug={tool.slug}
        fields={fields}
        t={dict.dashboard.ai}
        crud={{ required: dict.dashboard.crud.required, invalid: dict.dashboard.crud.invalid }}
        libraryHref={localizedHref(locale, "/dashboard/ai/history")}
        languageField={tool.languageField}
      />
    </div>
  );
}
