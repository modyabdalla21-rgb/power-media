import type { ReactNode } from "react";
import { Container } from "@/components/ui/container";
import { SectionHeading } from "@/components/ui/section-heading";

/** Header block for inner public pages. */
export function PageHero({ eyebrow, title, subtitle, children }: { eyebrow: string; title: string; subtitle?: string; children?: ReactNode }) {
  return (
    <div className="relative overflow-hidden border-b border-line">
      <div aria-hidden className="bg-grid absolute inset-0" />
      <div aria-hidden className="absolute -top-40 start-1/2 h-80 w-[48rem] -translate-x-1/2 rounded-full bg-blue/20 blur-[120px] rtl:translate-x-1/2" />
      <Container className="relative py-20 sm:py-24">
        <SectionHeading as="h1" eyebrow={eyebrow} title={title} subtitle={subtitle} className="animate-fade-up" />
        {children}
      </Container>
    </div>
  );
}
