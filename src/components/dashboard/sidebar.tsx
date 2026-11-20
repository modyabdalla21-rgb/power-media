"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Menu, X } from "lucide-react";
import { Logo } from "@/components/brand/logo";
import { toolIcons } from "@/components/site/icons";
import { navForRole } from "@/config/dashboard";
import type { Role } from "@/config/modules";
import { localizedHref, type Locale } from "@/i18n/config";
import type { Dictionary } from "@/i18n/dictionaries/en";
import { aiTools } from "@/lib/ai/tools";
import { cn } from "@/lib/utils";

type Props = { locale: Locale; t: Dictionary["dashboard"]; tools: Dictionary["aiTools"]; role?: Role; agencyWork?: boolean };
type NavProps = Props & { onNavigate?: () => void };

function NavContent({ locale, t, tools, role, agencyWork, onNavigate }: NavProps) {
  const pathname = usePathname() ?? "";
  const isActive = (href: string) => {
    // In-page anchors (e.g. Brand hub sections) never mark a route active.
    if (href.includes("#")) return false;
    const full = localizedHref(locale, href);
    if (href === "/dashboard") return pathname === full;
    // Clients get the AI tools as separate items; "All tools" is the hub only.
    if (href === "/dashboard/ai" && role === "client") return pathname === full;
    if (href === "/dashboard/ai") return pathname.startsWith(full) && !pathname.startsWith(`${full}/history`);
    return pathname.startsWith(full);
  };
  const linkCls = (active: boolean) =>
    cn(
      "group flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
      active ? "bg-blue/15 text-white shadow-[inset_2px_0_0_0_var(--color-blue)] rtl:shadow-[inset_-2px_0_0_0_var(--color-blue)]" : "text-ink-muted hover:bg-white/5 hover:text-white",
    );

  return (
    <nav aria-label={t.title} className="flex flex-col gap-6">
      {navForRole(role, { agencyWork }).map((group) => (
        <div key={group.group}>
          <p className="px-3 pb-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-ink-subtle">{t.groups[group.group]}</p>
          <ul className="space-y-0.5">
            {group.items.map((item) => {
              const active = isActive(item.href);
              return (
                <li key={item.key}>
                  <Link href={localizedHref(locale, item.href)} onClick={onNavigate} aria-current={active ? "page" : undefined} className={linkCls(active)}>
                    <item.icon className={cn("size-4.5 shrink-0", active ? "text-blue-300" : "text-ink-subtle group-hover:text-white")} aria-hidden />
                    <span className="min-w-0 break-words">{t.nav[item.key]}</span>
                  </Link>
                  {item.key === "aiHub" && role !== "client" && (
                    <ul className="mt-1 space-y-0.5 border-s border-line ms-5 ps-2">
                      {aiTools.filter((tool) => !tool.hub).map((tool) => {
                        const href = `/dashboard/ai/${tool.slug}`;
                        const Icon = toolIcons[tool.key];
                        const a = isActive(href);
                        return (
                          <li key={tool.key}>
                            <Link href={localizedHref(locale, href)} onClick={onNavigate} aria-current={a ? "page" : undefined}
                              className={cn("flex items-center gap-2.5 rounded-md px-2.5 py-1.5 text-[13px] transition-colors", a ? "bg-white/5 text-white" : "text-ink-subtle hover:text-white")}>
                              <Icon className={cn("size-3.5 shrink-0", a && "text-yellow")} aria-hidden />
                              <span className="min-w-0 break-words leading-snug">{tools[tool.key].name}</span>
                            </Link>
                          </li>
                        );
                      })}
                    </ul>
                  )}
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </nav>
  );
}

export function Sidebar(props: Props) {
  return (
    <aside className="fixed inset-y-0 start-0 z-40 hidden w-68 flex-col border-e border-line bg-surface-1 lg:flex">
      <div className="flex h-16 items-center border-b border-line px-5">
        <Link href={localizedHref(props.locale, "/dashboard")}><Logo /></Link>
      </div>
      <div className="flex-1 overflow-y-auto px-3 py-6"><NavContent {...props} /></div>
    </aside>
  );
}

/**
 * Mobile trigger + drawer. The trigger lives in the dashboard top bar, but
 * the drawer is portalled to <body>: the top bar uses `backdrop-filter`,
 * which makes it the containing block for `position: fixed` descendants and
 * would clip the drawer to the bar's height.
 */
export function MobileSidebar(props: Props) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const close = useCallback(() => setOpen(false), []);

  // Close when the route changes (e.g. browser back/forward).
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => setOpen(false), [pathname]);

  useEffect(() => {
    if (!open) return;
    const trigger = triggerRef.current;
    const { overflow } = document.body.style;
    document.body.style.overflow = "hidden";
    closeRef.current?.focus();
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = overflow;
      window.removeEventListener("keydown", onKey);
      trigger?.focus();
    };
  }, [open]);

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setOpen(true)}
        aria-label={props.t.title}
        aria-expanded={open}
        aria-controls="dashboard-drawer"
        className="inline-flex size-10 items-center justify-center rounded-lg text-white hover:bg-white/5 lg:hidden"
      >
        <Menu className="size-5" aria-hidden />
      </button>
      {open &&
        createPortal(
          <div id="dashboard-drawer" className="fixed inset-0 z-50 h-dvh lg:hidden" role="dialog" aria-modal="true" aria-label={props.t.title}>
            <button type="button" tabIndex={-1} aria-hidden className="absolute inset-0 h-full w-full animate-fade-in bg-navy/75 backdrop-blur-sm" onClick={close} />
            <div className="absolute inset-y-0 start-0 flex h-dvh w-72 max-w-[85vw] animate-drawer-in flex-col border-e border-line bg-surface-1 shadow-(--shadow-card) rtl:animate-drawer-in-rtl">
              <div className="flex h-16 shrink-0 items-center justify-between border-b border-line px-5">
                <Logo />
                <button ref={closeRef} type="button" onClick={close} aria-label={props.t.crud.close} className="inline-flex size-9 items-center justify-center rounded-lg hover:bg-white/5">
                  <X className="size-5" aria-hidden />
                </button>
              </div>
              <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-3 py-6">
                <NavContent {...props} onNavigate={close} />
              </div>
            </div>
          </div>,
          document.body,
        )}
    </>
  );
}
