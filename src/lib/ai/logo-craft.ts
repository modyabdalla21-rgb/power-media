/**
 * Vector logo craft (pure, client + server).
 *
 * - `isCrudeLogo` spots weak AI-drawn SVGs: one or two primitives, a single
 *   stroke, very little path detail, no layering, or one giant typed letter.
 * - `craftedLogo` draws a refined, multi-layered fallback mark from the brand
 *   palette and initials, in three directions matching the identity concepts:
 *   0 architectural emblem · 1 editorial rosette symbol · 2 monogram badge.
 */

const HEX = /^#[0-9a-f]{6}$/i;

const SHAPES = /<(path|circle|rect|ellipse|polygon|polyline|line)\b/gi;

export function isCrudeLogo(svg: string | null | undefined): boolean {
  if (!svg) return true;
  const shapes = svg.match(SHAPES)?.length ?? 0;
  const paths = [...svg.matchAll(/<path\b[^>]*\sd\s*=\s*["']([^"']+)["']/gi)].map((m) => m[1]);
  const pathData = paths.join(" ");
  const curves = pathData.match(/[CcSsQqTtAa]/g)?.length ?? 0;
  const gradient = /<(linearGradient|radialGradient)\b/i.test(svg);
  const bigText = [...svg.matchAll(/<text\b[^>]*font-size\s*=\s*["']?([\d.]+)/gi)].some((m) => Number(m[1]) >= 72);
  return (
    bigText ||
    shapes < 3 || // a ring + dot, a single polygon, a single stroke
    paths.length === 0 ||
    curves < 4 ||
    pathData.length < 260 || // very little drawing detail
    (!gradient && shapes < 5) // flat and sparse
  );
}

// ── Color helpers ────────────────────────────────────────────────────────
const toRgb = (hex: string) => {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
};
const toHex = (rgb: number[]) => `#${rgb.map((v) => Math.round(Math.min(255, Math.max(0, v))).toString(16).padStart(2, "0")).join("")}`.toUpperCase();
const mix = (a: string, b: string, t: number) => {
  const x = toRgb(a);
  const y = toRgb(b);
  return toHex(x.map((v, i) => v + (y[i] - v) * t));
};
const lum = (hex: string) => {
  const [r, g, b] = toRgb(hex);
  return (0.299 * r + 0.587 * g + 0.114 * b) / 255;
};
const sat = (hex: string) => {
  const [r, g, b] = toRgb(hex);
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  return max === 0 ? 0 : (max - min) / max;
};

/** Dark base, a vivid accent and a light tone from the palette (with refined defaults). */
function tones(palette: { hex: string }[]) {
  const colors = [...new Set(palette.map((p) => p.hex).filter((h) => HEX.test(h)).map((h) => h.toUpperCase()))];
  const byLum = [...colors].sort((a, b) => lum(a) - lum(b));
  let dark = byLum[0] ?? "#0F2A3D";
  if (lum(dark) > 0.45) dark = mix(dark, "#0B0F14", 0.7);
  const accentPool = colors.filter((c) => c !== dark && Math.abs(lum(c) - lum(dark)) > 0.2);
  let accent = [...accentPool].sort((a, b) => sat(b) - sat(a))[0] ?? "#C9A45C";
  if (Math.abs(lum(accent) - lum(dark)) < 0.25) accent = mix(accent, "#FFFFFF", 0.45);
  const light = byLum.length > 1 && lum(byLum[byLum.length - 1]) > 0.8 ? byLum[byLum.length - 1] : "#F8F6F1";
  return { dark, darkHi: mix(dark, "#FFFFFF", 0.22), darkLo: mix(dark, "#000000", 0.25), accent, accentHi: mix(accent, "#FFFFFF", 0.35), accentLo: mix(accent, "#000000", 0.2), light };
}

const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&apos;" })[c]!);

export const brandInitials = (name: string) => {
  const words = name.replace(/[^\p{L}\p{N}\s]/gu, " ").split(/\s+/).filter(Boolean);
  return (words.length > 1 ? words.slice(0, 2).map((w) => [...w][0]) : [...(words[0] ?? "B")].slice(0, 1)).join("").toUpperCase();
};

/** 0 · Architectural emblem: nested arches, keystone, rising central form, base plinth, sheen. */
function archEmblem(t: ReturnType<typeof tones>, id: string) {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 240 240">
<defs>
<linearGradient id="${id}a" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${t.darkHi}"/><stop offset="1" stop-color="${t.darkLo}"/></linearGradient>
<linearGradient id="${id}b" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${t.accentHi}"/><stop offset="0.55" stop-color="${t.accent}"/><stop offset="1" stop-color="${t.accentLo}"/></linearGradient>
<linearGradient id="${id}c" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#FFFFFF" stop-opacity="0.32"/><stop offset="1" stop-color="#FFFFFF" stop-opacity="0"/></linearGradient>
</defs>
<path fill="url(#${id}a)" d="M120 26C170.8 26 202 63.5 202 110.5V198H38V110.5C38 63.5 69.2 26 120 26Z"/>
<path fill="url(#${id}c)" d="M120 26C170.8 26 202 63.5 202 110.5V122C168 98 72 98 38 122V110.5C38 63.5 69.2 26 120 26Z"/>
<path fill="${t.light}" d="M120 52C154.2 52 174 77.6 174 110.8V184H66V110.8C66 77.6 85.8 52 120 52Z"/>
<path fill="none" stroke="url(#${id}b)" stroke-width="4" stroke-linecap="round" d="M84 184V113C84 89.4 98.6 70 120 70C141.4 70 156 89.4 156 113V184"/>
<path fill="url(#${id}a)" d="M120 90C137.6 108.4 146 128.6 146 148.4C146 166.8 135.4 179.6 120 184C104.6 179.6 94 166.8 94 148.4C94 128.6 102.4 108.4 120 90Z"/>
<path fill="url(#${id}b)" d="M120 104C130.4 117.2 135 131.4 135 145.6C135 159.2 128.8 169.4 120 173.4C111.2 169.4 105 159.2 105 145.6C105 131.4 109.6 117.2 120 104Z"/>
<path fill="#FFFFFF" fill-opacity="0.35" d="M120 112C125.2 121.8 127.4 132.4 127 143C126.6 153 124 160.8 120 165.4C121.6 155.2 122.2 145 121.8 134.6C121.5 126.6 120.9 119 120 112Z"/>
<path fill="url(#${id}b)" d="M110.5 18H129.5L125.6 36.5H114.4Z"/>
<path fill="url(#${id}b)" d="M30 198H210C212.2 198 214 199.8 214 202V208C214 210.2 212.2 212 210 212H30C27.8 212 26 210.2 26 208V202C26 199.8 27.8 198 30 198Z"/>
<path fill="none" stroke="${t.accentHi}" stroke-opacity="0.55" stroke-width="1.6" d="M46 190V112C46 70.6 75.4 34 120 34C164.6 34 194 70.6 194 112V190"/>
</svg>`;
}

/** 1 · Editorial rosette: 8-point star from two rounded squares, inner disc, four vesica petals, ring. */
function rosetteSymbol(t: ReturnType<typeof tones>, id: string) {
  const petal = "M0 -44C15.6 -28.2 16.4 -10.8 0 0C-16.4 -10.8 -15.6 -28.2 0 -44Z";
  const petals = [0, 90, 180, 270].map((r) => `<path transform="rotate(${r})" fill="url(#${id}b)" d="${petal}"/>`).join("");
  const sheen = [45, 135, 225, 315].map((r) => `<path transform="rotate(${r})" fill="${t.dark}" fill-opacity="0.18" d="M0 -40C9 -28 9.6 -14 0 -6C-9.6 -14 -9 -28 0 -40Z"/>`).join("");
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 240 240">
<defs>
<linearGradient id="${id}a" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${t.darkHi}"/><stop offset="1" stop-color="${t.darkLo}"/></linearGradient>
<linearGradient id="${id}b" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${t.accentHi}"/><stop offset="0.5" stop-color="${t.accent}"/><stop offset="1" stop-color="${t.accentLo}"/></linearGradient>
<radialGradient id="${id}c" cx="0.35" cy="0.25" r="0.8"><stop offset="0" stop-color="#FFFFFF" stop-opacity="0.3"/><stop offset="1" stop-color="#FFFFFF" stop-opacity="0"/></radialGradient>
</defs>
<g transform="translate(120 120)">
<circle r="100" fill="none" stroke="url(#${id}b)" stroke-width="2.4"/>
<circle r="93" fill="none" stroke="${t.accent}" stroke-opacity="0.35" stroke-width="1.2"/>
<rect x="-62" y="-62" width="124" height="124" rx="16" fill="url(#${id}a)"/>
<rect x="-62" y="-62" width="124" height="124" rx="16" transform="rotate(45)" fill="url(#${id}a)"/>
<path fill="url(#${id}c)" d="M-62 -46C-62 -54.8 -54.8 -62 -46 -62H46C54.8 -62 62 -54.8 62 -46V-6C26 -26 -26 -26 -62 -6Z"/>
<circle r="52" fill="${t.light}"/>
<circle r="52" fill="none" stroke="url(#${id}b)" stroke-width="3"/>
${petals}
${sheen}
<circle r="9" fill="url(#${id}a)"/>
<circle r="3.4" fill="${t.accentHi}"/>
</g>
</svg>`;
}

/** 2 · Monogram badge: rounded crest, inner hairline frame, serif initials in metallic gradient, ornaments. */
function monogramBadge(t: ReturnType<typeof tones>, id: string, letters: string) {
  const size = letters.length > 1 ? 58 : 70;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 240 240">
<defs>
<linearGradient id="${id}a" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${t.darkHi}"/><stop offset="1" stop-color="${t.darkLo}"/></linearGradient>
<linearGradient id="${id}b" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${t.accentHi}"/><stop offset="0.5" stop-color="${t.accent}"/><stop offset="1" stop-color="${t.accentLo}"/></linearGradient>
<linearGradient id="${id}c" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#FFFFFF" stop-opacity="0.28"/><stop offset="1" stop-color="#FFFFFF" stop-opacity="0"/></linearGradient>
</defs>
<path fill="url(#${id}a)" d="M120 22C150 22 176 27.6 196 36C202.4 38.7 206 44.4 206 51.4V128C206 172.6 170.8 202.6 124.6 217.6C121.6 218.6 118.4 218.6 115.4 217.6C69.2 202.6 34 172.6 34 128V51.4C34 44.4 37.6 38.7 44 36C64 27.6 90 22 120 22Z"/>
<path fill="url(#${id}c)" d="M120 22C150 22 176 27.6 196 36C202.4 38.7 206 44.4 206 51.4V92C166 72 74 72 34 98V51.4C34 44.4 37.6 38.7 44 36C64 27.6 90 22 120 22Z"/>
<path fill="none" stroke="url(#${id}b)" stroke-width="2.4" d="M120 36C147 36 170 40.8 188 48C190.6 49 192 51.4 192 54.2V128C192 164.4 163.6 190 120 204C76.4 190 48 164.4 48 128V54.2C48 51.4 49.4 49 52 48C70 40.8 93 36 120 36Z"/>
<text x="120" y="122" text-anchor="middle" dominant-baseline="middle" font-family="Georgia, 'Times New Roman', 'Noto Naskh Arabic', serif" font-size="${size}" font-weight="600" letter-spacing="${letters.length > 1 ? 3 : 0}" fill="url(#${id}b)">${esc(letters)}</text>
<path fill="url(#${id}b)" d="M120 58L126 64L120 70L114 64Z"/>
<path fill="none" stroke="url(#${id}b)" stroke-width="2" stroke-linecap="round" d="M86 164H110M130 164H154"/>
<path fill="url(#${id}b)" d="M120 158L126 164L120 170L114 164Z"/>
<path fill="${t.accentHi}" fill-opacity="0.6" d="M120 178C124.4 182 128.8 184 133.6 184.6C128.8 185.6 124.4 188 120 192C115.6 188 111.2 185.6 106.4 184.6C111.2 184 115.6 182 120 178Z"/>
</svg>`;
}

/** A refined fallback mark for concept `index` (0 emblem · 1 symbol · 2 monogram). */
export function craftedLogo(opts: { brand: string; palette: { hex: string }[]; index: number }) {
  const t = tones(opts.palette);
  const id = `pm${opts.index}${Math.abs([...opts.brand].reduce((h, c) => (h * 31 + c.charCodeAt(0)) | 0, 7)).toString(36).slice(0, 4)}`;
  const i = ((opts.index % 3) + 3) % 3;
  return (i === 0 ? archEmblem(t, id) : i === 1 ? rosetteSymbol(t, id) : monogramBadge(t, id, brandInitials(opts.brand))).replace(/\n/g, "");
}

/** The AI mark when it's well crafted, otherwise the crafted fallback for that concept. */
export function refinedLogo(svg: string | null | undefined, opts: { brand: string; palette: { hex: string }[]; index: number }) {
  return svg && !isCrudeLogo(svg) ? svg : craftedLogo(opts);
}
