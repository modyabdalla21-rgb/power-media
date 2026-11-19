"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { Menu, X } from "lucide-react";
import { Logo } from "@/components/brand/logo";
import { toolIcons } from "@/components/site/icons";
import { dashboardNav } from "@/config/dashboard";
import { localizedHref, type Locale } from "@/i18n/config";
import type { Dictionary } from "@/i18n/dictionaries/en";
import { aiTools } from "@/lib/ai/tools";
import { cn } from "@/lib/utils";

type Props = { locale: Locale; t: Dictionary["dashboard"]; tools: Dictionary["aiTools"] };

function NavContent({ locale, t, tools }: Props) {
  const pathname = usePathname() ?? "";
  const isActive = (href: string) => {
    const full = localizedHref(locale, href);
    return href === "/dashboard" ? pathname === full : pathname.startsWith(full);
  };
  const linkCls = (active: boolean) =>
    cn(
      "group flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
      active ? "bg-blue/15 text-white shadow-[inset_2px_0_0_0_var(--color-blue)] rtl:shadow-[inset_-2px_0_0_0_var(--color-blue)]" : "text-ink-muted hover:bg-white/5 hover:text-white",
    );

  return (
    <nav aria-label={t.title} className="flex flex-col gap-6">
      {dashboardNav.map((group) => (
        <div key={group.group}>
          <p className="px-3 pb-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-ink-subtle">{t.groups[group.group]}</p>
          <ul className="space-y-0.5">
            {group.items.map((item) => {
              const active = isActive(item.href);
              return (
                <li key={item.key}>
                  <Link href={localizedHref(locale, item.href)} aria-current={active ? "page" : undefined} className={linkCls(active)}>
                    <item.icon className={cn("size-4.5 shrink-0", active ? "text-blue-300" : "text-ink-subtle group-hover:text-white")} aria-hidden />
                    {t.nav[item.key]}
                  </Link>
                  {item.key === "aiHub" && (
                    <ul className="mt-1 space-y-0.5 border-s border-line ms-5 ps-2">
                      {aiTools.map((tool) => {
                        const href = `/dashboard/ai/${tool.slug}`;
                        const Icon = toolIcons[tool.key];
                        const a = isActive(href);
                        return (
                          <li key={tool.key}>
                            <Link href={localizedHref(locale, href)} aria-current={a ? "page" : undefined}
                              className={cn("flex items-center gap-2.5 rounded-md px-2.5 py-1.5 text-[13px] transition-colors", a ? "bg-white/5 text-white" : "text-ink-subtle hover:text-white")}>
                              <Icon className={cn("size-3.5 shrink-0", a && "text-yellow")} aria-hidden />
                              <span className="truncate">{tools[tool.key].name}</span>
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

/** Mobile trigger + drawer — rendered inside the dashboard top bar. */
export function MobileSidebar(props: Props) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => setOpen(false), [pathname]);

  return (
    <>
      <button type="button" onClick={() => setOpen(true)} aria-label={props.t.title} aria-expanded={open}
        className="inline-flex size-10 items-center justify-center rounded-lg text-white hover:bg-white/5 lg:hidden">
        <Menu className="size-5" aria-hidden />
      </button>
      {open && (
        <div className="fixed inset-0 z-50 lg:hidden" role="dialog" aria-modal="true" aria-label={props.t.title}>
          <button type="button" aria-label="Close" className="absolute inset-0 bg-navy/70 backdrop-blur-sm" onClick={() => setOpen(false)} />
          <div className="absolute inset-y-0 start-0 flex w-72 max-w-[85vw] flex-col border-e border-line bg-surface-1">
            <div className="flex h-16 items-center justify-between border-b border-line px-5">
              <Logo />
              <button type="button" onClick={() => setOpen(false)} aria-label="Close" className="inline-flex size-9 items-center justify-center rounded-lg hover:bg-white/5">
                <X className="size-5" aria-hidden />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto px-3 py-6"><NavContent {...props} /></div>
          </div>
        </div>
      )}
    </>
  );
}
