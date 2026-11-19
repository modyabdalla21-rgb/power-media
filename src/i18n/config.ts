/**
 * UI locales. `eg` is an Egyptian-colloquial Arabic mode: right-to-left, and
 * its dictionary is Arabic (MSA) with friendly Egyptian overrides.
 */
export const locales = ["en", "ar", "eg"] as const;
export type Locale = (typeof locales)[number];
export const defaultLocale: Locale = "en";

/** Language of stored bilingual content ({ en, ar } objects). */
export type ContentLocale = "en" | "ar";
export const contentLocale = (locale: Locale): ContentLocale => (locale === "en" ? "en" : "ar");
export const isRtl = (locale: Locale) => locale !== "en";

export const localeMeta: Record<Locale, { label: string; short: string; dir: "ltr" | "rtl"; htmlLang: string; ogLocale: string }> = {
  en: { label: "English", short: "EN", dir: "ltr", htmlLang: "en", ogLocale: "en_US" },
  ar: { label: "العربية", short: "ع", dir: "rtl", htmlLang: "ar", ogLocale: "ar_SA" },
  eg: { label: "مصري", short: "مصري", dir: "rtl", htmlLang: "ar-EG", ogLocale: "ar_EG" },
};

export function isLocale(value: string | undefined | null): value is Locale {
  return !!value && (locales as readonly string[]).includes(value);
}

/** Prefix an app path with the locale: href("ar", "/pricing") -> "/ar/pricing" */
export function localizedHref(locale: Locale, path: string): string {
  if (/^https?:|^mailto:|^tel:|^#/.test(path)) return path;
  const clean = path === "/" ? "" : path.startsWith("/") ? path : `/${path}`;
  return `/${locale}${clean}`;
}

/** Swap the locale segment of an existing pathname. */
export function switchLocalePath(pathname: string, to: Locale): string {
  const parts = pathname.split("/");
  if (isLocale(parts[1])) parts[1] = to;
  else parts.splice(1, 0, to);
  return parts.join("/") || `/${to}`;
}
