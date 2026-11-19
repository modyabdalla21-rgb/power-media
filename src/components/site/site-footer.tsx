import Link from "next/link";
import { Logo } from "@/components/brand/logo";
import { Container } from "@/components/ui/container";
import { siteConfig } from "@/config/site";
import { localizedHref, type Locale } from "@/i18n/config";
import type { Dictionary } from "@/i18n/dictionaries/en";

export function SiteFooter({ locale, dict }: { locale: Locale; dict: Dictionary }) {
  const href = (p: string) => localizedHref(locale, p);
  const columns = [
    {
      title: dict.footer.company,
      links: [
        { label: dict.nav.about, href: href("/about") },
        { label: dict.nav.work, href: href("/work") },
        { label: dict.nav.caseStudies, href: href("/case-studies") },
        { label: dict.nav.contact, href: href("/contact") },
      ],
    },
    {
      title: dict.footer.servicesCol,
      links: dict.services.items.slice(0, 5).map((s) => ({ label: s.title, href: href(`/services#${s.id}`) })),
    },
    {
      title: dict.footer.platform,
      links: [
        { label: dict.nav.powerAi, href: href("/power-ai") },
        { label: dict.nav.pricing, href: href("/pricing") },
        { label: dict.nav.login, href: href("/login") },
      ],
    },
  ];

  return (
    <footer className="relative border-t border-line bg-surface-1/60">
      <div aria-hidden className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-blue/60 to-transparent" />
      <Container className="grid gap-12 py-16 md:grid-cols-12">
        <div className="md:col-span-5">
          <Logo />
          <p className="mt-5 max-w-sm text-sm leading-relaxed text-ink-muted">{dict.footer.blurb}</p>
          <p className="mt-6 text-sm font-semibold text-gradient-energy">{dict.brand.tagline}</p>
          {siteConfig.contactEmail && (
            <a href={`mailto:${siteConfig.contactEmail}`} className="mt-4 block text-sm text-ink-muted hover:text-white">
              {siteConfig.contactEmail}
            </a>
          )}
        </div>
        {columns.map((col, i) => (
          <div key={col.title} className={i === 0 ? "md:col-span-2 md:col-start-7" : "md:col-span-2"}>
            <h2 className="text-sm font-semibold text-white">{col.title}</h2>
            <ul className="mt-3 space-y-1 md:mt-4 md:space-y-3">
              {col.links.map((l) => (
                <li key={l.href + l.label}>
                  <Link href={l.href} className="inline-flex min-h-10 min-w-10 items-center text-sm text-ink-muted transition-colors hover:text-white md:min-h-0">{l.label}</Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </Container>
      <Container className="flex flex-col items-center justify-between gap-3 border-t border-line py-6 text-xs text-ink-subtle sm:flex-row">
        <p>© {new Date().getFullYear()} POWER MEDIA. {dict.footer.rights}</p>
        <p dir="ltr">Egypt · Saudi Arabia · UAE · GCC</p>
      </Container>
    </footer>
  );
}
