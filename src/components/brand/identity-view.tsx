import { ApplyConceptButton } from "@/components/client/apply-concept";
import type { Dictionary } from "@/i18n/dictionaries/en";
import type { BrandIdentity } from "@/lib/ai/identity";
import { PaletteSwatches, SvgLogo, TypographyList, VoiceList } from "./brand-visuals";

type D = Dictionary["dashboard"];

/** AI brand-identity result: shared brand system + three logo concepts. */
export function IdentityConceptsView({ identity, d, generationId, canApply, brandHref, dir }: {
  identity: BrandIdentity;
  d: D;
  generationId?: string | null;
  canApply?: boolean;
  brandHref?: string;
  dir?: "ltr" | "rtl";
}) {
  const b = d.brand;
  return (
    <div className="space-y-6" dir={dir}>
      <header>
        <h3 className="text-xl font-bold">{identity.brand_name}</h3>
        <p className="mt-1 text-blue-300">{identity.tagline}</p>
        <p className="mt-3 text-sm leading-relaxed text-ink-muted">{identity.positioning}</p>
      </header>
      <section>
        <h4 className="mb-2 text-xs font-semibold uppercase tracking-wider text-ink-subtle">{b.palette}</h4>
        <PaletteSwatches palette={identity.palette} />
      </section>
      <div className="grid gap-6 sm:grid-cols-2">
        <section>
          <h4 className="mb-2 text-xs font-semibold uppercase tracking-wider text-ink-subtle">{b.typography}</h4>
          <TypographyList typography={identity.typography} t={b} />
        </section>
        <section>
          <h4 className="mb-2 text-xs font-semibold uppercase tracking-wider text-ink-subtle">{b.voice}</h4>
          <VoiceList voice={{ ...identity.voice, personality: identity.personality }} t={b} />
        </section>
      </div>
      <section>
        <h4 className="mb-3 text-xs font-semibold uppercase tracking-wider text-ink-subtle">{b.logo}</h4>
        <ul className="grid gap-4 md:grid-cols-3">
          {identity.concepts.map((c, i) => (
            <li key={`${c.name}-${i}`} className="surface-card flex flex-col p-4">
              <SvgLogo svg={c.svg} alt={`${identity.brand_name} — ${c.name}`} className="aspect-square w-full" />
              <p className="mt-3 text-xs text-ink-subtle">{d.identity.concept} {i + 1}</p>
              <p className="font-semibold">{c.name}</p>
              <p className="mt-1 flex-1 text-xs leading-relaxed text-ink-muted">{c.idea}</p>
              {c.logo_prompt && (
                <details className="mt-2 text-xs text-ink-subtle">
                  <summary className="cursor-pointer hover:text-white">{b.logoPrompt}</summary>
                  <p className="mt-1 whitespace-pre-wrap" dir="ltr">{c.logo_prompt}</p>
                </details>
              )}
              {canApply && generationId && <div className="mt-3"><ApplyConceptButton generationId={generationId} concept={i} d={d} brandHref={brandHref} /></div>}
            </li>
          ))}
        </ul>
        <p className="mt-3 text-xs text-ink-subtle">{d.identity.svgNote}</p>
      </section>
    </div>
  );
}
