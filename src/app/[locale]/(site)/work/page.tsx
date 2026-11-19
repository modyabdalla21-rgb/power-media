import { Container, Section } from "@/components/ui/container";
import { CtaBand } from "@/components/site/cta-band";
import { PageHero } from "@/components/site/page-hero";
import { PortfolioPlaceholder } from "@/components/site/portfolio-placeholder";
import { portfolio } from "@/content/portfolio";
import { localizedHref } from "@/i18n/config";
import { loadPage, pageMetadata } from "@/lib/page";

export const generateMetadata = pageMetadata((d) => ({ title: d.nav.work, description: d.work.subtitle }));

export default async function WorkPage({ params }: PageProps<"/[locale]/work">) {
  const { locale, dict } = await loadPage(params);
  const w = dict.work;
  return (
    <>
      <PageHero eyebrow={w.eyebrow} title={w.title} subtitle={w.subtitle}>
        <ul className="mt-10 flex flex-wrap gap-2" aria-label={w.eyebrow}>
          {w.categories.map((c, i) => (
            <li key={c} className={i === 0 ? "rounded-full bg-blue px-4 py-1.5 text-sm font-medium" : "rounded-full border border-line-strong px-4 py-1.5 text-sm text-ink-muted"}>
              {c}
            </li>
          ))}
        </ul>
      </PageHero>
      <Section>
        <Container className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {portfolio.length === 0 &&
            w.categories.slice(1).map((c, i) => (
              <PortfolioPlaceholder key={c} category={c} label={w.placeholderLabel} body={w.placeholderBody} variant={i} />
            ))}
        </Container>
      </Section>
      <CtaBand title={dict.caseStudies.emptyTitle} subtitle={dict.caseStudies.emptyBody} primary={{ label: dict.common.startProject, href: localizedHref(locale, "/contact") }} />
    </>
  );
}
