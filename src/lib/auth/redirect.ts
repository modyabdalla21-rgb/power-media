import type { Locale } from "@/i18n/config";

/** Only allow same-app, locale-prefixed relative paths (prevents open redirects). */
export function safeNextPath(next: string | null | undefined, locale: Locale, fallback = "/dashboard") {
  if (next && /^\/(en|ar|eg)(\/[\w\-/?=&%.]*)?$/.test(next) && !next.startsWith("//")) return next;
  return `/${locale}${fallback}`;
}
