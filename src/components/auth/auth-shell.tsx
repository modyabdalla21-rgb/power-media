import Link from "next/link";
import type { ReactNode } from "react";
import { Info } from "lucide-react";
import { Logo } from "@/components/brand/logo";
import { LanguageSwitcher } from "@/components/site/language-switcher";
import { localizedHref, type Locale } from "@/i18n/config";
import type { Dictionary } from "@/i18n/dictionaries/en";
import { isSupabaseConfigured } from "@/lib/env";

/** Centered card layout shared by all auth pages. */
export function AuthShell({ locale, dict, title, subtitle, children, footer, notice }: {
  locale: Locale;
  dict: Dictionary;
  title: string;
  subtitle?: string;
  children: ReactNode;
  footer?: ReactNode;
  notice?: ReactNode;
}) {
  return (
    <div className="relative grid min-h-dvh place-items-center overflow-hidden px-4 py-16">
      <div aria-hidden className="bg-grid absolute inset-0" />
      <div aria-hidden className="absolute top-[-10rem] start-1/2 h-96 w-[40rem] -translate-x-1/2 rounded-full bg-blue/25 blur-[130px] rtl:translate-x-1/2" />
      <div className="absolute end-4 top-4">
        <LanguageSwitcher locale={locale} label={dict.nav.language} />
      </div>
      <main id="main" className="relative w-full max-w-md">
        <Link href={localizedHref(locale, "/")} className="mx-auto mb-10 flex min-h-11 w-fit items-center"><Logo /></Link>
        <div className="surface-card p-8">
          <h1 className="text-2xl font-bold tracking-tight">{title}</h1>
          {subtitle && <p className="mt-2 text-sm leading-relaxed text-ink-muted">{subtitle}</p>}
          {!isSupabaseConfigured && <Notice tone="warn">{dict.auth.notConfigured}</Notice>}
          {notice}
          <div className="mt-6">{children}</div>
          {footer && <div className="mt-6 border-t border-line pt-6 text-center text-sm text-ink-muted">{footer}</div>}
        </div>
        <p className="mt-8 text-center text-sm text-ink-subtle">
          <Link href={localizedHref(locale, "/")} className="inline-flex min-h-10 items-center hover:text-white">{dict.common.backHome}</Link>
        </p>
      </main>
    </div>
  );
}

export function Notice({ tone = "info", children }: { tone?: "info" | "warn"; children: ReactNode }) {
  return (
    <p
      role={tone === "warn" ? "alert" : "status"}
      className={
        tone === "warn"
          ? "mt-6 flex items-start gap-2 rounded-xl border border-orange/30 bg-orange/10 p-3 text-sm"
          : "mt-6 flex items-start gap-2 rounded-xl border border-blue/30 bg-blue/10 p-3 text-sm"
      }
    >
      <Info className={tone === "warn" ? "mt-0.5 size-4 shrink-0 text-yellow" : "mt-0.5 size-4 shrink-0 text-blue-300"} aria-hidden />
      <span>{children}</span>
    </p>
  );
}
