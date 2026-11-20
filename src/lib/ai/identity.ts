import "server-only";
import { z } from "zod";
import { enumLabel, outputDialect } from "./polish";
import { refinedLogo } from "./logo-craft";

/**
 * Brand identity output: parsing, validation and SVG sanitising.
 * Logo SVGs are additionally only ever rendered via <img src="data:…">,
 * where scripts and external resources never execute or load.
 */

const HEX = /^#[0-9a-f]{6}$/i;
const str = (max: number) => z.string().trim().min(1).max(max);
/** String list: drops non-strings/empties, trims overlong items, keeps at most `max`. */
const strList = (min: number, max: number, len: number) =>
  z
    .array(z.unknown())
    .transform((a) => a.filter((x): x is string => typeof x === "string" && !!x.trim()).map((x) => x.trim().slice(0, len)).slice(0, max))
    .refine((a) => a.length >= min, `at least ${min} items`);
const swatch = z.object({
  name: str(40),
  hex: z.string().trim().regex(HEX),
  role: z.string().trim().max(30).optional().default(""),
  usage: z.string().trim().max(200).optional().default(""),
});
const font = z.object({ family: str(60), why: z.string().trim().max(300).optional().default("") });

const identitySchema = z.object({
  brand_name: str(120),
  tagline: str(200),
  positioning: str(1200),
  personality: strList(2, 6, 60),
  // Drop malformed colors instead of rejecting the whole identity.
  palette: z
    .array(z.unknown())
    .transform((items) =>
      items
        .map((c) => swatch.safeParse(c))
        .filter((r) => r.success)
        .map((r) => r.data!)
        .slice(0, 6),
    )
    .refine((a) => a.length >= 3, "at least 3 valid colors"),
  typography: z.object({ heading: font, body: font, arabic: font.optional() }),
  voice: z.object({ do: strList(2, 5, 200), dont: strList(2, 5, 200), sample_lines: strList(1, 3, 240).optional() }),
  concepts: z
    .array(z.object({ name: str(80), idea: str(600), logo_prompt: z.string().trim().max(1200).optional().default(""), svg: z.string().max(30000).optional().default("") }))
    .min(1)
    .transform((a) => a.slice(0, 3)),
});

export type BrandIdentity = Omit<z.infer<typeof identitySchema>, "concepts"> & {
  concepts: { name: string; idea: string; logo_prompt: string; svg: string | null }[];
};

/** Elements a logo mark may contain; anything else rejects the SVG. */
const ALLOWED = new Set([
  "svg", "g", "path", "circle", "rect", "ellipse", "line", "polyline", "polygon", "text", "tspan",
  "defs", "lineargradient", "radialgradient", "stop", "clippath", "mask", "title", "desc",
  // Soft shadows / highlights only (no feImage, no external inputs).
  "filter", "fedropshadow", "fegaussianblur", "feoffset", "femerge", "femergenode", "feflood", "fecomposite", "fecolormatrix", "feblend",
]);
/** Removed together with everything inside them. */
const DROP_WITH_CONTENT = "script|style|foreignObject|iframe|object|embed|audio|video|canvas|noscript";
/** Removed as elements (usually void): external refs and animation. */
const DROP_ELEMENT = "image|use|set|animate\\w*|link|meta|feImage|handler|listener";
/** Wrappers removed but their children kept. */
const UNWRAP = "a|switch";

/** Every tag must be allowed and properly nested. */
function wellFormed(svg: string) {
  const stack: string[] = [];
  for (const m of svg.matchAll(/<(\/?)([a-zA-Z][\w:.-]*)\b[^>]*?(\/?)>/g)) {
    const [, closing, rawName, selfClosing] = m;
    const name = rawName.toLowerCase();
    if (!ALLOWED.has(name)) return false;
    if (closing) {
      if (stack.pop() !== name) return false;
    } else if (!selfClosing) stack.push(name);
  }
  return stack.length === 0;
}

/**
 * Root <svg>: scale by viewBox only (drop fixed width/height; derive a
 * viewBox from them when missing) so marks fill their preview cleanly.
 */
function normalizeRoot(svg: string) {
  const end = svg.indexOf(">");
  let root = svg.slice(0, end);
  const num = (attr: string) => {
    const m = new RegExp(`\\s${attr}\\s*=\\s*["']\\s*([\\d.]+)(?:px)?\\s*["']`, "i").exec(root);
    return m ? Number(m[1]) : null;
  };
  if (!/\sviewBox\s*=/i.test(root)) {
    const w = num("width") ?? 240;
    const h = num("height") ?? 240;
    root += ` viewBox="0 0 ${w} ${h}"`;
  }
  root = root.replace(/\s(width|height)\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi, "");
  if (!/\spreserveAspectRatio=/i.test(root)) root += ' preserveAspectRatio="xMidYMid meet"';
  return root + svg.slice(end);
}

export { isCrudeLogo } from "./logo-craft";

