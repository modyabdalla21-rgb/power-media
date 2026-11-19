import Link from "next/link";
import { AuthShell } from "@/components/auth/auth-shell";
import { SignUpForm } from "@/components/auth/auth-forms";
import { localizedHref } from "@/i18n/config";
import { isSupabaseConfigured } from "@/lib/env";
import { loadPage, pageMetadata } from "@/lib/page";

export const generateMetadata = pageMetadata((d) => ({ title: d.auth.signupTitle }));

export default async function SignUpPage({ params }: PageProps<"/[locale]/signup">) {
  const { locale, dict } = await loadPage(params);
  const t = dict.auth;
  return (
    <AuthShell
      locale={locale}
      dict={dict}
      title={t.signupTitle}
      subtitle={t.signupSubtitle}
      footer={<>{t.haveAccount} <Link href={localizedHref(locale, "/login")} className="inline-flex min-h-10 items-center font-medium text-blue-300 hover:text-white">{t.signInLink}</Link></>}
    >
      <SignUpForm locale={locale} t={t} disabled={!isSupabaseConfigured} />
    </AuthShell>
  );
}
