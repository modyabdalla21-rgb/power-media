import { z } from "zod";

/** Static Post Studio: structured AI output (3 post designs) + the brand look used to render them. */

export const POST_LAYOUTS = ["spotlight", "split", "bold"] as const;
export const POST_THEMES = ["brand", "dark", "light"] as const;
export const POST_FORMATS = ["square", "portrait", "story"] as const;
export type PostLayout = (typeof POST_LAYOUTS)[number];
export type PostTheme = (typeof POST_THEMES)[number];
export type PostFormat = (typeof POST_FORMATS)[number];

const str = (max: number) => z.unknown().optional().transform((v) => (typeof v === "string" ? v.trim().slice(0, max) : ""));
const oneOf = <T extends readonly string[]>(list: T, fallback: T[number]) =>
  z.unknown().optional().transform((v) => (typeof v === "string" && (list as readonly string[]).includes(v) ? (v as T[number]) : fallback));

const postSchema = z.object({
  concept: str(200),
  headline: str(80),
  subheadline: str(160),
  badge: str(24),
  cta: str(40),
  layout: oneOf(POST_LAYOUTS, "spotlight"),
  theme: oneOf(POST_THEMES, "brand"),
  caption: str(2200),
  hashtags: z
    .unknown()
    .optional()
    .transform((v) => (Array.isArray(v) ? v.filter((h): h is string => typeof h === "string").map((h) => h.trim().replace(/^#*/, "#").replace(/\s+/g, "_")).filter((h) => h.length > 1).slice(0, 10) : [])),
});

export type PostDesign = z.output<typeof postSchema>;

export type StaticPostResult = {
  posts: PostDesign[];
  photo_tips: string[];
};

/** Everything the composer needs besides the AI copy. Stored with the generation. */
export type PostBrand = {
  name: string;
  colors: string[];
  format: PostFormat;
  imageId: string | null;
};

const resultSchema = z.object({
  posts: z.array(z.unknown()).min(1),
  photo_tips: z.unknown().optional(),
});

/** Lenient parse: invalid posts are dropped; at least one usable post with a headline is required. */
export function parseStaticPost(text: string): StaticPostResult | null {
  const raw = text.trim().replace(/^```(?:json)?\s*/i, "").replace(/```\s*$/, "");
  let json: unknown;
  try {
    json = JSON.parse(raw.slice(raw.indexOf("{"), raw.lastIndexOf("}") + 1));
  } catch {
    return null;
  }
  const r = resultSchema.safeParse(json);
  if (!r.success) return null;
  const posts = r.data.posts
    .map((p) => postSchema.safeParse(p))
    .flatMap((p) => (p.success && p.data.headline ? [p.data] : []))
    .slice(0, 3);
  if (!posts.length) return null;
  const tips = Array.isArray(r.data.photo_tips) ? r.data.photo_tips.filter((t): t is string => typeof t === "string" && !!t.trim()).map((t) => t.trim().slice(0, 300)).slice(0, 4) : [];
  return { posts, photo_tips: tips };
}

export function staticPostToMarkdown(r: StaticPostResult) {
  return [
    ...r.posts.flatMap((p, i) => [
      `### Design ${i + 1} — ${p.concept || p.headline}`,
      `- **Headline:** ${p.headline}`,
      ...(p.subheadline ? [`- **Supporting line:** ${p.subheadline}`] : []),
      ...(p.badge ? [`- **Sticker:** ${p.badge}`] : []),
      ...(p.cta ? [`- **CTA:** ${p.cta}`] : []),
      "",
      `**Caption:**`,
      "",
      p.caption,
      "",
      p.hashtags.join(" "),
      "",
    ]),
    ...(r.photo_tips.length ? ["## Photo tips", ...r.photo_tips.map((t) => `- ${t}`)] : []),
  ].join("\n");
}

const HEX = /^#[0-9a-f]{6}$/i;
/** Brand colors in kit order (primary first); POWER MEDIA defaults when the kit has none. */
export function kitColors(palette: { hex: string; role?: string }[] | null | undefined): string[] {
  const valid = (palette ?? []).filter((c) => HEX.test(c.hex));
  const order = ["primary", "secondary", "accent", "neutral", "background"];
  const sorted = [...valid].sort((a, b) => (order.indexOf(a.role ?? "") + 99) % 99 - (order.indexOf(b.role ?? "") + 99) % 99);
  const colors = sorted.map((c) => c.hex.toUpperCase());
  return colors.length ? colors : ["#001323", "#0789E8", "#FF7900", "#FFB800"];
}
