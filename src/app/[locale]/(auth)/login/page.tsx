import Link from "next/link";
import { AuthShell, Notice } from "@/components/auth/auth-shell";
import { SignInForm } from "@/components/auth/auth-forms";
import { LinkButton } from "@/components/ui/button";
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
    <AuthShell
      locale={locale}
      dict={dict}
      title={t.title}
      subtitle={t.subtitle}
      notice={sp.error === "link" ? <Notice tone="warn">{t.linkError}</Notice> : undefined}
      footer={
        <>
          {t.noAccount}{" "}
          <Link href={localizedHref(locale, "/signup")} className="font-medium text-blue-300 hover:text-white">{t.signUpLink}</Link>
          {isDashboardPreview && (
            <div className="mt-6">
              <p className="text-xs text-ink-subtle">{t.previewHint}</p>
              <LinkButton href={localizedHref(locale, "/dashboard")} variant="secondary" size="sm" className="mt-3">{t.openPreview}</LinkButton>
            </div>
          )}
        </>
      }
    >
      <SignInForm locale={locale} t={t} next={next} disabled={!isSupabaseConfigured} />
    </AuthShell>
  );
}
