import { Info } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Container, Section } from "@/components/ui/container";
import { SectionHeading } from "@/components/ui/section-heading";
import { CtaBand } from "@/components/site/cta-band";
import { IconTile, toolIcons } from "@/components/site/icons";
import { PageHero } from "@/components/site/page-hero";
import { localizedHref } from "@/i18n/config";
import { aiTools } from "@/lib/ai/tools";
import { loadPage, pageMetadata } from "@/lib/page";

export const generateMetadata = pageMetadata((d) => ({ title: d.nav.powerAi, description: d.powerAi.subtitle }));

export default async function PowerAiPage({ params }: PageProps<"/[locale]/power-ai">) {
  const { locale, dict } = await loadPage(params);
  const p = dict.powerAi;
  return (
    <>
      <PageHero eyebrow={p.eyebrow} title={p.title} subtitle={p.subtitle}>
        <p className="mt-8 inline-flex items-center gap-2 rounded-full border border-orange/30 bg-orange/10 px-4 py-2 text-sm text-yellow">
          <Info className="size-4 shrink-0" aria-hidden />
          {p.statusNote}
        </p>
      </PageHero>
      <Section>
        <Container className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {aiTools.map((t, i) => {
            const tool = dict.aiTools[t.key];
            return (
              <Card key={t.key} interactive className={i === 0 ? "flex flex-col lg:col-span-2" : "flex flex-col"}>
                <div className="flex items-center justify-between gap-3">
                  <IconTile icon={toolIcons[t.key]} tone={i === 0 ? "energy" : "blue"} />
                  <Badge tone="neutral">{dict.common.inDevelopment}</Badge>
                </div>
                <h2 className="mt-5 text-xl font-semibold">{tool.name}</h2>
                <p className="mt-2 leading-relaxed text-ink-muted">{tool.description}</p>
              </Card>
            );
          })}
        </Container>
      </Section>
      <Section className="border-t border-line">
        <Container>
          <SectionHeading title={p.howTitle} align="center" />
          <ol className="mt-12 grid gap-4 md:grid-cols-3">
            {p.how.map((h, i) => (
              <li key={h.title}>
                <Card className="h-full text-center">
                  <span className="mx-auto flex size-10 items-center justify-center rounded-full bg-gradient-to-br from-yellow to-orange text-sm font-bold text-navy">{i + 1}</span>
                  <h3 className="mt-4 text-lg font-semibold">{h.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-ink-muted">{h.body}</p>
                </Card>
              </li>
            ))}
          </ol>
        </Container>
      </Section>
      <CtaBand title={dict.home.ai.title} subtitle={dict.home.ai.subtitle} primary={{ label: dict.common.requestAccess, href: localizedHref(locale, "/contact?service=power-ai") }} secondary={{ label: dict.nav.pricing, href: localizedHref(locale, "/pricing") }} />
    </>
  );
}
