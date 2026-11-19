import { Check } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Container, Section } from "@/components/ui/container";
import { SectionHeading } from "@/components/ui/section-heading";
import { CtaBand } from "@/components/site/cta-band";
import { PageHero } from "@/components/site/page-hero";
import { localizedHref } from "@/i18n/config";
import { loadPage, pageMetadata } from "@/lib/page";

export const generateMetadata = pageMetadata((d) => ({ title: d.nav.about, description: d.about.intro }));

export default async function AboutPage({ params }: PageProps<"/[locale]/about">) {
  const { locale, dict } = await loadPage(params);
  const a = dict.about;
  return (
    <>
      <PageHero eyebrow={a.eyebrow} title={a.title} subtitle={a.intro} />
      <Section>
        <Container className="grid gap-4 md:grid-cols-2">
          {[{ t: a.missionTitle, b: a.mission }, { t: a.visionTitle, b: a.vision }].map((x, i) => (
            <Card key={x.t} className="p-8 sm:p-10">
              <p className={i === 0 ? "text-sm font-semibold text-blue-300" : "text-sm font-semibold text-yellow"}>{x.t}</p>
              <p className="mt-4 text-xl leading-relaxed font-medium text-pretty sm:text-2xl">{x.b}</p>
            </Card>
          ))}
        </Container>
      </Section>
      <Section className="pt-0">
        <Container>
          <SectionHeading title={a.valuesTitle} />
          <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {a.values.map((v, i) => (
              <Card key={v.title}>
                <span className="text-sm font-bold text-gradient-energy">{String(i + 1).padStart(2, "0")}</span>
                <h3 className="mt-3 text-lg font-semibold">{v.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-ink-muted">{v.body}</p>
              </Card>
            ))}
          </div>
        </Container>
      </Section>
      <Section className="border-t border-line">
        <Container className="grid gap-10 lg:grid-cols-2">
          <SectionHeading title={a.whyTitle} />
          <ul className="space-y-4">
            {a.why.map((w) => (
              <li key={w} className="flex items-start gap-3 text-lg">
                <span className="mt-1 inline-flex size-6 shrink-0 items-center justify-center rounded-full bg-blue/15 text-blue-300">
                  <Check className="size-3.5" aria-hidden />
                </span>
                {w}
              </li>
            ))}
          </ul>
        </Container>
      </Section>
      <CtaBand title={dict.home.cta.title} subtitle={dict.home.cta.subtitle} primary={{ label: dict.common.startProject, href: localizedHref(locale, "/contact") }} />
    </>
  );
}
