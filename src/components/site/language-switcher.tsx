"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Check, ChevronDown, Languages } from "lucide-react";
import { locales, localeMeta, switchLocalePath, type Locale } from "@/i18n/config";
import { cn } from "@/lib/utils";

/** English · العربية · مصري (Egyptian colloquial mode). */
export function LanguageSwitcher({ locale, label, className }: { locale: Locale; label: string; className?: string }) {
  const pathname = usePathname() ?? `/${locale}`;
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: PointerEvent) => !ref.current?.contains(e.target as Node) && setOpen(false);
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("pointerdown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div ref={ref} className={cn("relative inline-flex", className)}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={`${label}: ${localeMeta[locale].label}`}
        className="inline-flex h-9 items-center gap-1.5 rounded-(--radius-control) px-2.5 text-sm font-medium text-ink-muted transition-colors hover:bg-white/5 hover:text-white"
      >
        <Languages className="size-4" aria-hidden />
        {localeMeta[locale].label}
        <ChevronDown className={cn("size-3.5 transition-transform", open && "rotate-180")} aria-hidden />
      </button>
      {open && (
        <ul role="menu" aria-label={label} className="absolute end-0 top-full z-50 mt-1 min-w-40 overflow-hidden rounded-xl border border-line-strong bg-surface-2 py-1 shadow-(--shadow-card)">
          {locales.map((l) => (
            <li key={l} role="none">
              <Link
                role="menuitem"
                href={switchLocalePath(pathname, l)}
                hrefLang={localeMeta[l].htmlLang}
                lang={localeMeta[l].htmlLang}
                dir={localeMeta[l].dir}
                aria-current={l === locale ? "true" : undefined}
                onClick={() => setOpen(false)}
                className={cn("flex items-center justify-between gap-3 px-3 py-2 text-sm hover:bg-white/5", l === locale ? "text-white" : "text-ink-muted")}
              >
                {localeMeta[l].label}
                {l === locale && <Check className="size-4 text-blue-300" aria-hidden />}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
