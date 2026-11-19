import Link from "next/link";
import { redirect } from "next/navigation";
import { Gem, Sparkles } from "lucide-react";
import { PaletteSwatches, SvgLogo, TypographyList, VoiceList } from "@/components/brand/brand-visuals";
import { ActivateKitButton } from "@/components/client/apply-concept";
import { BrandProfileForm } from "@/components/client/brand-profile-form";
import { BrandHelpButton } from "@/components/client/request-forms";
import { EmptyState, PageHeader, Panel } from "@/components/dashboard/primitives";
import { StatusBadge } from "@/components/dashboard/crud/status-badge";
import { LinkButton } from "@/components/ui/button";
import { localizedHref } from "@/i18n/config";
import { BRAND_KIT_COLUMNS, getClientWorkspace, type BrandKit } from "@/lib/client/workspace";
import { formatDate } from "@/lib/format";
import { loadPage } from "@/lib/page";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function generateMetadata({ params }: PageProps<"/[locale]/dashboard/brand">) {
  const { dict } = await loadPage(params);
  return { title: dict.dashboard.brand.title };
}

export default async function BrandPage({ params }: PageProps<"/[locale]/dashboard/brand">) {
  const { locale, dict } = await loadPage(params);
  const workspace = await getClientWorkspace();
  const supabase = await createSupabaseServerClient();
  if (!workspace || !supabase) redirect(localizedHref(locale, "/dashboard"));
  const d = dict.dashboard;
  const b = d.brand;

  const { data } = await supabase.from("brand_kits").select(BRAND_KIT_COLUMNS).eq("client_id", workspace.id).order("created_at", { ascending: false }).limit(20);
  const kits = (data ?? []) as BrandKit[];
  const active = kits.find((k) => k.is_active) ?? null;
  const others = kits.filter((k) => !k.is_active);
  const identityHref = localizedHref(locale, "/dashboard/ai/brand-identity");

  return (
    <div className="space-y-8">
      <PageHeader
        title={b.title}
        description={b.subtitle}
        actions={<LinkButton href={identityHref} variant="energy"><Sparkles className="size-4" aria-hidden />{active ? b.regenerate : b.generate}</LinkButton>}
      />

      <Panel title={b.kitTitle} actions={active && <StatusBadge value="active" label={b.active} />}>
        {active ? (
          <div className="grid gap-6 p-5 lg:grid-cols-3">
            <div className="space-y-3">
              <SvgLogo svg={active.logo_svg} url={active.logo_url} alt={active.name} className="aspect-square w-full max-w-60" />
              <p className="font-semibold">{active.name}</p>
              {active.tagline && <p className="text-sm text-blue-300">{active.tagline}</p>}
              {active.positioning && <p className="text-sm leading-relaxed text-ink-muted">{active.positioning}</p>}
              {active.logo_prompt && (
                <details className="text-xs text-ink-subtle">
                  <summary className="cursor-pointer hover:text-white">{b.logoPrompt}</summary>
                  <p className="mt-1 whitespace-pre-wrap" dir="ltr">{active.logo_prompt}</p>
                </details>
              )}
            </div>
            <div className="space-y-6 lg:col-span-2">
              {!!active.palette?.length && (
                <section>
                  <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-ink-subtle">{b.palette}</h3>
                  <PaletteSwatches palette={active.palette} />
                </section>
              )}
              <div className="grid gap-6 sm:grid-cols-2">
                {(active.typography?.heading || active.typography?.body) && (
                  <section>
                    <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-ink-subtle">{b.typography}</h3>
                    <TypographyList typography={active.typography} t={b} />
                  </section>
                )}
                {(active.voice?.do?.length || active.voice?.personality?.length) && (
                  <section>
                    <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-ink-subtle">{b.voice}</h3>
                    <VoiceList voice={active.voice} t={b} />
                  </section>
                )}
              </div>
            </div>
          </div>
        ) : (
          <EmptyState icon={Gem} title={b.noKit} body={b.noKitBody} action={<LinkButton href={identityHref} variant="energy"><Sparkles className="size-4" aria-hidden />{b.generate}</LinkButton>} />
        )}
      </Panel>

      {others.length > 0 && (
        <Panel title={b.otherKits}>
          <ul className="divide-y divide-line">
            {others.map((k) => (
              <li key={k.id} className="flex items-center gap-4 px-5 py-3">
                <SvgLogo svg={k.logo_svg} url={k.logo_url} alt={k.name} className="size-12 shrink-0" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{k.name}</p>
                  <p className="text-xs text-ink-subtle">{formatDate(k.created_at, locale)}</p>
                </div>
                <div className="hidden gap-1 sm:flex" aria-hidden>
                  {k.palette?.slice(0, 5).map((c, i) => <span key={i} className="size-4 rounded-full border border-line" style={{ backgroundColor: c.hex }} />)}
                </div>
                <ActivateKitButton kitId={k.id} d={d} />
              </li>
            ))}
          </ul>
        </Panel>
      )}

      <div className="grid gap-6 lg:grid-cols-3">
        <Panel title={b.profileTitle} className="lg:col-span-2">
          <div className="p-5"><BrandProfileForm mode="profile" d={d} locale={locale} values={workspace} /></div>
        </Panel>
        <div className="surface-card h-fit space-y-3 p-5">
          <h2 className="font-semibold">{b.helpTitle}</h2>
          <p className="text-sm leading-relaxed text-ink-muted">{b.helpBody}</p>
          <BrandHelpButton d={d} />
          <p className="pt-2 text-xs text-ink-subtle"><Link href={localizedHref(locale, "/dashboard/plan")} className="hover:text-white">{d.plan.title} →</Link></p>
        </div>
      </div>
    </div>
  );
}
