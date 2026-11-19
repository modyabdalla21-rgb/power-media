import { ImageIcon } from "lucide-react";
import type { Dictionary } from "@/i18n/dictionaries/en";
import { cn } from "@/lib/utils";

type B = Dictionary["dashboard"]["brand"];
export type Swatch = { name?: string; hex: string; role?: string; usage?: string };
export type Typography = { heading?: { family: string; why?: string }; body?: { family: string; why?: string }; arabic?: { family: string; why?: string } };

const HEX = /^#[0-9a-f]{6}$/i;

/**
 * Renders an (already sanitised) SVG logo through <img src="data:…">.
 * Inside <img>, SVG can't run scripts or load external resources, so even
 * unexpected markup can't affect the page.
 */
export function SvgLogo({ svg, url, alt, className }: { svg?: string | null; url?: string | null; alt: string; className?: string }) {
  const src = svg ? `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}` : url && /^https:\/\//.test(url) ? url : null;
  return (
    <div className={cn("flex items-center justify-center overflow-hidden rounded-xl border border-line bg-white", className)}>
      {src ? (
        // eslint-disable-next-line @next/next/no-img-element -- data: URI / external logo, not optimisable
        <img src={src} alt={alt} className="h-full w-full object-contain p-3" referrerPolicy="no-referrer" />
      ) : (
        <ImageIcon className="size-8 text-navy/30" aria-hidden />
      )}
    </div>
  );
}

/** Pick black or white text for a swatch background. */
const textOn = (hex: string) => {
  const n = parseInt(hex.slice(1), 16);
  const [r, g, b] = [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  return 0.299 * r + 0.587 * g + 0.114 * b > 150 ? "#001323" : "#ffffff";
};

export function PaletteSwatches({ palette }: { palette: Swatch[] }) {
  const valid = palette.filter((c) => HEX.test(c.hex));
  return (
    <ul className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
      {valid.map((c, i) => (
        <li key={`${c.hex}-${i}`} className="overflow-hidden rounded-xl border border-line">
          <div className="flex h-16 items-end p-2 text-[11px] font-semibold uppercase" style={{ backgroundColor: c.hex, color: textOn(c.hex) }} dir="ltr">
            {c.hex}
          </div>
          <div className="space-y-0.5 p-2 text-xs">
            <p className="truncate font-medium">{c.name ?? c.role}</p>
            {c.role && c.name && <p className="truncate text-ink-subtle">{c.role}</p>}
          </div>
        </li>
      ))}
    </ul>
  );
}

export function TypographyList({ typography, t }: { typography: Typography; t: B }) {
  const rows = ([
    [t.heading, typography.heading],
    [t.body, typography.body],
    [t.arabic, typography.arabic],
  ] as [string, { family: string; why?: string } | undefined][]).filter((r): r is [string, { family: string; why?: string }] => !!r[1]?.family);
  return (
    <dl className="space-y-3 text-sm">
      {rows.map(([label, f]) => (
        <div key={label}>
          <dt className="text-xs text-ink-subtle">{label}</dt>
          <dd className="font-semibold" dir="ltr">{f.family}</dd>
          {f.why && <dd className="text-xs leading-relaxed text-ink-muted">{f.why}</dd>}
        </div>
      ))}
    </dl>
  );
}

export function VoiceList({ voice, t }: { voice: { do?: string[]; dont?: string[]; personality?: string[] }; t: B }) {
  return (
    <div className="space-y-3 text-sm">
      {!!voice.personality?.length && (
        <ul className="flex flex-wrap gap-1.5">
          {voice.personality.map((p) => <li key={p} className="rounded-full border border-line-strong px-2.5 py-0.5 text-xs">{p}</li>)}
        </ul>
      )}
      <div className="grid gap-3 sm:grid-cols-2">
        {[
          [t.do, voice.do, "text-blue-300"],
          [t.dont, voice.dont, "text-yellow"],
        ].map(([label, items, cls]) =>
          (items as string[] | undefined)?.length ? (
            <div key={label as string}>
              <p className={cn("text-xs font-semibold", cls as string)}>{label as string}</p>
              <ul className="mt-1 list-disc space-y-1 ps-4 text-ink-muted">
                {(items as string[]).map((d) => <li key={d}>{d}</li>)}
              </ul>
            </div>
          ) : null,
        )}
      </div>
    </div>
  );
}
