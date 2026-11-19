import Link from "next/link";
import { Info } from "lucide-react";
import { Logo } from "@/components/brand/logo";
import { LinkButton } from "@/components/ui/button";
import { LanguageSwitcher } from "@/components/site/language-switcher";
import { LoginForm } from "@/components/site/login-form";
import { localizedHref } from "@/i18n/config";
import { isDashboardPreview, isSupabaseConfigured } from "@/lib/env";
import { loadPage, pageMetadata } from "@/lib/page";

export const generateMetadata = pageMetadata((d) => ({ title: d.nav.login }));

export default async function LoginPage({ params, searchParams }: PageProps<"/[locale]/login">) {
  const { locale, dict } = await loadPage(params);
  const sp = await searchParams;
  const next = typeof sp.next === "string" ? sp.next : undefined;
  const t = dict.auth;

  return (
    <div className="relative grid min-h-dvh place-items-center overflow-hidden px-4 py-16">
      <div aria-hidden className="bg-grid absolute inset-0" />
      <div aria-hidden className="absolute top-[-10rem] start-1/2 h-96 w-[40rem] -translate-x-1/2 rounded-full bg-blue/25 blur-[130px] rtl:translate-x-1/2" />
      <div className="absolute end-4 top-4">
        <LanguageSwitcher locale={locale} label={dict.nav.language} />
      </div>
      <main className="relative w-full max-w-md">
        <Link href={localizedHref(locale, "/")} className="mx-auto mb-10 flex w-fit"><Logo /></Link>
        <div className="surface-card p-8">
          <h1 className="text-2xl font-bold tracking-tight">{t.title}</h1>
          <p className="mt-2 text-sm text-ink-muted">{t.subtitle}</p>
          {!isSupabaseConfigured && (
            <p className="mt-6 flex items-start gap-2 rounded-xl border border-orange/30 bg-orange/10 p-3 text-sm">
              <Info className="mt-0.5 size-4 shrink-0 text-yellow" aria-hidden />
              {t.notConfigured}
            </p>
          )}
          <div className="mt-6">
            <LoginForm locale={locale} t={t} next={next} disabled={!isSupabaseConfigured} />
          </div>
          {isDashboardPreview && (
            <div className="mt-6 border-t border-line pt-6 text-center">
              <p className="text-xs text-ink-subtle">{t.previewHint}</p>
              <LinkButton href={localizedHref(locale, "/dashboard")} variant="secondary" size="sm" className="mt-3">{t.openPreview}</LinkButton>
            </div>
          )}
        </div>
        <p className="mt-8 text-center text-sm text-ink-subtle">
          <Link href={localizedHref(locale, "/")} className="hover:text-white">{dict.common.backHome}</Link>
        </p>
      </main>
    </div>
  );
}
