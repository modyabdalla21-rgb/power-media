import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Eye, Lock } from "lucide-react";
import { CopyButton } from "@/components/ai/copy-button";
import { Markdown } from "@/components/ai/markdown";
import { polishOutput } from "@/lib/ai/polish";
import { StaticPostStudio, type PostLogo, type StaticPostData } from "@/components/ai/static-post-studio";
import { BRAND_BUCKET, getActiveBrandKit, resolveKitLogo } from "@/lib/client/workspace";
import { IdentityConceptsView } from "@/components/brand/identity-view";
import type { LogoImage } from "@/components/brand/concept-logo";
import type { BrandIdentity } from "@/lib/ai/identity";
import { clientFields } from "@/components/dashboard/crud/module-view";
import { ConfirmDelete } from "@/components/dashboard/crud/delete-button";
import { RecordDialog } from "@/components/dashboard/crud/record-dialog";
import { StatusBadge } from "@/components/dashboard/crud/status-badge";
import { can, modules } from "@/config/modules";
import { contentLocale, localizedHref } from "@/i18n/config";
import { deleteRecord } from "@/lib/crud/actions";
import { loadRelationOptions } from "@/lib/crud/queries";
import { getToolByKey, isArabicOutput } from "@/lib/ai/tools";
import { formatDate, formatNumber } from "@/lib/format";
import { loadPage } from "@/lib/page";
import { createSupabaseServerClient, getCurrentProfile } from "@/lib/supabase/server";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

type Generation = {
  id: string; title: string; tool: string; output: string | null; inputs: Record<string, string> | null; data: BrandIdentity | null;
  provider: string | null; model: string | null; language: string | null; tokens_in: number | null; tokens_out: number | null;
  truncated: boolean; shared_with_client: boolean; client_id: string | null; project_id: string | null; user_id: string; created_at: string;
  client: { name: string } | null; project: { name: string } | null; author: { full_name: string | null; email: string } | null;
};

export async function generateMetadata({ params }: PageProps<"/[locale]/dashboard/ai/history/[id]">) {
  const { dict } = await loadPage(params);
  return { title: dict.dashboard.modules.generations.title, robots: { index: false } };
}

