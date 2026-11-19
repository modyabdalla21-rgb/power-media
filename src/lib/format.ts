import type { Locale } from "@/i18n/config";

/** Arabic UI with Latin digits — clearer for figures across Egypt and the Gulf. */
export const intlLocale = (locale: Locale) => (locale === "en" ? "en-GB" : "ar-EG-u-nu-latn");

export function formatMoney(amount: unknown, currency: unknown, locale: Locale) {
  const n = typeof amount === "number" ? amount : Number(amount);
  if (amount === null || amount === undefined || amount === "" || !Number.isFinite(n)) return "—";
  try {
    return new Intl.NumberFormat(intlLocale(locale), {
      style: "currency",
      currency: typeof currency === "string" && currency ? currency : "USD",
      maximumFractionDigits: n % 1 === 0 ? 0 : 2,
    }).format(n);
  } catch {
    return `${n} ${currency ?? ""}`.trim();
  }
}

export function formatDate(value: unknown, locale: Locale) {
  if (typeof value !== "string" || !value) return "—";
  const d = new Date(value.length === 10 ? `${value}T00:00:00Z` : value);
  if (Number.isNaN(d.getTime())) return "—";
  return new Intl.DateTimeFormat(intlLocale(locale), { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" }).format(d);
}

export const formatNumber = (n: number, locale: Locale) => new Intl.NumberFormat(intlLocale(locale)).format(n);

export const fill = (template: string, vars: Record<string, string | number>) =>
  template.replace(/\{(\w+)\}/g, (_, k) => String(vars[k] ?? ""));
