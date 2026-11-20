"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import { Check, Copy, Download, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/form";
import type { Dictionary } from "@/i18n/dictionaries/en";
import { POST_FORMATS, POST_LAYOUTS, POST_THEMES, type PostBrand, type PostDesign, type PostFormat, type PostLayout, type PostTheme, type StaticPostResult } from "@/lib/ai/post";
import { cn } from "@/lib/utils";

type T = Dictionary["dashboard"]["post"];
export type StaticPostData = StaticPostResult & { brand: PostBrand };
export type PostLogo = { svg: string | null; url: string | null } | null;

const SIZES: Record<PostFormat, { w: number; h: number; label: string }> = {
  square: { w: 1080, h: 1080, label: "1:1" },
  portrait: { w: 1080, h: 1350, label: "4:5" },
  story: { w: 1080, h: 1920, label: "9:16" },
};

// ── Color helpers ────────────────────────────────────────────────────────
const rgb = (hex: string) => {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255] as const;
};
const lum = (hex: string) => {
  const [r, g, b] = rgb(hex).map((v) => {
    const c = v / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};
const contrast = (a: string, b: string) => {
  const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p);
  return (x + 0.05) / (y + 0.05);
};
const textOn = (bg: string) => (contrast(bg, "#FFFFFF") >= contrast(bg, "#0B0F14") ? "#FFFFFF" : "#0B0F14");
const rgba = (hex: string, a: number) => `rgba(${rgb(hex).join(",")},${a})`;

function scheme(colors: string[], theme: PostTheme) {
  const [primary, ...rest] = colors;
  const bg = theme === "dark" ? "#0B0F14" : theme === "light" ? "#F6F4EF" : primary;
  const candidates = theme === "brand" ? [...rest, "#FFB800", "#FFFFFF"] : [primary, ...rest, "#FF7900"];
  // Accent = first brand color that stands out on the background.
  const accent = candidates.find((c) => contrast(c, bg) >= 2.2) ?? textOn(bg);
  const accent2 = candidates.find((c) => c !== accent && contrast(c, bg) >= 1.8) ?? accent;
  return { bg, fg: textOn(bg), accent, accentFg: textOn(accent), accent2, accent2Fg: textOn(accent2) };
}

// ── Canvas helpers ───────────────────────────────────────────────────────
const isArabic = (s: string) => /[؀-ۿ]/.test(s);
const fontFor = (weight: number, size: number, rtl: boolean) =>
  `${weight} ${size}px ${rtl ? '"IBM Plex Sans Arabic", "Plus Jakarta Sans Variable"' : '"Plus Jakarta Sans Variable", "IBM Plex Sans Arabic"'}, system-ui, sans-serif`;

function wrap(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string[] {
  const words = text.split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let line = "";
  for (const w of words) {
    const next = line ? `${line} ${w}` : w;
    if (ctx.measureText(next).width <= maxWidth || !line) line = next;
    else {
      lines.push(line);
      line = w;
    }
  }
  if (line) lines.push(line);
  return lines;
}

/** Largest font size (down to `min`) at which `text` fits in `maxLines` lines. */
function fit(ctx: CanvasRenderingContext2D, text: string, weight: number, start: number, min: number, maxWidth: number, maxLines: number, rtl: boolean) {
  let size = start;
  for (; size > min; size -= 4) {
    ctx.font = fontFor(weight, size, rtl);
    const lines = wrap(ctx, text, maxWidth);
    if (lines.length <= maxLines && lines.every((l) => ctx.measureText(l).width <= maxWidth)) return { size, lines };
  }
  ctx.font = fontFor(weight, min, rtl);
  return { size: min, lines: wrap(ctx, text, maxWidth).slice(0, maxLines) };
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, r);
}

/** Natural size; SVGs without width/height can report 0 — treat them as square. */
const dims = (img: HTMLImageElement) => (img.naturalWidth && img.naturalHeight ? [img.naturalWidth, img.naturalHeight] : [100, 100]);

/** Draw an image "contain"-fitted into a box, with an optional soft shadow. */
function drawContain(ctx: CanvasRenderingContext2D, img: HTMLImageElement, x: number, y: number, w: number, h: number, shadow = true) {
  const [nw, nh] = dims(img);
  const s = Math.min(w / nw, h / nh);
  const dw = nw * s;
  const dh = nh * s;
  ctx.save();
  if (shadow) {
    ctx.shadowColor = "rgba(0,0,0,0.28)";
    ctx.shadowBlur = 40;
    ctx.shadowOffsetY = 18;
  }
  ctx.drawImage(img, x + (w - dw) / 2, y + (h - dh) / 2, dw, dh);
  ctx.restore();
}

type Assets = { product: HTMLImageElement | null; logo: HTMLImageElement | null };

function draw(ctx: CanvasRenderingContext2D, W: number, H: number, post: PostDesign, layout: PostLayout, theme: PostTheme, colors: string[], brandName: string, assets: Assets) {
  const c = scheme(colors, theme);
  const rtl = isArabic(`${post.headline} ${post.subheadline}`);
  const pad = Math.round(W * 0.075);
  ctx.clearRect(0, 0, W, H);
  ctx.direction = rtl ? "rtl" : "ltr";
  ctx.textBaseline = "alphabetic";

  // Background with a subtle brand glow.
  ctx.fillStyle = c.bg;
  ctx.fillRect(0, 0, W, H);
  const glow = ctx.createRadialGradient(W * 0.82, H * 0.18, 0, W * 0.82, H * 0.18, W * 0.9);
  glow.addColorStop(0, rgba(c.accent, 0.28));
  glow.addColorStop(1, rgba(c.accent, 0));
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, W, H);

  // Header: logo (or brand name) at the start corner.
  const startX = rtl ? W - pad : pad;
  const headerY = pad;
  const logoH = Math.round(W * 0.085);
  if (assets.logo) {
    const [nw, nh] = dims(assets.logo);
    const lw = Math.min((nw * logoH) / nh, W * 0.32);
    const lh = (nh * lw) / nw;
    drawContain(ctx, assets.logo, rtl ? startX - lw : startX, headerY, lw, lh, false);
  } else if (brandName) {
    ctx.font = fontFor(700, Math.round(W * 0.034), isArabic(brandName));
    ctx.fillStyle = c.fg;
    ctx.textAlign = "start";
    ctx.fillText(brandName, startX, headerY + W * 0.04);
  }

  const contentTop = headerY + logoH + pad * 0.6;
  const ctaH = Math.round(W * 0.095);
  const bottom = H - pad;
  const maxText = W - pad * 2;

  const drawProductPlaceholder = (x: number, y: number, w: number, h: number) => {
    roundRect(ctx, x, y, w, h, W * 0.05);
    ctx.fillStyle = rgba(c.fg, 0.07);
    ctx.fill();
    ctx.setLineDash([18, 14]);
    ctx.lineWidth = 4;
    ctx.strokeStyle = rgba(c.fg, 0.25);
    ctx.stroke();
    ctx.setLineDash([]);
  };
  const drawProduct = (x: number, y: number, w: number, h: number) => {
    if (assets.product) drawContain(ctx, assets.product, x, y, w, h);
    else drawProductPlaceholder(x, y, w, h);
  };

  const drawCta = (cx: number, y: number, align: "center" | "start") => {
    if (!post.cta) return 0;
    const ctaRtl = isArabic(post.cta);
    ctx.font = fontFor(700, Math.round(W * 0.036), ctaRtl);
    const tw = ctx.measureText(post.cta).width;
    const w = Math.min(tw + W * 0.1, maxText);
    const x = align === "center" ? cx - w / 2 : rtl ? cx - w : cx;
    roundRect(ctx, x, y, w, ctaH, ctaH / 2);
    ctx.fillStyle = c.accent;
    ctx.fill();
    ctx.fillStyle = c.accentFg;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.direction = ctaRtl ? "rtl" : "ltr";
    ctx.fillText(post.cta, x + w / 2, y + ctaH / 2 + 2, w - W * 0.04);
    ctx.direction = rtl ? "rtl" : "ltr";
    ctx.textBaseline = "alphabetic";
    return ctaH;
  };

  const drawBadge = (cx: number, cy: number) => {
    if (!post.badge) return;
    const r = W * 0.105;
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(rtl ? 0.14 : -0.14);
    ctx.beginPath();
    ctx.arc(0, 0, r, 0, Math.PI * 2);
    ctx.fillStyle = c.accent2;
    ctx.shadowColor = "rgba(0,0,0,0.25)";
    ctx.shadowBlur = 24;
    ctx.fill();
    ctx.shadowColor = "transparent";
    const badgeRtl = isArabic(post.badge);
    ctx.direction = badgeRtl ? "rtl" : "ltr";
    const b = fit(ctx, post.badge, 800, Math.round(r * 0.62), Math.round(r * 0.26), r * 1.6, 2, badgeRtl);
    ctx.fillStyle = c.accent2Fg;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    const lh = b.size * 1.05;
    b.lines.forEach((l, i) => ctx.fillText(l, 0, (i - (b.lines.length - 1) / 2) * lh));
    ctx.restore();
    ctx.textBaseline = "alphabetic";
    ctx.direction = rtl ? "rtl" : "ltr";
  };

  /** Headline + subheadline block. Returns the bottom y. */
  const drawText = (x: number, y: number, width: number, align: CanvasTextAlign, headStart: number, headLines: number) => {
    const h = fit(ctx, post.headline, 800, headStart, Math.round(W * 0.045), width, headLines, rtl);
    ctx.fillStyle = c.fg;
    ctx.textAlign = align;
    let cy = y;
    for (const l of h.lines) {
      cy += h.size * 1.08;
      ctx.fillText(l, x, cy);
    }
    if (post.subheadline) {
      const s = fit(ctx, post.subheadline, 500, Math.round(W * 0.038), Math.round(W * 0.026), width, 3, rtl);
      ctx.fillStyle = rgba(c.fg, 0.82);
      cy += s.size * 0.6;
      for (const l of s.lines) {
        cy += s.size * 1.32;
        ctx.fillText(l, x, cy);
      }
    }
    return cy;
  };

  if (layout === "spotlight") {
    const textEnd = drawText(W / 2, contentTop, maxText, "center", Math.round(W * 0.085), 2);
    const ctaY = bottom - ctaH;
    const imgTop = textEnd + pad * 0.5;
    const imgH = Math.max(ctaY - pad * 0.5 - imgTop, H * 0.2);
    // Soft disc behind the product.
    ctx.beginPath();
    ctx.ellipse(W / 2, imgTop + imgH * 0.55, Math.min(W * 0.36, imgH * 0.55), Math.min(W * 0.36, imgH * 0.5), 0, 0, Math.PI * 2);
    ctx.fillStyle = rgba(c.fg, 0.08);
    ctx.fill();
    drawProduct(pad * 1.5, imgTop, W - pad * 3, imgH);
    drawCta(W / 2, ctaY, "center");
    drawBadge(rtl ? pad + W * 0.11 : W - pad - W * 0.11, imgTop + W * 0.11);
  } else if (layout === "split") {
    const portraitish = H / W > 1.4;
    if (portraitish) {
      // Story: product top half, text panel bottom.
      const panelTop = H * 0.56;
      drawProduct(pad, contentTop, W - pad * 2, panelTop - contentTop - pad * 0.4);
      roundRect(ctx, pad * 0.6, panelTop, W - pad * 1.2, bottom - panelTop + pad * 0.4, W * 0.05);
      ctx.fillStyle = rgba(c.fg, 0.08);
      ctx.fill();
      drawText(startX + (rtl ? -pad * 0.6 : pad * 0.6), panelTop + pad * 0.3, maxText - pad * 1.2, "start", Math.round(W * 0.09), 3);
      drawCta(startX + (rtl ? -pad * 0.6 : pad * 0.6), bottom - ctaH - pad * 0.2, "start");
      drawBadge(rtl ? pad + W * 0.12 : W - pad - W * 0.12, contentTop + W * 0.1);
    } else {
      const colW = (W - pad * 2) * 0.52;
      const textX = startX;
      const imgX = rtl ? pad : W - pad - (W - pad * 2) * 0.46;
      // Accent panel behind the product.
      roundRect(ctx, imgX - pad * 0.3, contentTop - pad * 0.2, (W - pad * 2) * 0.46 + pad * 0.6, bottom - contentTop + pad * 0.2, W * 0.05);
      ctx.fillStyle = rgba(c.accent, 0.16);
      ctx.fill();
      drawProduct(imgX, contentTop + pad * 0.2, (W - pad * 2) * 0.46, bottom - contentTop - pad * 0.6);
      const midTop = contentTop + (bottom - contentTop) * 0.12;
      const end = drawText(textX, midTop, colW, "start", Math.round(W * 0.075), 4);
      drawCta(textX, Math.min(end + pad * 0.7, bottom - ctaH), "start");
      drawBadge(rtl ? imgX + W * 0.1 : imgX + (W - pad * 2) * 0.46 - W * 0.06, contentTop + W * 0.08);
    }
  } else {
    // bold: giant headline, product smaller at the bottom.
    const end = drawText(startX, contentTop + pad * 0.2, maxText, "start", Math.round(W * 0.12), 3);
    ctx.fillStyle = c.accent;
    ctx.fillRect(rtl ? startX - W * 0.16 : startX, end + pad * 0.45, W * 0.16, Math.round(W * 0.012));
    const ctaY = bottom - ctaH;
    const imgTop = end + pad * 0.9;
    const imgW = W * 0.5;
    drawProduct(rtl ? pad : W - pad - imgW, imgTop, imgW, Math.max(ctaY - imgTop + ctaH, H * 0.2));
    drawCta(startX, ctaY, "start");
    drawBadge(rtl ? W - pad - W * 0.12 : pad + W * 0.12, ctaY - W * 0.18);
  }
}