/** Allow-list sanitiser; returns null if the result isn't a clean, usable SVG. */
export function sanitizeSvg(raw: string | undefined | null): string | null {
  if (!raw) return null;
  let s = raw.trim().replace(/^```(?:svg|xml)?\s*|```$/g, "").trim();
  const start = s.search(/<svg[\s>]/i);
  const end = s.toLowerCase().lastIndexOf("</svg>");
  if (start === -1 || end === -1) return null;
  s = s.slice(start, end + 6);

  s = s.replace(/<!--[\s\S]*?-->|<!DOCTYPE[\s\S]*?>|<!ENTITY[\s\S]*?>|<!\[CDATA\[[\s\S]*?\]\]>|<\?[\s\S]*?\?>/gi, "");
  for (let i = 0; i < 3; i++) {
    s = s
      .replace(new RegExp(`<(${DROP_WITH_CONTENT})\\b[^>]*\\/>`, "gi"), "")
      .replace(new RegExp(`<(${DROP_WITH_CONTENT})\\b[^>]*>[\\s\\S]*?<\\/\\1\\s*>`, "gi"), "");
  }
  s = s
    .replace(new RegExp(`<\\/?(${DROP_ELEMENT})\\b[^>]*>`, "gi"), "")
    .replace(new RegExp(`<\\/?(${UNWRAP})\\b[^>]*>`, "gi"), "")
    .replace(/\s(on[\w-]+|xlink:href|href|style|xml:base)\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi, "")
    .replace(/url\(\s*(?!#)[^)]*\)/gi, "none")
    .replace(/javascript:|data:/gi, "")
    // Only XML's built-in / numeric entities are valid without a DOCTYPE.
    .replace(/&(?!(amp|lt|gt|quot|apos|#\d+|#x[0-9a-f]+);)/gi, "&amp;");
  if (!/\sxmlns=/.test(s.slice(0, s.indexOf(">")))) s = s.replace(/<svg/i, '<svg xmlns="http://www.w3.org/2000/svg"');
  s = normalizeRoot(s);

  if (s.length > 24000 || !wellFormed(s)) return null;
  if (!/<(path|circle|rect|ellipse|polygon|polyline|line|text)\b/i.test(s)) return null;
  return s;
}

/** Parse model output (tolerates code fences / leading text) into a validated identity. */
export function parseIdentity(text: string): BrandIdentity | null {
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start === -1 || end <= start) return null;
  let json: unknown;
  try {
    json = JSON.parse(text.slice(start, end + 1));
  } catch {
    return null;
  }
  const parsed = identitySchema.safeParse(json);
  if (!parsed.success) {
    console.error("[ai] identity schema mismatch", parsed.error.issues.slice(0, 3).map((i) => `${i.path.join(".")}: ${i.message}`).join("; "));
    return null;
  }
  return {
    ...parsed.data,
    // Names like "Concept 1 — Arch" would clash with the numbered cards.
    concepts: parsed.data.concepts.map((c, i) => ({
      ...c,
      name: c.name.replace(/^\s*(concept|direction|مفهوم|فكرة|اتجاه)?\s*#?\d+\s*[:.)—–-]?\s*/i, "").trim() || c.name,
      // Weak AI marks (single primitives, giant letters…) are replaced by a crafted multi-layer mark.
      svg: sanitizeSvg(refinedLogo(sanitizeSvg(c.svg), { brand: parsed.data.brand_name, palette: parsed.data.palette, index: i })),
    })),
  };
}

/** Readable Markdown version for the AI library (no SVG). */
export function identityToMarkdown(id: BrandIdentity, lang?: string | null) {
  const e = (v: string) => enumLabel(v, outputDialect(lang));
  const lines = [
    `# ${id.brand_name}`,
    `> ${id.tagline}`,
    "",
    "## Positioning",
    id.positioning,
    "",
    `**Personality:** ${id.personality.join(" · ")}`,
    "",
    "## Palette",
    "| Name | Hex | Role | Usage |",
    "|---|---|---|---|",
    ...id.palette.map((c) => `| ${c.name} | \`${c.hex}\` | ${e(c.role)} | ${c.usage} |`),
    "",
    "## Typography",
    `- **Headings:** ${id.typography.heading.family} — ${id.typography.heading.why}`,
    `- **Body:** ${id.typography.body.family} — ${id.typography.body.why}`,
    ...(id.typography.arabic ? [`- **Arabic:** ${id.typography.arabic.family} — ${id.typography.arabic.why}`] : []),
    "",
    "## Voice",
    ...id.voice.do.map((d) => `- ✅ ${d}`),
    ...id.voice.dont.map((d) => `- ⛔ ${d}`),
    ...(id.voice.sample_lines?.length ? ["", ...id.voice.sample_lines.map((l) => `> ${l}`)] : []),
    "",
    "## Logo concepts",
    ...id.concepts.flatMap((c, i) => [`### ${i + 1}. ${c.name}`, c.idea, ...(c.logo_prompt ? ["", `*Prompt:* ${c.logo_prompt}`] : []), ""]),
  ];
  return lines.join("\n");
}
