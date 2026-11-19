import { AuthShell } from "@/components/auth/auth-shell";
import { HashSessionHandler } from "@/components/auth/hash-session";
import { localizedHref } from "@/i18n/config";
import { safeNextPath } from "@/lib/auth/redirect";
import { loadPage, pageMetadata } from "@/lib/page";

export const generateMetadata = pageMetadata((d) => ({ title: d.nav.login, robots: { index: false } }));

export default async function AuthCompletePage({ params, searchParams }: PageProps<"/[locale]/auth-complete">) {
  const { locale, dict } = await loadPage(params);
  const sp = await searchParams;
  const next = safeNextPath(typeof sp.next === "string" ? sp.next : null, locale);
  return (
    <AuthShell locale={locale} dict={dict} title={dict.auth.title}>
      <HashSessionHandler
        next={next}
        loginHref={localizedHref(locale, "/login")}
        t={{ linkError: dict.auth.linkError, backToSignIn: dict.auth.backToSignIn, loading: dict.dashboard.crud.loading }}
      />
    </AuthShell>
  );
}
