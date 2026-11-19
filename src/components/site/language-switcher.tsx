"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Languages } from "lucide-react";
import { locales, localeMeta, switchLocalePath, type Locale } from "@/i18n/config";
import { cn } from "@/lib/utils";

export function LanguageSwitcher({ locale, label, className }: { locale: Locale; label: string; className?: string }) {
  const pathname = usePathname() ?? `/${locale}`;
  const other = locales.find((l) => l !== locale) ?? locale;
  return (
    <Link
      href={switchLocalePath(pathname, other)}
      hrefLang={other}
      lang={other}
      aria-label={`${label}: ${localeMeta[other].label}`}
      className={cn(
        "inline-flex h-9 items-center gap-1.5 rounded-(--radius-control) px-2.5 text-sm font-medium text-ink-muted transition-colors hover:bg-white/5 hover:text-white",
        className,
      )}
    >
      <Languages className="size-4" aria-hidden />
      {localeMeta[other].label}
    </Link>
  );
}
