import { Check } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { LinkButton } from "@/components/ui/button";
import { Container, Section } from "@/components/ui/container";
import { SectionHeading } from "@/components/ui/section-heading";
import { PageHero } from "@/components/site/page-hero";
import { agencyPlanPricing, saasPlanPricing } from "@/config/pricing";
import { localizedHref, type Locale } from "@/i18n/config";
import type { Dictionary } from "@/i18n/dictionaries/en";
import { loadPage, pageMetadata } from "@/lib/page";
import { cn } from "@/lib/utils";

export const generateMetadata = pageMetadata((d) => ({ title: d.nav.pricing, description: d.pricing.subtitle }));

type Plan = Dictionary["pricing"]["agencyPlans"][number];

function PlanGrid({ plans, pricing, fallback, cta, ctaHref, dict, locale }: {
  plans: Plan[];
  pricing: Record<string, { monthlyUsd: number | null; featured?: boolean }>;
  fallback: string;
  cta: string;
  ctaHref: string;
  dict: Dictionary;
  locale: Locale;
}) {
  const fmt = new Intl.NumberFormat(locale === "en" ? "en-US" : "ar-EG", { style: "currency", currency: "USD", maximumFractionDigits: 0 });
  return (
    <div className="mt-10 grid gap-4 lg:grid-cols-3">
      {plans.map((plan) => {
        const price = pricing[plan.id];
        const featured = price?.featured;
        return (
          <div
            key={plan.id}
            className={cn(
              "surface-card relative flex flex-col p-8",
              featured && "border-blue/50 bg-gradient-to-b from-blue/15 to-transparent shadow-(--shadow-glow-blue)",
            )}
          >
            <div className="flex items-center justify-between">
              <h3 className="text-xl font-semibold">{plan.name}</h3>
              {featured && <Badge tone="orange">{dict.pricing.popular}</Badge>}
            </div>
            <p className="mt-2 text-sm text-ink-muted">{plan.body}</p>
            <p className="mt-8 text-3xl font-bold tracking-tight">
              {price?.monthlyUsd != null ? (
                <>{fmt.format(price.monthlyUsd)}<span className="text-base font-medium text-ink-muted"> {dict.pricing.perMonth}</span></>
              ) : (
                fallback
              )}
            </p>
            <ul className="mt-8 flex-1 space-y-3 border-t border-line pt-8">
              {plan.features.map((f) => (
                <li key={f} className="flex items-start gap-2.5 text-sm">
                  <Check className="mt-0.5 size-4 shrink-0 text-blue" aria-hidden />
                  {f}
                </li>
              ))}
            </ul>
            <LinkButton href={ctaHref} variant={featured ? "primary" : "secondary"} className="mt-8 w-full">
              {cta}
            </LinkButton>
          </div>
        );
      })}
    </div>
  );
}

export default async function PricingPage({ params }: PageProps<"/[locale]/pricing">) {
  const { locale, dict } = await loadPage(params);
  const p = dict.pricing;
  return (
    <>
      <PageHero eyebrow={p.eyebrow} title={p.title} subtitle={p.subtitle} />
      <Section>
        <Container>
          <SectionHeading title={p.agencyTitle} subtitle={p.agencySubtitle} />
          <PlanGrid plans={p.agencyPlans} pricing={agencyPlanPricing} fallback={p.customQuote} cta={p.contactSales} ctaHref={localizedHref(locale, "/contact")} dict={dict} locale={locale} />
        </Container>
      </Section>
      <Section className="border-t border-line">
        <Container>
          <div className="flex flex-wrap items-center gap-3">
            <SectionHeading title={p.saasTitle} subtitle={p.saasSubtitle} />
          </div>
          <PlanGrid plans={p.saasPlans} pricing={saasPlanPricing} fallback={p.earlyAccess} cta={p.joinWaitlist} ctaHref={localizedHref(locale, "/contact?service=power-ai")} dict={dict} locale={locale} />
          <p className="mt-10 text-center text-sm text-ink-subtle">{p.note}</p>
        </Container>
      </Section>
    </>
  );
}
