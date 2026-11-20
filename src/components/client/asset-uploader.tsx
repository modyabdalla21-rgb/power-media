"use client";
import { useId, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { AlertCircle, CheckCircle2, Loader2, Palette, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/form";
import { applyKitColors, registerBrandAsset } from "@/lib/client/assets";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import type { Dictionary } from "@/i18n/dictionaries/en";

type B = Dictionary["dashboard"]["brand"];
const MIME = ["image/png", "image/jpeg", "image/webp", "image/svg+xml", "image/gif"] as const;
const MAX_BYTES = 5 * 1024 * 1024;
const EXT: Record<string, string> = { "image/png": "png", "image/jpeg": "jpg", "image/webp": "webp", "image/svg+xml": "svg", "image/gif": "gif" };

/**
 * Detect up to 5 dominant colors in an image, locally in the browser.
 * Near-white, near-transparent and near-duplicate colors are skipped.
 */
async function detectColors(file: File): Promise<string[]> {
  const url = URL.createObjectURL(file);
  try {
    const img = new Image();
    img.src = url;
    await img.decode();
    const size = 64;
    const canvas = document.createElement("canvas");
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    if (!ctx) return [];
    ctx.drawImage(img, 0, 0, size, size);
    const { data } = ctx.getImageData(0, 0, size, size);
    const buckets = new Map<string, { n: number; r: number; g: number; b: number }>();
    for (let i = 0; i < data.length; i += 4) {
      const [r, g, b, a] = [data[i], data[i + 1], data[i + 2], data[i + 3]];
      if (a < 160 || (r > 240 && g > 240 && b > 240)) continue;
      const key = `${r >> 4}-${g >> 4}-${b >> 4}`;
      const e = buckets.get(key) ?? { n: 0, r: 0, g: 0, b: 0 };
      buckets.set(key, { n: e.n + 1, r: e.r + r, g: e.g + g, b: e.b + b });
    }
    const picked: [number, number, number][] = [];
    for (const e of [...buckets.values()].sort((x, y) => y.n - x.n)) {
      const c: [number, number, number] = [Math.round(e.r / e.n), Math.round(e.g / e.n), Math.round(e.b / e.n)];
      if (picked.every((p) => Math.abs(p[0] - c[0]) + Math.abs(p[1] - c[1]) + Math.abs(p[2] - c[2]) > 60)) picked.push(c);
      if (picked.length === 5) break;
    }
    return picked.map((c) => `#${c.map((v) => v.toString(16).padStart(2, "0")).join("")}`.toUpperCase());
  } catch {
    return [];
  } finally {
    URL.revokeObjectURL(url);
  }
}

type Props = {
  clientId: string;
  kind: "logo" | "product";
  t: B;
  kitName?: string;
  /** Called after a successful upload (e.g. onboarding stores the asset id / colors). */
  onUploaded?: (asset: { id: string; colors: string[]; previewUrl: string }) => void;
  /** Show "use these colors" for logos (brand page). */
  offerColors?: boolean;
  compact?: boolean;
};

export function AssetUploader({ clientId, kind, t, kitName, onUploaded, offerColors = true, compact }: Props) {
  const inputId = useId();
  const fileRef = useRef<HTMLInputElement>(null);
  const [caption, setCaption] = useState("");
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState<{ ok?: string; error?: string } | null>(null);
  const [colors, setColors] = useState<string[]>([]);
  const [colorsApplied, setColorsApplied] = useState(false);
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  async function upload(file: File) {
    setStatus(null);
    setColorsApplied(false);
    if (!(MIME as readonly string[]).includes(file.type)) return setStatus({ error: t.badType });
    if (file.size > MAX_BYTES) return setStatus({ error: t.tooLarge });
    setBusy(true);
    try {
      const path = `${clientId}/${crypto.randomUUID()}.${EXT[file.type]}`;
      const { error } = await createSupabaseBrowserClient().storage.from("brand-assets").upload(path, file, { contentType: file.type, upsert: false, cacheControl: "3600" });
      if (error) throw error;
      const res = await registerBrandAsset({ path, kind, fileName: file.name.slice(0, 200), mime: file.type as (typeof MIME)[number], size: file.size, caption, kitName });
      if (!res.ok) throw new Error(res.error);
      const detected = kind === "logo" ? await detectColors(file) : [];
      setColors(detected);
      setCaption("");
      setStatus({ ok: kind === "logo" ? t.logoUploaded : t.productUploaded });
      onUploaded?.({ id: res.id, colors: detected, previewUrl: URL.createObjectURL(file) });
      startTransition(() => router.refresh());
    } catch (err) {
      console.error("[upload]", err);
      setStatus({ error: t.uploadFailed });
    } finally {
      setBusy(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  return (
    <div className="space-y-3">
      {kind === "product" && !compact && (
        <Input value={caption} onChange={(e) => setCaption(e.target.value)} maxLength={300} placeholder={t.captionPlaceholder} aria-label={t.captionPlaceholder} />
      )}
      <div className="flex flex-wrap items-center gap-3">
        <input
          ref={fileRef}
          id={inputId}
          type="file"
          accept={MIME.join(",")}
          className="sr-only"
          onChange={(e) => e.target.files?.[0] && upload(e.target.files[0])}
          disabled={busy}
        />
        <label
          htmlFor={inputId}
          className={`inline-flex h-11 cursor-pointer items-center gap-2 rounded-(--radius-control) border border-line-strong bg-white/[0.03] px-4 text-sm font-semibold transition-colors hover:border-blue/50 hover:bg-blue/10 ${busy ? "pointer-events-none opacity-60" : ""}`}
        >
          {busy ? <Loader2 className="size-4 animate-spin" aria-hidden /> : <Upload className="size-4" aria-hidden />}
          {busy ? t.uploading : kind === "logo" ? t.uploadLogo : t.uploadProduct}
        </label>
        <span className="text-xs text-ink-subtle">{t.uploadHint}</span>
      </div>
      <div aria-live="polite" className="space-y-2 text-sm">
        {status?.ok && <p className="flex items-center gap-2 text-blue-300"><CheckCircle2 className="size-4" aria-hidden />{status.ok}</p>}
        {status?.error && <p role="alert" className="flex items-center gap-2 text-yellow"><AlertCircle className="size-4" aria-hidden />{status.error}</p>}
      </div>
      {offerColors && colors.length > 0 && !colorsApplied && (
        <div className="rounded-xl border border-line p-3">
          <p className="text-xs text-ink-subtle">{t.detectedColors}</p>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            {colors.map((c) => (
              <span key={c} className="inline-flex items-center gap-1.5 rounded-full border border-line px-2 py-1 text-xs" dir="ltr">
                <span className="size-4 rounded-full border border-white/20" style={{ backgroundColor: c }} />
                {c}
              </span>
            ))}
            <Button
              type="button"
              size="sm"
              variant="secondary"
              disabled={pending}
              onClick={() =>
                startTransition(async () => {
                  const res = await applyKitColors(colors, kitName);
                  if (res?.ok) {
                    setColorsApplied(true);
                    setStatus({ ok: t.colorsApplied });
                    router.refresh();
                  } else setStatus({ error: t.uploadFailed });
                })
              }
            >
              <Palette className="size-4" aria-hidden />
              {t.applyColors}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
