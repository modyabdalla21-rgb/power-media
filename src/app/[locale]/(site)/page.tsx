import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowRight, ArrowUpRight, Check, Quote } from "lucide-react";
import { BoltMark } from "@/components/brand/logo";
import { Badge } from "@/components/ui/badge";
import { LinkButton } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Container, Section } from "@/components/ui/container";
import { SectionHeading } from "@/components/ui/section-heading";
import { CtaBand } from "@/components/site/cta-band";
import { IconTile, serviceIcons, toolIcons } from "@/components/site/icons";
import { PortfolioPlaceholder } from "@/components/site/portfolio-placeholder";
import { portfolio, testimonials } from "@/content/portfolio";
import { contentLocale, isLocale, localizedHref } from "@/i18n/config";
import { getDictionary } from "@/i18n/get-dictionary";
import { aiTools } from "@/lib/ai/tools";

export default async function HomePage({ params }: PageProps<"/[locale]">) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const dict = await getDictionary(locale);
  const href = (p: string) => localizedHref(locale, p);
  const { hero, home } = dict;

  return (
    <>
      {/* ── Hero ─────────────────────────────────────────────── */}
      <div className="relative overflow-hidden">
        <div aria-hidden className="bg-grid absolute inset-0" />
        <div aria-hidden className="absolute -top-48 start-[10%] h-[34rem] w-[34rem] rounded-full bg-blue/25 blur-[140px] animate-glow" />
        <div aria-hidden className="absolute top-40 end-[5%] h-72 w-72 rounded-full bg-orange/15 blur-[120px]" />

        <Container className="relative grid items-center gap-16 pt-16 pb-24 sm:pt-24 lg:grid-cols-12 lg:pb-32">
          <div className="lg:col-span-7">
            <Badge tone="blue" className="animate-fade-up">
              <span className="size-1.5 rounded-full bg-yellow shadow-[0_0_10px_#FFB800]" />
              {hero.eyebrow}
            </Badge>
            <h1 className="mt-7 text-[2.6rem] leading-[1.08] font-extrabold tracking-tight text-balance animate-fade-up [animation-delay:80ms] sm:text-6xl lg:text-7xl">
              {hero.titleA} <span className="text-gradient-blue">{hero.titleHighlight}</span> {hero.titleB}
            </h1>
            <p className="mt-7 max-w-xl text-lg leading-relaxed text-ink-muted animate-fade-up [animation-delay:160ms]">
              {hero.subtitle}
            </p>
            <div className="mt-10 flex flex-col gap-3 animate-fade-up [animation-delay:240ms] sm:flex-row">
              <LinkButton href={href("/signup")} size="lg">
                {hero.primaryCta}
                <ArrowRight className="flip-rtl size-4" aria-hidden />
              </LinkButton>
              <LinkButton href={href("/power-ai")} size="lg" variant="secondary">
                <BoltMark className="h-4 w-auto" />
                {hero.secondaryCta}
              </LinkButton>
            </div>
            <div className="mt-12 flex flex-wrap items-center gap-x-5 gap-y-3 text-sm text-ink-subtle animate-fade-up [animation-delay:320ms]">
              <span>{hero.marketsLabel}</span>
              {hero.markets.map((m) => (
                <span key={m} className="inline-flex items-center gap-2 font-medium text-ink-muted">
                  <span aria-hidden className="size-1 rounded-full bg-blue" />
                  {m}
                </span>
              ))}
            </div>
          </div>

          {/* Brand visual — the bolt as an energy core */}
          <div aria-hidden className="relative mx-auto hidden aspect-square w-full max-w-md lg:col-span-5 lg:block">
            <div className="absolute inset-0 rounded-full border border-line" />
            <div className="absolute inset-[12%] rounded-full border border-blue/20" />
            <div className="absolute inset-[26%] rounded-full border border-blue/30 bg-blue/5 shadow-[0_0_120px_-20px_rgb(7_137_232/0.6)]" />
            <BoltMark className="absolute inset-0 m-auto h-[46%] w-auto drop-shadow-[0_0_40px_rgb(255_121_0/0.45)]" />
            {[
              { label: home.services.eyebrow, pos: "top-[8%] start-[-4%]" },
              { label: dict.services.items[1].title, pos: "top-[44%] end-[-10%]" },
              { label: dict.nav.powerAi, pos: "bottom-[8%] start-[6%]" },
            ].map((chip) => (
              <span key={chip.pos} className={`absolute ${chip.pos} rounded-full border border-line-strong bg-surface-2/90 px-4 py-2 text-xs font-semibold text-white shadow-(--shadow-card) backdrop-blur`}>
                {chip.label}
              </span>
            ))}
          </div>
        </Container>
      </div>

      {/* ── Capability facts ─────────────────────────────────── */}
      <div className="border-y border-line bg-surface-1/50">
        <Container className="grid grid-cols-2 divide-line lg:grid-cols-4 lg:divide-x rtl:lg:divide-x-reverse">
          {home.capabilities.facts.map((f) => (
            <div key={f.label} className="px-2 py-8 text-center sm:px-6">
              <p className="text-4xl font-extrabold text-gradient-blue sm:text-5xl">{f.value}</p>
              <p className="mt-2 text-sm text-ink-muted">{f.label}</p>
            </div>
          ))}
        </Container>
      </div>

      {/* ── Services ─────────────────────────────────────────── */}
      <Section>
        <Container>
          <div className="flex flex-col justify-between gap-6 md:flex-row md:items-end">
            <SectionHeading eyebrow={home.services.eyebrow} title={home.services.title} subtitle={home.services.subtitle} />
            <Link href={href("/services")} className="group inline-flex min-h-11 shrink-0 items-center gap-2 text-sm font-semibold text-blue-300 hover:text-white">
              {dict.common.viewAll}
              <ArrowRight className="flip-rtl size-4 transition-transform group-hover:translate-x-1 rtl:group-hover:-translate-x-1" aria-hidden />
            </Link>
          </div>
          <div className="mt-14 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {dict.services.items.map((s) => (
              <Card key={s.id} interactive className="group flex flex-col">
                <IconTile icon={serviceIcons[s.id]} />
                <h3 className="mt-5 text-lg font-semibold">{s.title}</h3>
                <p className="mt-2 flex-1 text-sm leading-relaxed text-ink-muted">{s.body}</p>
                <Link href={href(`/services#${s.id}`)} className="mt-3 inline-flex min-h-10 items-center gap-1.5 text-sm font-medium text-blue-300 group-hover:text-white">
                  {dict.common.learnMore}
                  <ArrowUpRight className="flip-rtl size-4" aria-hidden />
                </Link>
              </Card>
            ))}
          </div>
        </Container>
      </Section>

      {/* ── POWER AI ─────────────────────────────────────────── */}
      <Section className="overflow-hidden border-y border-line bg-gradient-to-b from-surface-1 to-surface-0">
        <div aria-hidden className="absolute end-0 top-0 h-96 w-96 rounded-full bg-orange/10 blur-[140px]" />
        <Container className="relative grid gap-14 lg:grid-cols-12">
          <div className="lg:col-span-5">
            <SectionHeading eyebrow={home.ai.eyebrow} title={home.ai.title} subtitle={home.ai.subtitle} />
            <Badge tone="blue" className="mt-6">{dict.common.liveForTeam}</Badge>
            <div className="mt-8">
              <LinkButton href={href("/power-ai")} variant="energy" size="lg">
                {home.ai.cta}
                <ArrowRight className="flip-rtl size-4" aria-hidden />
              </LinkButton>
            </div>
          </div>
          <ul className="grid gap-3 sm:grid-cols-2 lg:col-span-7">
            {aiTools.filter((t) => !t.hub).map((t, i) => {
              const tool = dict.aiTools[t.key];
              return (
                <li key={t.key} className={i === 0 ? "sm:col-span-2" : undefined}>
                  <Card interactive className="flex h-full items-start gap-4 p-5">
                    <IconTile icon={toolIcons[t.key]} tone={i === 0 ? "energy" : "blue"} />
                    <div>
                      <h3 className="font-semibold">{tool.name}</h3>
                      <p className="mt-1 text-sm leading-relaxed text-ink-muted">{tool.description}</p>
                    </div>
                  </Card>
                </li>
              );
            })}
          </ul>
        </Container>
      </Section>

      {/* ── Process ──────────────────────────────────────────── */}
      <Section>
        <Container>
          <SectionHeading eyebrow={home.process.eyebrow} title={home.process.title} align="center" />
          <ol className="relative mt-16 grid gap-6 md:grid-cols-5">
            <div aria-hidden className="absolute inset-x-[10%] top-6 hidden h-px bg-gradient-to-r from-blue/0 via-blue/50 to-orange/50 md:block" />
            {home.process.steps.map((step, i) => (
              <li key={step.title} className="relative text-center">
                <span className="relative mx-auto flex size-12 items-center justify-center rounded-full border border-blue/40 bg-surface-2 text-sm font-bold text-blue-300 shadow-[0_0_30px_-6px_rgb(7_137_232/0.6)]">
                  {String(i + 1).padStart(2, "0")}
                </span>
                <h3 className="mt-5 font-semibold">{step.title}</h3>
                <p className="mx-auto mt-2 max-w-[16rem] text-sm leading-relaxed text-ink-muted">{step.body}</p>
              </li>
            ))}
          </ol>
        </Container>
      </Section>

      {/* ── Results: what we measure ─────────────────────────── */}
      <Section className="pt-0">
        <Container>
          <Card className="grid gap-10 p-8 sm:p-12 lg:grid-cols-2 lg:items-center">
            <SectionHeading eyebrow={home.capabilities.eyebrow} title={home.capabilities.title} subtitle={home.capabilities.subtitle} />
            <div>
              <p className="text-sm font-medium text-ink-subtle">{home.capabilities.kpiLabel}</p>
              <ul className="mt-4 flex flex-wrap gap-2.5">
                {home.capabilities.kpis.map((k) => (
                  <li key={k} className="rounded-full border border-line-strong bg-white/[0.03] px-4 py-2 text-sm font-medium">
                    {k}
                  </li>
                ))}
              </ul>
            </div>
          </Card>
        </Container>
      </Section>

      {/* ── Portfolio preview ────────────────────────────────── */}
      <Section className="pt-0">
        <Container>
          <SectionHeading eyebrow={home.work.eyebrow} title={home.work.title} subtitle={home.work.subtitle} />
          <div className="mt-12 grid gap-4 md:grid-cols-3">
            {portfolio.length === 0
              ? dict.work.categories.slice(1, 4).map((c, i) => (
                  <PortfolioPlaceholder key={c} category={c} label={dict.work.placeholderLabel} body={dict.work.placeholderBody} variant={i} />
                ))
              : null /* Render real, client-approved portfolio items here. */}
          </div>
        </Container>
      </Section>

      {/* ── Testimonials ─────────────────────────────────────── */}
      <Section className="border-t border-line">
        <Container>
          <SectionHeading eyebrow={home.testimonials.eyebrow} title={testimonials.length ? home.testimonials.title : home.testimonials.promisesTitle} align="center" />
          {testimonials.length > 0 ? (
            <div className="mt-14 grid gap-4 md:grid-cols-3">
              {testimonials.map((t) => (
                <Card key={t.author} className="flex flex-col">
                  <Quote className="size-6 text-blue" aria-hidden />
                  <blockquote className="mt-4 flex-1 leading-relaxed">{t.quote[contentLocale(locale)]}</blockquote>
                  <p className="mt-6 font-semibold">{t.author}</p>
                  <p className="text-sm text-ink-muted">{t.role[contentLocale(locale)]}, {t.company}</p>
                </Card>
              ))}
            </div>
          ) : (
            <>
              <div className="mt-14 grid gap-4 md:grid-cols-3">
                {home.testimonials.promises.map((p) => (
                  <Card key={p.title}>
                    <span className="inline-flex size-8 items-center justify-center rounded-full bg-blue/15 text-blue-300">
                      <Check className="size-4" aria-hidden />
                    </span>
                    <h3 className="mt-4 font-semibold">{p.title}</h3>
                    <p className="mt-2 text-sm leading-relaxed text-ink-muted">{p.body}</p>
                  </Card>
                ))}
              </div>
              <p className="mx-auto mt-8 max-w-2xl text-center text-sm text-ink-subtle">{home.testimonials.empty}</p>
            </>
          )}
        </Container>
      </Section>

      <CtaBand
        title={home.cta.title}
        subtitle={home.cta.subtitle}
        primary={{ label: home.cta.primary, href: href("/signup") }}
        secondary={{ label: home.cta.secondary, href: href("/pricing") }}
      />
    </>
  );
}
