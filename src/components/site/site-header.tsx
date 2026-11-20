"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { Menu, X } from "lucide-react";
import { Logo } from "@/components/brand/logo";
import { LinkButton } from "@/components/ui/button";
import { Container } from "@/components/ui/container";
import { LanguageSwitcher } from "./language-switcher";
import { publicNav } from "@/config/site";
import { localizedHref, type Locale } from "@/i18n/config";
import type { Dictionary } from "@/i18n/dictionaries/en";
import { cn } from "@/lib/utils";

export function SiteHeader({ locale, nav }: { locale: Locale; nav: Dictionary["nav"] }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Close the mobile menu on navigation and lock body scroll while it's open.
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => setOpen(false), [pathname]);
  useEffect(() => {
    if (!open) return;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);
  const closeMenu = () => setOpen(false);

  const isActive = (href: string) => pathname?.startsWith(localizedHref(locale, href));

  return (
    <header
      className={cn(
        "fixed inset-x-0 top-0 z-50 transition-all duration-500",
        scrolled || open ? "border-b border-line bg-navy/80 backdrop-blur-xl" : "border-b border-transparent",
      )}
    >
      <a href="#main" className="sr-only focus:not-sr-only focus:absolute focus:start-4 focus:top-3 focus:rounded-lg focus:bg-blue focus:px-3 focus:py-2 focus:text-sm">
        {nav.skipToContent}
      </a>
      <Container className="flex h-18 items-center justify-between gap-6">
        <Link href={localizedHref(locale, "/")} aria-label={`POWER MEDIA — ${nav.home}`} className="flex min-h-11 shrink-0 items-center">
          <Logo />
        </Link>

        <nav aria-label="Primary" className="hidden lg:block">
          <ul className="flex items-center gap-1">
            {publicNav.map((item) => (
              <li key={item.key}>
                <Link
                  href={localizedHref(locale, item.href)}
                  aria-current={isActive(item.href) ? "page" : undefined}
                  className={cn(
                    "rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                    isActive(item.href) ? "text-white" : "text-ink-muted hover:text-white",
                    item.key === "powerAi" && "text-gradient-energy hover:opacity-90",
                  )}
                >
                  {nav[item.key]}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        <div className="hidden items-center gap-2 lg:flex">
          <LanguageSwitcher locale={locale} label={nav.language} />
          <Link href={localizedHref(locale, "/login")} className="inline-flex min-h-10 items-center rounded-lg px-3 text-sm font-medium text-ink-muted hover:text-white">
            {nav.login}
          </Link>
          <LinkButton href={localizedHref(locale, "/signup")} size="sm">
            {nav.getStarted}
          </LinkButton>
        </div>

        <button
          type="button"
          className="inline-flex size-11 items-center justify-center rounded-lg text-white hover:bg-white/5 lg:hidden"
          aria-expanded={open}
          aria-controls="mobile-nav"
          aria-label={open ? nav.close : nav.menu}
          onClick={() => setOpen((v) => !v)}
        >
          {open ? <X className="size-5" /> : <Menu className="size-5" />}
        </button>
      </Container>

      <div
        id="mobile-nav"
        hidden={!open}
        className="h-[calc(100dvh-4.5rem)] overflow-y-auto border-t border-line bg-navy lg:hidden"
      >
        <Container className="flex flex-col gap-1 py-6">
          {publicNav.map((item) => (
            <Link
              key={item.key}
              href={localizedHref(locale, item.href)}
              onClick={closeMenu}
              className="rounded-lg px-3 py-3 text-lg font-semibold text-white hover:bg-white/5"
            >
              {nav[item.key]}
            </Link>
          ))}
          <Link href={localizedHref(locale, "/contact")} onClick={closeMenu} className="rounded-lg px-3 py-3 text-lg font-semibold text-white hover:bg-white/5">
            {nav.contact}
          </Link>
          <div className="mt-6 flex flex-col gap-3 border-t border-line pt-6">
            <LinkButton href={localizedHref(locale, "/signup")} onClick={closeMenu} size="lg">{nav.getStarted}</LinkButton>
            <LinkButton href={localizedHref(locale, "/login")} onClick={closeMenu} variant="secondary" size="lg">{nav.login}</LinkButton>
            <LanguageSwitcher locale={locale} label={nav.language} variant="inline" />
          </div>
        </Container>
      </div>
    </header>
  );
}
