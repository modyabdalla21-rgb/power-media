"use client";
import { useCallback, useEffect, useLayoutEffect, useState } from "react";
import { Download, Loader2, RotateCcw, Sparkles } from "lucide-react";
import { SvgLogo } from "@/components/brand/brand-visuals";
import type { Dictionary } from "@/i18n/dictionaries/en";
import { cn } from "@/lib/utils";

type T = Dictionary["dashboard"]["identity"];
export type LogoImage = { url: string; downloadUrl: string | null; fileName: string; stored?: boolean };
type Preview = { brand: string; name: string; idea: string; logoPrompt: string; colors: string[] };
type Attempt = { model: string; status: number | null; reason: string; message?: string };
type Failure = { reason: string; retryAfter?: number; attempts?: Attempt[] };
type Result = { ok: true; image: LogoImage } | { ok: false; failure: Failure };

/** Event that asks every failed concept on the page to retry its image. */
export const RETRY_ALL_EVENT = "pm:retry-logo-images";

/** One request per concept at a time, shared across re-mounts (strict mode, re-renders). */
const inflight = new Map<string, Promise<Result>>();

function requestImage(key: string, body: { generationId: string | null; concept: number; preview?: Preview }): Promise<Result> {
  const existing = inflight.get(key);
  if (existing) return existing;
  const p = fetch("/api/ai/identity-image", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) })
    .then(async (res): Promise<Result> => {
      const data = await res.json().catch(() => ({}));
      if (res.ok && typeof data.url === "string") {
        return { ok: true, image: { url: data.url, downloadUrl: data.downloadUrl ?? data.url, fileName: data.fileName ?? "logo.png", stored: !!data.stored } };
      }
      const reason = typeof data.reason === "string" ? data.reason : res.status === 504 ? "timeout" : "unavailable";
      return { ok: false, failure: { reason, retryAfter: typeof data.retryAfter === "number" ? data.retryAfter : undefined, attempts: Array.isArray(data.attempts) ? data.attempts : undefined } };
    })
    .catch((): Result => ({ ok: false, failure: { reason: "unavailable" } }))
    // Only de-duplicates concurrent calls; a settled result is never reused, so retries always hit the API.
    .finally(() => inflight.delete(key));
  inflight.set(key, p);
  return p;
}

const svgHref = (svg: string) => `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;

/** Reason from the API → which localized message to show. */
function messageKey(reason: string): keyof T["fallback"] {
  if (reason === "noFreeTier" || reason === "rateLimited" || reason === "blocked" || reason === "timeout" || reason === "userLimit") return reason;
  return "unavailable";
}

/**
 * A concept's logo: the AI-rendered raster image when available (rendered
 * on demand, stored in the brand's private storage), else the crafted
 * vector logo with an accurate status and a "Retry logo image" action.
 */
export function ConceptLogo({ generationId, concept, svg, initial, auto, preview, alt, t, fileBase, showDiagnostics }: {
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
  /** Staff: show per-model status codes and Google's messages. */
  showDiagnostics?: boolean;
}) {
  const [image, setImage] = useState<LogoImage | null>(initial ?? null);
  const [status, setStatus] = useState<"idle" | "loading" | "failed">(() => (initial ? "idle" : auto && (generationId || preview) ? "loading" : "idle"));
  const [failure, setFailure] = useState<Failure | null>(null);
  const [wait, setWait] = useState(0);
  const canRender = !!(generationId || preview);

  const fetchImage = useCallback(
    () => requestImage(`${generationId ?? preview?.brand}-${concept}`, { generationId, concept, preview: generationId ? undefined : preview }),
    [generationId, concept, preview],
  );
  const apply = useCallback((res: Result) => {
    if (res.ok) {
      setImage(res.image);
      setFailure(null);
      setStatus("idle");
    } else {
      setFailure(res.failure);
      setWait(res.failure.retryAfter && res.failure.retryAfter < 600 ? res.failure.retryAfter : 0);
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

  // "Retry all logo images" from the concepts header (layout effect: listening before the failure is painted).
  useLayoutEffect(() => {
    if (status !== "failed" || !canRender) return;
    const onRetry = () => void render();
    window.addEventListener(RETRY_ALL_EVENT, onRetry);
    return () => window.removeEventListener(RETRY_ALL_EVENT, onRetry);
  }, [status, canRender, render]);

  // Countdown when Google says when to retry.
  useEffect(() => {
    if (wait <= 0) return;
    const timer = setTimeout(() => setWait((w) => w - 1), 1000);
    return () => clearTimeout(timer);
  }, [wait]);

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
          <SvgLogo svg={svg} alt={alt} className="aspect-square w-full [&_img]:p-5" />
        )}
        <span className={cn("absolute end-2 top-2 rounded-full px-2 py-0.5 text-[10px] font-semibold shadow", image ? "bg-blue text-white" : "bg-navy/85 text-white")}>
          {status === "loading" ? <Loader2 className="size-3 animate-spin" aria-hidden /> : image ? t.imageBadge : t.vectorBadge}
        </span>
      </div>

      {status === "failed" && failure && (
        <div className="space-y-1" role="status">
          <p className="text-[11px] leading-snug text-yellow">{t.fallback[messageKey(failure.reason)]}</p>
          {wait > 0 && <p className="text-[11px] tabular-nums text-ink-subtle">{t.retryIn.replace("{seconds}", String(wait))}</p>}
          {showDiagnostics && failure.attempts?.length ? (
            <details className="text-[11px] text-ink-subtle">
              <summary className="cursor-pointer hover:text-white">{t.diagnostics}</summary>
              <ul className="mt-1 space-y-1" dir="ltr">
                {failure.attempts.map((a, i) => (
                  <li key={i} className="break-words">
                    <span className="font-mono text-ink-muted">{a.model}</span> · {a.status ?? "—"} · {a.reason}
                    {a.message && <span className="block text-ink-subtle">{a.message}</span>}
                  </li>
                ))}
              </ul>
            </details>
          ) : null}
        </div>
      )}
      {image && image.stored === false && <p className="text-[11px] leading-snug text-ink-subtle">{t.notStored}</p>}

      <div className="flex flex-wrap gap-2">
        {!image && canRender && status !== "loading" && (
          <button
            type="button"
            onClick={() => void render()}
            disabled={wait > 0}
            className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-blue/15 px-3 text-xs font-semibold text-blue-300 ring-1 ring-blue/40 hover:bg-blue/25 hover:text-white disabled:opacity-50"
          >
            {status === "failed" ? <RotateCcw className="size-3.5" aria-hidden /> : <Sparkles className="size-3.5" aria-hidden />}
            {status === "failed" ? t.retryImage : t.renderImage}
          </button>
        )}
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
      </div>
    </div>
  );
}

/** Header action: retry every failed logo image on the page. */
export function RetryAllLogosButton({ label }: { label: string }) {
  return (
    <button
      type="button"
      onClick={() => window.dispatchEvent(new Event(RETRY_ALL_EVENT))}
      className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-line px-3 text-xs font-medium text-ink-muted hover:border-blue/40 hover:text-white"
    >
      <RotateCcw className="size-3.5" aria-hidden />
      {label}
    </button>
  );
}
