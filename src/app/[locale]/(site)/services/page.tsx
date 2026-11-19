import { Check } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Container, Section } from "@/components/ui/container";
import { CtaBand } from "@/components/site/cta-band";
import { IconTile, serviceIcons } from "@/components/site/icons";
import { PageHero } from "@/components/site/page-hero";
import { localizedHref } from "@/i18n/config";
import { loadPage, pageMetadata } from "@/lib/page";

export const generateMetadata = pageMetadata((d) => ({ title: d.nav.services, description: d.services.subtitle }));

export default async function ServicesPage({ params }: PageProps<"/[locale]/services">) {
  const { locale, dict } = await loadPage(params);
  const s = dict.services;
  return (
    <>
      <PageHero eyebrow={s.eyebrow} title={s.title} subtitle={s.subtitle} />
      <Section>
        <Container className="grid gap-4 md:grid-cols-2">
          {s.items.map((item, i) => (
            <Card key={item.id} id={item.id} interactive className="scroll-mt-28 p-8">
              <div className="flex items-start justify-between gap-4">
                <IconTile icon={serviceIcons[item.id]} tone={i % 3 === 1 ? "energy" : "blue"} />
                <span className="text-sm font-semibold text-ink-subtle tabular-nums">{String(i + 1).padStart(2, "0")}</span>
              </div>
              <h2 className="mt-6 text-2xl font-semibold tracking-tight">{item.title}</h2>
              <p className="mt-3 leading-relaxed text-ink-muted">{item.body}</p>
              <ul className="mt-6 grid gap-2.5 border-t border-line pt-6">
                {item.bullets.map((b) => (
                  <li key={b} className="flex items-center gap-2.5 text-sm">
                    <Check className="size-4 shrink-0 text-blue" aria-hidden />
                    {b}
                  </li>
                ))}
              </ul>
            </Card>
          ))}
        </Container>
      </Section>
      <CtaBand title={s.ctaTitle} subtitle={s.ctaBody} primary={{ label: dict.common.getInTouch, href: localizedHref(locale, "/contact") }} secondary={{ label: dict.nav.pricing, href: localizedHref(locale, "/pricing") }} />
    </>
  );
}
