import { ApplyConceptButton } from "@/components/client/apply-concept";
import type { Dictionary } from "@/i18n/dictionaries/en";
import type { BrandIdentity } from "@/lib/ai/identity";
import { PaletteSwatches, TypographyList, VoiceList } from "./brand-visuals";
import { ConceptLogo, type LogoImage } from "./concept-logo";

type D = Dictionary["dashboard"];

/** AI brand-identity result: shared brand system + three logo concepts. */
export function IdentityConceptsView({ identity, d, generationId, canApply, brandHref, dir, images, autoRender = false }: {
  identity: BrandIdentity;
  d: D;
  generationId?: string | null;
  canApply?: boolean;
  brandHref?: string;
  dir?: "ltr" | "rtl";
  /** Already rendered logo images per concept (signed URLs). */
  images?: (LogoImage | null)[];
  /** Render missing logo images on mount (fresh generations). */
  autoRender?: boolean;
}) {
  const b = d.brand;
  const fileBase = identity.brand_name.replace(/[^\p{L}\p{N}]+/gu, "-").replace(/^-|-$/g, "").slice(0, 40) || "logo";
  return (
    <div className="space-y-6" dir={dir}>
      <header id="identity-kit" className="scroll-mt-24">
        <h3 className="break-words text-xl font-bold">{identity.brand_name}</h3>
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
                    <ConceptLogo
                      generationId={generationId ?? null}
                      concept={i}
                      svg={c.svg}
                      initial={images?.[i] ?? null}
                      auto={autoRender}
                      preview={generationId ? undefined : { brand: identity.brand_name, name: c.name, idea: c.idea, logoPrompt: c.logo_prompt, colors: identity.palette.map((p) => p.hex) }}
                      alt={`${identity.brand_name} — ${c.name}`}
                      t={d.identity}
                      fileBase={`${fileBase}-${i + 1}`}
                    />
                    <span className="absolute start-2 top-2 inline-flex size-7 items-center justify-center rounded-full bg-navy text-xs font-bold tabular-nums text-white shadow" aria-hidden>{i + 1}</span>
                  </div>
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
                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    {canApply && generationId && <ApplyConceptButton generationId={generationId} concept={i} d={d} brandHref={brandHref} />}
                    <a href="#identity-kit" className="inline-flex h-9 items-center rounded-lg px-2 text-xs font-medium text-ink-muted hover:text-white">{d.identity.kitDetails}</a>
                  </div>
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
