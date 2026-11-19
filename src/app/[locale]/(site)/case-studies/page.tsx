import { Card } from "@/components/ui/card";
import { Container, Section } from "@/components/ui/container";
import { SectionHeading } from "@/components/ui/section-heading";
import { CtaBand } from "@/components/site/cta-band";
import { PageHero } from "@/components/site/page-hero";
import { localizedHref } from "@/i18n/config";
import { loadPage, pageMetadata } from "@/lib/page";

export const generateMetadata = pageMetadata((d) => ({ title: d.nav.caseStudies, description: d.caseStudies.subtitle }));

export default async function CaseStudiesPage({ params }: PageProps<"/[locale]/case-studies">) {
  const { locale, dict } = await loadPage(params);
  const c = dict.caseStudies;
  return (
    <>
      <PageHero eyebrow={c.eyebrow} title={c.title} subtitle={c.subtitle} />
      <Section>
        <Container>
          <SectionHeading title={c.frameworkTitle} />
          <ol className="mt-12 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {c.framework.map((f, i) => (
              <li key={f.title}>
                <Card className="relative h-full overflow-hidden">
                  <span aria-hidden className="absolute -end-2 -top-6 text-8xl font-extrabold text-white/[0.04]">{i + 1}</span>
                  <span className={i === 3 ? "text-sm font-semibold text-yellow" : "text-sm font-semibold text-blue-300"}>
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <h3 className="mt-3 text-xl font-semibold">{f.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-ink-muted">{f.body}</p>
                </Card>
              </li>
            ))}
          </ol>
        </Container>
      </Section>
      <CtaBand title={c.emptyTitle} subtitle={c.emptyBody} primary={{ label: dict.common.startProject, href: localizedHref(locale, "/contact") }} />
    </>
  );
}
