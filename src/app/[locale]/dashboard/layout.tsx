import { redirect } from "next/navigation";
import { Info, LogOut } from "lucide-react";
import { MobileSidebar, Sidebar } from "@/components/dashboard/sidebar";
import { LanguageSwitcher } from "@/components/site/language-switcher";
import { localizedHref } from "@/i18n/config";
import { signOut } from "@/lib/auth/actions";
import { isDashboardPreview, isSupabaseConfigured } from "@/lib/env";
import { loadPage } from "@/lib/page";
import { StatusBadge } from "@/components/dashboard/crud/status-badge";
import { getCurrentProfile, getCurrentUser } from "@/lib/supabase/server";

// Auth-gated: always render per request, never prerender.
export const dynamic = "force-dynamic";

export const metadata = { robots: { index: false, follow: false } };

export default async function DashboardLayout({ children, params }: LayoutProps<"/[locale]/dashboard">) {
  const { locale, dict } = await loadPage(params);
  const t = dict.dashboard;

  // Defense in depth: the proxy already guards this route.
  const user = await getCurrentUser();
  if (isSupabaseConfigured ? !user : !isDashboardPreview) redirect(localizedHref(locale, "/login"));

  const profile = await getCurrentProfile();
  // Preview mode (no Supabase in development) shows the full admin menu.
  const role = profile?.role ?? (isDashboardPreview ? "admin" : "client");
  const display = profile?.full_name || profile?.email || "POWER MEDIA";
  const initials = display.replace(/[^\p{L}\p{N} ]/gu, "").split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]).join("").toUpperCase() || "PM";

  return (
    <div className="min-h-dvh bg-surface-0">
      <Sidebar locale={locale} t={t} tools={dict.aiTools} role={role} />
      <div className="lg:ps-68">
        <header className="sticky top-0 z-30 flex h-16 items-center gap-3 border-b border-line bg-navy/80 px-4 backdrop-blur-xl sm:px-6">
          <MobileSidebar locale={locale} t={t} tools={dict.aiTools} role={role} />
          <p className="flex-1 truncate text-sm text-ink-subtle">{t.title}</p>
          <LanguageSwitcher locale={locale} label={dict.nav.language} />
          {user && (
            <form action={signOut}>
              <input type="hidden" name="locale" value={locale} />
              <button type="submit" className="inline-flex h-9 items-center gap-1.5 rounded-lg px-2.5 text-sm text-ink-muted hover:bg-white/5 hover:text-white">
                <LogOut className="flip-rtl size-4" aria-hidden />
                <span className="hidden sm:inline">{t.signOut}</span>
              </button>
            </form>
          )}
          {profile && (
            <div className="hidden text-end sm:block">
              <p className="max-w-40 truncate text-sm font-medium leading-tight">{display}</p>
              <StatusBadge value={role} label={t.roles[role]} />
            </div>
          )}
          <span aria-hidden className="inline-flex size-9 items-center justify-center rounded-full bg-gradient-to-br from-blue to-blue-700 text-xs font-bold">{initials}</span>
        </header>
        {!isSupabaseConfigured && (
          <div className="flex items-start gap-2 border-b border-orange/20 bg-orange/10 px-4 py-2.5 text-xs text-yellow sm:px-6">
            <Info className="mt-px size-3.5 shrink-0" aria-hidden />
            {t.previewBanner}
          </div>
        )}
        <main id="main" className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-10">{children}</main>
      </div>
    </div>
  );
}