export default async function GenerationPage({ params }: PageProps<"/[locale]/dashboard/ai/history/[id]">) {
  const { id } = await params;
  const { locale, dict } = await loadPage(params);
  if (!UUID.test(id)) notFound();
  const supabase = await createSupabaseServerClient();
  const profile = await getCurrentProfile();
  if (!supabase || !profile) notFound();

  const def = modules.generations;
  const { data } = await supabase.from("ai_generations").select(def.select).eq("id", id).maybeSingle();
  if (!data) notFound(); // missing or not visible under RLS
  const g = data as unknown as Generation;

  const t = dict.dashboard.ai;
  const d = t.detail;
  const opts = dict.dashboard.options;
  const isStaff = profile.role !== "client";
  // Mirrors RLS: team edits/deletes own items, admin any.
  const canManage = can(profile.role, def.roles.update) && (g.user_id === profile.id || profile.role === "admin");
  const canDelete = g.user_id === profile.id || profile.role === "admin";
  const canApply = !!g.client_id && (isStaff || g.user_id === profile.id);
  const relations = canManage ? await loadRelationOptions(supabase, ["clients", "projects"]) : {};
  const fields = clientFields(def, dict, relations);
  const values = { id: g.id, title: g.title, client_id: g.client_id ?? "", project_id: g.project_id ?? "", shared_with_client: String(g.shared_with_client) };
  const tool = getToolByKey(g.tool);
  const libraryHref = localizedHref(locale, "/dashboard/ai/history");
  const dir = g.language && isArabicOutput(g.language) ? "rtl" : "ltr";

  // Identity: logo images already rendered for this generation (private storage → signed URLs).
  const logoImages: (LogoImage | null)[] = [null, null, null];
  if (g.tool === "brandIdentity") {
    const { data: rows } = await supabase.from("brand_logo_images").select("concept, storage_path, mime_type").eq("generation_id", g.id);
    const base = (g.data?.brand_name ?? "logo").replace(/[^\p{L}\p{N}]+/gu, "-").replace(/^-|-$/g, "").slice(0, 40) || "logo";
    await Promise.all(
      (rows ?? []).map(async (r) => {
        const fileName = `${base}-logo-${r.concept + 1}.${r.mime_type === "image/jpeg" ? "jpg" : r.mime_type === "image/webp" ? "webp" : "png"}`;
        const [view, dl] = await Promise.all([
          supabase.storage.from(BRAND_BUCKET).createSignedUrl(r.storage_path, 3600),
          supabase.storage.from(BRAND_BUCKET).createSignedUrl(r.storage_path, 3600, { download: fileName }),
        ]);
        if (view.data?.signedUrl && r.concept >= 0 && r.concept <= 2) logoImages[r.concept] = { url: view.data.signedUrl, downloadUrl: dl.data?.signedUrl ?? null, fileName, stored: true };
      }),
    );
  }

  // Static posts: re-sign the product photo and the brand's current logo for the composer.
  const raw = g.data as unknown as Partial<StaticPostData> | null;
  const postData = g.tool === "staticPost" && Array.isArray(raw?.posts) && raw?.brand ? (raw as StaticPostData) : null;
  let postImage: string | null = null;
  let postLogo: PostLogo = null;
  if (postData && g.client_id) {
    const [image, kit] = await Promise.all([
      postData.brand.imageId ? supabase.from("brand_assets").select("storage_path").eq("id", postData.brand.imageId).maybeSingle() : Promise.resolve({ data: null }),
      getActiveBrandKit(supabase, g.client_id),
    ]);
    if (image.data) postImage = (await supabase.storage.from(BRAND_BUCKET).createSignedUrl(image.data.storage_path, 3600)).data?.signedUrl ?? null;
    postLogo = await resolveKitLogo(supabase, kit);
  }

  // Readable brief (staff only): label each input using the tool schema.
  const brief = isStaff && tool && g.inputs
    ? tool.fields
        .filter((f) => g.inputs?.[f.name] && f.type !== "client" && f.type !== "project" && f.type !== "image")
        .map((f) => ({ label: f.label[contentLocale(locale)], value: f.options?.find((o) => o.value === g.inputs?.[f.name])?.label[contentLocale(locale)] ?? g.inputs![f.name] }))
    : [];

  return (
    <div className="space-y-6">
      <Link href={libraryHref} className="inline-flex items-center gap-1.5 text-sm text-ink-muted hover:text-white">
        <ArrowLeft className="flip-rtl size-4" aria-hidden />
        {d.back}
      </Link>

      <div className="flex flex-col gap-4 border-b border-line pb-6 lg:flex-row lg:items-end lg:justify-between">
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-wider text-blue-300">{opts[g.tool as keyof typeof opts] ?? g.tool}</p>
          <h1 className="mt-2 text-2xl font-bold tracking-tight text-balance sm:text-3xl">{g.title}</h1>
          <p className="mt-2 text-sm text-ink-muted">
            {[g.client?.name, g.project?.name, formatDate(g.created_at, locale)].filter(Boolean).join(" · ")}
          </p>
        </div>
        <div className="flex shrink-0 flex-wrap items-center gap-2">
          {g.output && <CopyButton text={g.output} label={t.copy} copiedLabel={t.copied} />}
          {canManage && (
            <RecordDialog moduleKey="generations" title={`${dict.dashboard.crud.editTitle} — ${g.title}`} fields={fields} values={values} t={dict.dashboard.crud} triggerVariant="edit" triggerLabel={dict.dashboard.crud.edit} />
          )}
          {canDelete && <ConfirmDelete action={deleteRecord} hidden={{ _module: "generations", _id: g.id, _redirect: libraryHref }} t={dict.dashboard.crud} />}
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-4">
        <article className="surface-card p-6 sm:p-8 xl:col-span-3">
          {!isStaff && <p className="mb-6 text-xs text-ink-subtle">{d.clientView}</p>}
          {g.truncated && <p className="mb-4 text-xs text-yellow">{t.truncated}</p>}
          {g.tool === "staticPost" && postData ? (
            <StaticPostStudio data={postData} imageUrl={postImage} logo={postLogo} t={dict.dashboard.post} dir={dir} />
          ) : g.tool === "brandIdentity" && g.data?.concepts ? (
            <IdentityConceptsView identity={g.data} d={dict.dashboard} generationId={g.id} canApply={canApply} brandHref={profile.role === "client" ? localizedHref(locale, "/dashboard/brand") : undefined} dir={dir} images={logoImages} />
          ) : (
            <Markdown text={polishOutput(g.output ?? "", g.language)} dir={dir} />
          )}
          {isStaff && <p className="mt-8 border-t border-line pt-4 text-xs text-ink-subtle">{t.disclaimer}</p>}
        </article>

        {isStaff && (
          <aside className="space-y-4">
            <div className="surface-card space-y-3 p-5 text-sm">
              <p className="flex items-start gap-2">
                {g.shared_with_client ? <Eye className="mt-0.5 size-4 shrink-0 text-blue-300" aria-hidden /> : <Lock className="mt-0.5 size-4 shrink-0 text-ink-subtle" aria-hidden />}
                <span className={g.shared_with_client ? "text-blue-300" : "text-ink-muted"}>{g.shared_with_client ? d.sharedNote : d.privateNote}</span>
              </p>
              <dl className="space-y-2 border-t border-line pt-3 text-xs">
                {[
                  [d.generatedBy, g.author?.full_name ?? g.author?.email ?? "—"],
                  [d.model, [g.provider, g.model].filter(Boolean).join(" · ") || "—"],
                  [d.tokens, g.tokens_in || g.tokens_out ? `${formatNumber(g.tokens_in ?? 0, locale)} → ${formatNumber(g.tokens_out ?? 0, locale)}` : "—"],
                ].map(([k, v]) => (
                  <div key={k} className="flex justify-between gap-3">
                    <dt className="text-ink-subtle">{k}</dt>
                    <dd className="min-w-0 break-words text-end text-ink-muted" dir="auto">{v}</dd>
                  </div>
                ))}
              </dl>
              {g.shared_with_client && <StatusBadge value="active" label={dict.dashboard.fields.sharedWithClient} />}
            </div>
            {brief.length > 0 && (
              <div className="surface-card p-5">
                <h2 className="text-sm font-semibold">{d.brief}</h2>
                <dl className="mt-3 space-y-3 text-sm">
                  {brief.map((b) => (
                    <div key={b.label}>
                      <dt className="text-xs text-ink-subtle">{b.label}</dt>
                      <dd className="mt-0.5 whitespace-pre-wrap break-words text-ink-muted" dir="auto">{b.value}</dd>
                    </div>
                  ))}
                </dl>
              </div>
            )}
          </aside>
        )}
      </div>
    </div>
  );
}
