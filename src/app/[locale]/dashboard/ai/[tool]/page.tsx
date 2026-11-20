import { notFound, redirect } from "next/navigation";
import { getActiveBrandKit, getClientWorkspace } from "@/lib/client/workspace";
import { PageHeader } from "@/components/dashboard/primitives";
import { ToolWorkspace, type ClientToolField } from "@/components/ai/tool-workspace";
import { IconTile, toolIcons } from "@/components/site/icons";
import { contentLocale, localizedHref, locales } from "@/i18n/config";
import { aiTools, getToolBySlug } from "@/lib/ai/tools";
import { loadPage } from "@/lib/page";
import { createSupabaseServerClient, getCurrentProfile } from "@/lib/supabase/server";

// Generation runs in /api/ai/[tool] (maxDuration 60 there). Set here too so
// any server work for this page is never cut off at a 10s platform default.
export const maxDuration = 60;
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

export default async function AiToolPage({ params, searchParams }: PageProps<"/[locale]/dashboard/ai/[tool]">) {
  const { tool: slug } = await params;
  const { locale, dict } = await loadPage(params);
  const tool = getToolBySlug(slug);
  if (!tool) notFound();
  const profile = await getCurrentProfile();
  const isClient = profile?.role === "client";
  if (isClient && tool.access !== "all") redirect(localizedHref(locale, "/dashboard/ai"));
  // Analysis & plans run from the Brand hub.
  if (tool.hub || tool.output === "analysis" || tool.output === "plan") redirect(localizedHref(locale, isClient ? "/dashboard/brand" : "/dashboard/brand-tasks"));
  const meta = dict.aiTools[tool.key];
  const cl = contentLocale(locale);
  const t = dict.dashboard.ai;

  const supabase = await createSupabaseServerClient();
  const workspace = isClient ? await getClientWorkspace() : null;
  const kit = supabase && workspace ? await getActiveBrandKit(supabase, workspace.id) : null;

  // Staff link outputs to clients/projects (RLS-scoped); clients always work in their own workspace.
  // RLS limits clients to their own projects.
  const [clients, projects] = supabase
    ? await Promise.all([
        isClient ? Promise.resolve({ data: [] }) : supabase.from("clients").select("id, name").order("name").limit(500),
        supabase.from("projects").select("id, name, client_id, client:clients(name)").order("name").limit(500),
      ])
    : [{ data: [] }, { data: [] }];
  const sp = await searchParams;
  const requestedProject = typeof sp.project === "string" ? sp.project : undefined;
  const clientOptions = (clients.data ?? []).map((c) => ({ value: c.id as string, label: c.name as string }));
  const projectOptions = (projects.data ?? []).map((p) => {
    const client = (p.client as unknown as { name: string } | null)?.name;
    return { value: p.id as string, label: client && !isClient ? `${p.name} — ${client}` : (p.name as string), clientId: p.client_id as string };
  });

  // Prefill from the client's brand profile.
  const linkedProject = projectOptions.find((o) => o.value === requestedProject);
  // "Do it with AI" from a Brand hub task/step pre-fills the brief.
  const brief = typeof sp.brief === "string" ? sp.brief.slice(0, 300) : "";
  const briefField = ({ adStudio: "message", mediaPlanner: "offer" } as Record<string, string>)[tool.key];
  const prefill: Record<string, string | null | undefined> = workspace
    ? {
        brand: workspace.name,
        industry: workspace.industry,
        audience: workspace.audience,
        personality: workspace.tone,
        market: workspace.market && workspace.market !== "other" ? workspace.market : undefined,
        language: workspace.dialect ?? (locale === "eg" ? "ar_eg" : locale === "ar" ? "ar_msa" : undefined),
      }
    : locale === "eg"
      ? { language: "ar_eg" }
      : {};

  // Only serialisable labels/options go to the client — prompts stay on the server.
  const fields: ClientToolField[] = tool.fields
    // Clients never pick a client (it's their workspace) but may link one of their projects.
    .filter((f) => !isClient || f.type !== "client")
    .map((f) => {
      const options = f.type === "client" ? clientOptions : f.type === "project" ? projectOptions : (f.options ?? []).map((o) => ({ value: o.value, label: o.label[cl] }));
      const pre =
        f.type === "project" ? linkedProject?.value : f.type === "client" ? linkedProject?.clientId : brief && f.name === briefField ? brief : prefill[f.name];
      const usable = pre && (f.type !== "select" || options.some((o) => o.value === pre));
      return {
        name: f.name,
        type: f.type,
        required: !!f.required,
        label: f.label[cl],
        placeholder: f.placeholder?.[cl],
        options,
        defaultValue: usable ? (pre as string) : f.defaultValue,
        max: f.max,
        wide: f.wide,
      };
    });

  const brandNote =
    isClient && tool.output !== "identity"
      ? kit
        ? { text: t.brandContext.replace("{name}", kit.name) }
        : { text: t.noBrandKit, warn: true }
      : null;

  return (
    <div className="space-y-8">
      <div className="flex items-start gap-4">
        <IconTile icon={toolIcons[tool.key]} tone="energy" className="mt-1 hidden sm:inline-flex" />
        <div className="flex-1"><PageHeader title={tool.output === "identity" ? dict.dashboard.identity.title : meta.name} description={tool.output === "identity" ? dict.dashboard.identity.subtitle : meta.description} /></div>
      </div>
      <ToolWorkspace
        slug={tool.slug}
        fields={fields}
        t={t}
        d={dict.dashboard}
        libraryHref={localizedHref(locale, "/dashboard/ai/history")}
        languageField={tool.languageField}
        mode={tool.output === "identity" ? "identity" : "markdown"}
        brandNote={brandNote}
        brandHref={isClient ? localizedHref(locale, "/dashboard/brand") : undefined}
        canApply={tool.output === "identity"}
      />
    </div>
  );
}