function loadImage(src: string | null): Promise<HTMLImageElement | null> {
  if (!src) return Promise.resolve(null);
  return new Promise((resolve) => {
    const img = new Image();
    // Signed storage URLs allow CORS, which keeps the canvas exportable.
    if (!src.startsWith("blob:") && !src.startsWith("data:")) img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = src;
  });
}

const svgDataUrl = (svg: string) => `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;

/**
 * Static post designer: renders the AI copy + brand colors + logo + product
 * photo on a canvas (same pixels for preview and PNG export).
 */
export function StaticPostStudio({ data, imageUrl, logo, t, dir }: { data: StaticPostData; imageUrl: string | null; logo: PostLogo; t: T; dir?: "ltr" | "rtl" }) {
  const [active, setActive] = useState(0);
  const [format, setFormat] = useState<PostFormat>(data.brand.format);
  const [edits, setEdits] = useState<PostDesign[]>(data.posts);
  const [layouts, setLayouts] = useState<PostLayout[]>(data.posts.map((p) => p.layout));
  const [themes, setThemes] = useState<PostTheme[]>(data.posts.map((p) => p.theme));
  const [assets, setAssets] = useState<Assets>({ product: null, logo: null });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(false);
  const [copied, setCopied] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const post = edits[active] ?? edits[0];
  const size = SIZES[format];
  const logoSrc = logo?.url ?? (logo?.svg ? svgDataUrl(logo.svg) : null);

  useEffect(() => {
    let alive = true;
    Promise.all([loadImage(imageUrl), loadImage(logoSrc)]).then(([product, l]) => alive && setAssets({ product, logo: l }));
    return () => {
      alive = false;
    };
  }, [imageUrl, logoSrc]);

  const sample = useMemo(() => edits.map((p) => `${p.headline} ${p.subheadline} ${p.cta} ${p.badge}`).join(" "), [edits]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx || !post) return;
    const render = () => draw(ctx, size.w, size.h, post, layouts[active], themes[active], data.brand.colors, data.brand.name, assets);
    render();
    // Re-draw once the web fonts used on the canvas are ready.
    let alive = true;
    const rtl = isArabic(sample);
    Promise.all([400, 500, 700, 800].map((w) => document.fonts.load(fontFor(w, 40, rtl), sample).catch(() => [])))
      .then(() => alive && render());
    return () => {
      alive = false;
    };
  }, [post, active, layouts, themes, size, data.brand, assets, sample]);

  function update(field: "headline" | "subheadline" | "badge" | "cta", value: string) {
    setEdits((all) => all.map((p, i) => (i === active ? { ...p, [field]: value } : p)));
  }

  async function download() {
    const canvas = canvasRef.current;
    if (!canvas) return;
    setBusy(true);
    setError(false);
    try {
      const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/png"));
      if (!blob) throw new Error("empty");
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = `${(data.brand.name || "post").replace(/[^\p{L}\p{N}]+/gu, "-").slice(0, 40) || "post"}-${active + 1}-${size.label.replace(":", "x")}.png`;
      a.click();
      setTimeout(() => URL.revokeObjectURL(a.href), 2000);
    } catch {
      setError(true);
    } finally {
      setBusy(false);
    }
  }

  async function copyCaption() {
    try {
      await navigator.clipboard.writeText(`${post.caption}\n\n${post.hashtags.join(" ")}`.trim());
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch {
      /* clipboard blocked */
    }
  }

  const seg = (on: boolean) =>
    cn("inline-flex h-9 items-center rounded-lg px-3 text-xs font-semibold transition-colors", on ? "bg-blue text-white" : "text-ink-muted hover:bg-white/5 hover:text-white");

  if (!post) return null;
  return (
    <div className="min-w-0 space-y-5" dir={dir}>
      {edits.length > 1 && (
        <div role="tablist" aria-label={t.previewTitle} className="flex flex-wrap gap-2">
          {edits.map((p, i) => (
            <button key={i} type="button" role="tab" aria-selected={i === active} onClick={() => setActive(i)}
              className={cn("min-h-10 max-w-full rounded-xl border px-3 py-1.5 text-start text-xs transition-colors", i === active ? "border-blue bg-blue/15 text-white" : "border-line text-ink-muted hover:border-blue/40")}>
              <span className="block font-semibold">{t.design.replace("{n}", String(i + 1))}</span>
              {p.concept && <span className="block max-w-56 break-words text-ink-subtle" dir="auto">{p.concept}</span>}
            </button>
          ))}
        </div>
      )}

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,16rem)]">
        <div className="min-w-0">
          <div className="mx-auto w-full" style={{ maxWidth: format === "story" ? 340 : 520 }}>
            <canvas ref={canvasRef} width={size.w} height={size.h} role="img" aria-label={`${post.headline} — ${post.subheadline}`}
              className="block h-auto w-full rounded-2xl border border-line shadow-(--shadow-card)" />
          </div>
        </div>

        <div className="min-w-0 space-y-4">
          <div>
            <p className="mb-1.5 text-xs font-semibold text-ink-subtle">{t.size}</p>
            <div className="flex flex-wrap gap-1 rounded-xl border border-line p-1" dir="ltr">
              {POST_FORMATS.map((f) => <button key={f} type="button" className={seg(format === f)} aria-pressed={format === f} onClick={() => setFormat(f)}>{SIZES[f].label}</button>)}
            </div>
          </div>
          <div>
            <p className="mb-1.5 text-xs font-semibold text-ink-subtle">{t.layout}</p>
            <div className="flex flex-wrap gap-1 rounded-xl border border-line p-1">
              {POST_LAYOUTS.map((l) => (
                <button key={l} type="button" className={seg(layouts[active] === l)} aria-pressed={layouts[active] === l} onClick={() => setLayouts((all) => all.map((x, i) => (i === active ? l : x)))}>{t.layouts[l]}</button>
              ))}
            </div>
          </div>
          <div>
            <p className="mb-1.5 text-xs font-semibold text-ink-subtle">{t.colors}</p>
            <div className="flex flex-wrap gap-1 rounded-xl border border-line p-1">
              {POST_THEMES.map((th) => (
                <button key={th} type="button" className={seg(themes[active] === th)} aria-pressed={themes[active] === th} onClick={() => setThemes((all) => all.map((x, i) => (i === active ? th : x)))}>{t.themes[th]}</button>
              ))}
            </div>
            <div className="mt-2 flex flex-wrap gap-1.5" aria-hidden>
              {data.brand.colors.slice(0, 6).map((c) => <span key={c} className="size-5 rounded-full border border-white/20" style={{ backgroundColor: c }} />)}
            </div>
          </div>
          <Button type="button" variant="energy" className="w-full" onClick={download} disabled={busy}>
            {busy ? <Loader2 className="size-4 animate-spin" aria-hidden /> : <Download className="size-4" aria-hidden />}
            {busy ? t.preparing : t.download}
          </Button>
          {error && <p role="alert" className="text-xs text-yellow">{t.exportFailed}</p>}
          <details className="rounded-xl border border-line p-3">
            <summary className="cursor-pointer text-sm font-semibold">{t.editText}</summary>
            <div className="mt-3 space-y-3">
              {(["headline", "subheadline", "badge", "cta"] as const).map((f) => (
                <div key={f}>
                  <Label htmlFor={`post-${f}`}>{t[f]}</Label>
                  <Input id={`post-${f}`} value={post[f]} onChange={(e) => update(f, e.target.value)} maxLength={f === "subheadline" ? 160 : 80} dir="auto" />
                </div>
              ))}
            </div>
          </details>
        </div>
      </div>

      <section className="rounded-xl border border-line p-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 className="text-sm font-semibold">{t.caption}</h3>
          <Button type="button" variant="ghost" size="sm" onClick={copyCaption}>
            {copied ? <Check className="size-4" aria-hidden /> : <Copy className="size-4" aria-hidden />}
            {copied ? t.copied : t.copyCaption}
          </Button>
        </div>
        <p className="mt-2 whitespace-pre-wrap break-words text-sm leading-relaxed text-ink-muted" dir="auto">{post.caption}</p>
        {post.hashtags.length > 0 && <p className="mt-3 break-words text-sm text-blue-300" dir="auto">{post.hashtags.join(" ")}</p>}
      </section>

      {data.photo_tips.length > 0 && (
        <section className="rounded-xl border border-line p-4">
          <h3 className="text-sm font-semibold">{t.photoTips}</h3>
          <ul className="mt-2 list-disc space-y-1 ps-5 text-sm text-ink-muted">
            {data.photo_tips.map((tip, i) => <li key={i} className="break-words" dir="auto">{tip}</li>)}
          </ul>
        </section>
      )}
    </div>
  );
}
