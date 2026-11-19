import type { Metadata, Viewport } from "next";
import { notFound } from "next/navigation";
import "@fontsource-variable/plus-jakarta-sans";
import "@fontsource/ibm-plex-sans-arabic/400.css";
import "@fontsource/ibm-plex-sans-arabic/500.css";
import "@fontsource/ibm-plex-sans-arabic/600.css";
import "@fontsource/ibm-plex-sans-arabic/700.css";
import "../globals.css";
import { isLocale, localeMeta, locales } from "@/i18n/config";
import { getDictionary } from "@/i18n/get-dictionary";
import { metadataBaseUrl } from "@/lib/env";

export function generateStaticParams() {
  return locales.map((locale) => ({ locale }));
}

export const viewport: Viewport = { themeColor: "#001323", colorScheme: "dark" };

export async function generateMetadata({ params }: LayoutProps<"/[locale]">): Promise<Metadata> {
  const { locale } = await params;
  if (!isLocale(locale)) return {};
  const dict = await getDictionary(locale);
  return {
    metadataBase: new URL(metadataBaseUrl),
    title: { default: dict.meta.title, template: `%s · POWER MEDIA` },
    description: dict.meta.description,
    alternates: { canonical: `/${locale}`, languages: { en: "/en", ar: "/ar" } },
    openGraph: {
      type: "website",
      siteName: "POWER MEDIA",
      title: dict.meta.title,
      description: dict.meta.description,
      locale: localeMeta[locale].ogLocale,
      images: ["/brand/brand-reference.jpg"],
    },
  };
}

export default async function LocaleLayout({ children, params }: LayoutProps<"/[locale]">) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const { dir, htmlLang } = localeMeta[locale];
  return (
    <html lang={htmlLang} dir={dir} className="scroll-smooth">
      <body className="min-h-dvh overflow-x-hidden">{children}</body>
    </html>
  );
}
