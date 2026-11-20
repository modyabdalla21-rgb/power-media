"use client";
import { useCallback, useEffect, useState } from "react";
import { Download, Loader2, RotateCcw, Sparkles } from "lucide-react";
import { SvgLogo } from "@/components/brand/brand-visuals";
import type { Dictionary } from "@/i18n/dictionaries/en";
import { cn } from "@/lib/utils";

type T = Dictionary["dashboard"]["identity"];
export type LogoImage = { url: string; downloadUrl: string | null; fileName: string; stored?: boolean };
type Preview = { brand: string; name: string; idea: string; logoPrompt: string; colors: string[] };
type Result = { ok: true; image: LogoImage } | { ok: false; code: string };

/** One request per concept, shared across re-mounts (React strict mode, re-renders). */
const inflight = new Map<string, Promise<Result>>();

function requestImage(key: string, body: { generationId: string | null; concept: number; preview?: Preview }): Promise<Result> {
  const existing = inflight.get(key);
  if (existing) return existing;
  const p = fetch("/api/ai/identity-image", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) })
    .then(async (res) => {
      const data = await res.json().catch(() => ({}));
      if (res.ok && typeof data.url === "string") {
        return { ok: true as const, image: { url: data.url, downloadUrl: data.downloadUrl ?? data.url, fileName: data.fileName ?? "logo.png", stored: !!data.stored } };
      }
      return { ok: false as const, code: typeof data.code === "string" ? data.code : res.status === 504 ? "timeout" : "unknown" };
    })
    .catch(() => ({ ok: false as const, code: "network" }))
    .finally(() => setTimeout(() => inflight.delete(key), 1000));
  inflight.set(key, p);
  return p;
}

const svgHref = (svg: string) => `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;

/**
 * A concept's logo: the AI-rendered raster image when available (rendered
 * on demand, stored in the brand's private storage), else the vector draft.
 */
export function ConceptLogo({ generationId, concept, svg, initial, auto, preview, alt, t, fileBase }: {
  generationId: string | null;
  concept: number;
  svg: string | null;
  initial?: LogoImage | null;
  /** Start rendering on mount (fresh generations). */
  auto: boolean;
  /** Preview mode only (no database): the concept to render. */
  preview?: Preview;
  alt: string;
  t: T;
  fileBase: string;
}) {
  const [image, setImage] = useState<LogoImage | null>(initial ?? null);
  const [status, setStatus] = useState<"idle" | "loading" | "failed">(() => (initial ? "idle" : auto && (generationId || preview) ? "loading" : "idle"));
  const [code, setCode] = useState("");
  const canRender = !!(generationId || preview);

  const fetchImage = useCallback(
    () => requestImage(`${generationId ?? preview?.brand}-${concept}`, { generationId, concept, preview: generationId ? undefined : preview }),
    [generationId, concept, preview],
  );
  const apply = useCallback((res: Result) => {
    if (res.ok) {
      setImage(res.image);
      setStatus("idle");
    } else {
      setCode(res.code);
      setStatus("failed");
    }
  }, []);
  const render = useCallback(async () => {
    setStatus("loading");
    apply(await fetchImage());
  }, [apply, fetchImage]);

  useEffect(() => {
    if (!initial && auto && canRender) void fetchImage().then(apply);
    // Only on mount / when the generation changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [generationId, concept]);

  const quota = code === "quota" || code === "rateLimited" || code === "userLimit";

  return (
    <div className="space-y-2">
      <div className="relative">
        {status === "loading" ? (
          <div className="flex aspect-square w-full flex-col items-center justify-center gap-2 overflow-hidden rounded-xl border border-line bg-white/[0.03] p-4 text-center" role="status">
            <div className="relative flex size-14 items-center justify-center">
              <span className="absolute inset-0 animate-ping rounded-full bg-blue/20" aria-hidden />
              <Sparkles className="relative size-6 text-yellow" aria-hidden />
            </div>
            <p className="text-xs font-medium">{t.rendering}</p>
            <p className="text-[11px] leading-snug text-ink-subtle">{t.renderingHint}</p>
          </div>
        ) : image ? (
          <div className="aspect-square w-full overflow-hidden rounded-xl border border-line bg-[#FAFAF7]">
            {/* eslint-disable-next-line @next/next/no-img-element -- signed URL / data URI from our API */}
            <img src={image.url} alt={alt} className="size-full object-contain" referrerPolicy="no-referrer" decoding="async" />
          </div>
        ) : (
          <SvgLogo svg={svg} alt={alt} className="aspect-square w-full" />
        )}
        <span className={cn("absolute end-2 top-2 rounded-full px-2 py-0.5 text-[10px] font-semibold shadow", image ? "bg-blue text-white" : "bg-navy/80 text-white")}>
          {status === "loading" ? <Loader2 className="size-3 animate-spin" aria-hidden /> : image ? t.imageBadge : t.vectorBadge}
        </span>
      </div>

      {status === "failed" && (
        <p className="text-[11px] leading-snug text-yellow" role="alert">{quota ? t.quotaDraft : t.vectorDraft}</p>
      )}
      {image && image.stored === false && <p className="text-[11px] leading-snug text-ink-subtle">{t.notStored}</p>}

      <div className="flex flex-wrap gap-2">
        {image?.downloadUrl ? (
          <a href={image.downloadUrl} download={image.fileName} className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-line px-3 text-xs font-medium text-ink-muted hover:border-blue/40 hover:text-white">
            <Download className="size-3.5" aria-hidden />
            {t.download}
          </a>
        ) : (
          svg && status !== "loading" && (
            <a href={svgHref(svg)} download={`${fileBase}.svg`} className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-line px-3 text-xs font-medium text-ink-muted hover:border-blue/40 hover:text-white">
              <Download className="size-3.5" aria-hidden />
              {t.downloadSvg}
            </a>
          )
        )}
        {!image && canRender && status !== "loading" && (
          <button type="button" onClick={() => void render()} className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-line px-3 text-xs font-medium text-blue-300 hover:border-blue/40 hover:text-white">
            {status === "failed" ? <RotateCcw className="size-3.5" aria-hidden /> : <Sparkles className="size-3.5" aria-hidden />}
            {status === "failed" ? t.retryImage : t.renderImage}
          </button>
        )}
      </div>
    </div>
  );
}
