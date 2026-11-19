import "server-only";
import { notFound } from "next/navigation";
import { isLocale, type Locale } from "@/i18n/config";
import { getDictionary } from "@/i18n/get-dictionary";
import type { Dictionary } from "@/i18n/dictionaries/en";

/** Resolve + validate the locale param and load its dictionary. */
export async function loadPage(params: Promise<{ locale: string }>): Promise<{ locale: Locale; dict: Dictionary }> {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  return { locale, dict: await getDictionary(locale) };
}

/** Build page metadata from a dictionary selector. */
export function pageMetadata(select: (d: Dictionary) => { title: string; description?: string }) {
  return async ({ params }: { params: Promise<{ locale: string }> }) => {
    const { locale } = await params;
    if (!isLocale(locale)) return {};
    const { title, description } = select(await getDictionary(locale));
    return { title, description };
  };
}
