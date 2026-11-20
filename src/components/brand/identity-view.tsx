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
        <PaletteSwatches palette={identity.palette} roles={b.colorRoles} />
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
        {/* Container-sized: 3 columns only when each card has room; otherwise 1 → 2 → 3 rows stay in order. */}
        <div className="@container">
          <ol className="grid gap-4 @2xl:grid-cols-3">
            {identity.concepts.map((c, i) => (
              <li key={`${c.name}-${i}`} className="surface-card flex min-w-0 flex-col gap-4 p-4 @md:flex-row @2xl:flex-col">
                <div className="w-full shrink-0 space-y-2 @md:w-44 @2xl:w-full">
                  <div className="relative">
                    <SvgLogo svg={c.svg} alt={`${identity.brand_name} — ${c.name}`} className="aspect-square w-full" />
                    <span className="absolute start-2 top-2 inline-flex size-7 items-center justify-center rounded-full bg-navy text-xs font-bold tabular-nums text-white shadow" aria-hidden>{i + 1}</span>
                  </div>
                  {c.svg && (
                    <div className="grid grid-cols-2 gap-2" aria-hidden>
                      <SvgLogo svg={c.svg} alt="" className="aspect-[3/2] w-full border-white/10 bg-navy [&_img]:p-2" />
                      <SvgLogo svg={c.svg} alt="" className="aspect-[3/2] w-full border-line bg-[#F6F4EF] [&_img]:p-2" />
                    </div>
                  )}
                </div>
                <div className="flex min-w-0 flex-1 flex-col">
                  <p className="text-xs font-semibold uppercase tracking-wider text-blue-300">{d.identity.concept} {i + 1}</p>
                  <p className="mt-0.5 break-words font-semibold" dir="auto">{c.name}</p>
                  <p className="mt-1 flex-1 break-words text-xs leading-relaxed text-ink-muted" dir="auto">{c.idea}</p>
                  {c.logo_prompt && (
                    <details className="mt-2 text-xs text-ink-subtle">
                      <summary className="cursor-pointer hover:text-white">{b.logoPrompt}</summary>
                      <p className="mt-1 whitespace-pre-wrap break-words" dir="ltr">{c.logo_prompt}</p>
                    </details>
                  )}
                  {canApply && generationId && <div className="mt-3"><ApplyConceptButton generationId={generationId} concept={i} d={d} brandHref={brandHref} /></div>}
                </div>
              </li>
            ))}
          </ol>
        </div>
        <p className="mt-3 text-xs text-ink-subtle">{d.identity.svgNote}</p>
      </section>
    </div>
  );
}
