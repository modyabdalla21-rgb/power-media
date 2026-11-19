import Link from "next/link";
import { AuthShell } from "@/components/auth/auth-shell";
import { ForgotPasswordForm } from "@/components/auth/auth-forms";
import { localizedHref } from "@/i18n/config";
import { isSupabaseConfigured } from "@/lib/env";
import { loadPage, pageMetadata } from "@/lib/page";

export const generateMetadata = pageMetadata((d) => ({ title: d.auth.forgotTitle }));

export default async function ForgotPasswordPage({ params }: PageProps<"/[locale]/forgot-password">) {
  const { locale, dict } = await loadPage(params);
  const t = dict.auth;
  return (
    <AuthShell
      locale={locale}
      dict={dict}
      title={t.forgotTitle}
      subtitle={t.forgotSubtitle}
      footer={<Link href={localizedHref(locale, "/login")} className="font-medium text-blue-300 hover:text-white">{t.backToSignIn}</Link>}
    >
      <ForgotPasswordForm locale={locale} t={t} disabled={!isSupabaseConfigured} />
    </AuthShell>
  );
}
