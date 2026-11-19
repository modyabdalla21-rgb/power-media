import Link from "next/link";
import { AuthShell, Notice } from "@/components/auth/auth-shell";
import { ResetPasswordForm } from "@/components/auth/auth-forms";
import { localizedHref } from "@/i18n/config";
import { isSupabaseConfigured } from "@/lib/env";
import { loadPage, pageMetadata } from "@/lib/page";
import { getCurrentUser } from "@/lib/supabase/server";

export const generateMetadata = pageMetadata((d) => ({ title: d.auth.resetTitle }));

/** Reached from the recovery / invite email via /auth/callback, which sets the session. */
export default async function ResetPasswordPage({ params }: PageProps<"/[locale]/reset-password">) {
  const { locale, dict } = await loadPage(params);
  const t = dict.auth;
  const user = await getCurrentUser();

  return (
    <AuthShell
      locale={locale}
      dict={dict}
      title={t.resetTitle}
      subtitle={user?.email ? `${t.resetSubtitle} (${user.email})` : t.resetSubtitle}
      footer={<Link href={localizedHref(locale, "/login")} className="inline-flex min-h-10 items-center font-medium text-blue-300 hover:text-white">{t.backToSignIn}</Link>}
    >
      {isSupabaseConfigured && !user ? (
        <>
          <Notice tone="warn">{t.resetNoSession}</Notice>
          <Link href={localizedHref(locale, "/forgot-password")} className="mt-4 inline-flex min-h-10 items-center text-sm font-medium text-blue-300 hover:text-white">{t.forgotTitle}</Link>
        </>
      ) : (
        <ResetPasswordForm locale={locale} t={t} disabled={!isSupabaseConfigured} />
      )}
    </AuthShell>
  );
}
