import { Clock, Globe2, Mail } from "lucide-react";
import { Container, Section } from "@/components/ui/container";
import { ContactForm } from "@/components/site/contact-form";
import { IconTile } from "@/components/site/icons";
import { PageHero } from "@/components/site/page-hero";
import { siteConfig } from "@/config/site";
import { loadPage, pageMetadata } from "@/lib/page";

export const generateMetadata = pageMetadata((d) => ({ title: d.nav.contact, description: d.contact.subtitle }));

export default async function ContactPage({ params, searchParams }: PageProps<"/[locale]/contact">) {
  const { locale, dict } = await loadPage(params);
  const sp = await searchParams;
  const c = dict.contact;
  const services = [
    ...dict.services.items.map((s) => ({ value: s.id, label: s.title })),
    { value: "power-ai", label: `${dict.nav.powerAi} — ${dict.common.requestAccess}` },
  ];
  const requested = typeof sp.service === "string" && services.some((s) => s.value === sp.service) ? sp.service : undefined;

  return (
    <>
      <PageHero eyebrow={c.eyebrow} title={c.title} subtitle={c.subtitle} />
      <Section>
        <Container className="grid gap-10 lg:grid-cols-12">
          <div className="lg:col-span-8">
            <ContactForm locale={locale} t={c.form} services={services} defaultService={requested} />
          </div>
          <aside className="space-y-4 lg:col-span-4">
            <div className="surface-card flex gap-4 p-6">
              <IconTile icon={Globe2} />
              <div>
                <h2 className="font-semibold">{c.marketsTitle}</h2>
                <p className="mt-1 text-sm text-ink-muted">{dict.hero.markets.join(" · ")}</p>
              </div>
            </div>
            <div className="surface-card flex gap-4 p-6">
              <IconTile icon={Clock} tone="energy" />
              <div>
                <h2 className="font-semibold">{c.responseTitle}</h2>
                <p className="mt-1 text-sm text-ink-muted">{c.responseBody}</p>
              </div>
            </div>
            {siteConfig.contactEmail && (
              <div className="surface-card flex gap-4 p-6">
                <IconTile icon={Mail} />
                <div>
                  <h2 className="font-semibold">{c.emailTitle}</h2>
                  <a href={`mailto:${siteConfig.contactEmail}`} className="mt-1 block text-sm text-blue-300 hover:text-white" dir="ltr">{siteConfig.contactEmail}</a>
                </div>
              </div>
            )}
          </aside>
        </Container>
      </Section>
    </>
  );
}
