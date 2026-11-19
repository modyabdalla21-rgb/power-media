import { ArrowRight } from "lucide-react";
import { BoltMark } from "@/components/brand/logo";
import { LinkButton } from "@/components/ui/button";
import { Container } from "@/components/ui/container";

type Props = { title: string; subtitle: string; primary: { label: string; href: string }; secondary?: { label: string; href: string } };

export function CtaBand({ title, subtitle, primary, secondary }: Props) {
  return (
    <Container className="py-20 sm:py-24">
      <div className="relative overflow-hidden rounded-[1.75rem] border border-blue/25 bg-gradient-to-br from-blue/20 via-surface-2 to-surface-1 px-6 py-14 sm:px-14 sm:py-16">
        <div aria-hidden className="absolute -end-24 -top-24 size-80 rounded-full bg-blue/25 blur-[100px]" />
        <BoltMark className="pointer-events-none absolute -bottom-8 end-6 h-56 w-auto opacity-[0.12] sm:end-14" />
        <div className="relative max-w-2xl">
          <h2 className="text-3xl font-bold tracking-tight text-balance sm:text-4xl">{title}</h2>
          <p className="mt-4 text-base leading-relaxed text-ink-muted sm:text-lg">{subtitle}</p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <LinkButton href={primary.href} size="lg">
              {primary.label}
              <ArrowRight className="flip-rtl size-4" aria-hidden />
            </LinkButton>
            {secondary && (
              <LinkButton href={secondary.href} size="lg" variant="secondary">{secondary.label}</LinkButton>
            )}
          </div>
        </div>
      </div>
    </Container>
  );
}
