"use client";
import { ImageIcon, X } from "lucide-react";
import { AssetUploader } from "@/components/client/asset-uploader";
import type { Dictionary } from "@/i18n/dictionaries/en";
import { cn } from "@/lib/utils";

export type ProductImage = { id: string; url: string | null; name: string | null };

/**
 * Product photo picker for the Static Post Studio: upload a new photo
 * (stored in the brand's private assets) or reuse one already uploaded.
 * The selected asset id is submitted in a hidden input.
 */
export function ProductImageField({ name, label, clientId, images, value, onChange, d }: {
  name: string;
  label: string;
  clientId: string | null;
  images: ProductImage[];
  value: { id: string; url: string | null } | null;
  onChange: (v: { id: string; url: string | null } | null) => void;
  d: Dictionary["dashboard"];
}) {
  const t = d.post;
  if (!clientId) {
    return (
      <div>
        <p className="mb-1.5 text-sm font-medium">{label}</p>
        <p className="text-xs text-ink-subtle">{t.staffNoImage}</p>
      </div>
    );
  }
  return (
    <fieldset className="min-w-0 space-y-3">
      <legend className="mb-1.5 text-sm font-medium">{label}</legend>
      <input type="hidden" name={name} value={value?.id ?? ""} />
      <p className="text-xs leading-relaxed text-ink-subtle">{t.imageHint}</p>
      {value && (
        <div className="flex items-center gap-3 rounded-xl border border-blue/40 bg-blue/5 p-2">
          {value.url ? (
            // eslint-disable-next-line @next/next/no-img-element -- signed URL / local preview
            <img src={value.url} alt="" className="size-16 shrink-0 rounded-lg bg-white object-contain" referrerPolicy="no-referrer" />
          ) : (
            <span className="inline-flex size-16 shrink-0 items-center justify-center rounded-lg bg-white/5"><ImageIcon className="size-5 text-ink-subtle" aria-hidden /></span>
          )}
          <span className="min-w-0 flex-1 text-xs text-ink-muted">{t.change}</span>
          <button type="button" onClick={() => onChange(null)} className="inline-flex h-9 items-center gap-1 rounded-lg px-2.5 text-xs text-ink-muted hover:bg-white/5 hover:text-white">
            <X className="size-4" aria-hidden />
            {t.remove}
          </button>
        </div>
      )}
      <AssetUploader clientId={clientId} kind="product" t={d.brand} compact offerColors={false} onUploaded={({ id, previewUrl }) => onChange({ id, url: previewUrl })} />
      {images.length > 0 && (
        <div>
          <p className="mb-2 text-xs text-ink-subtle">{t.pickExisting}</p>
          <ul className="flex flex-wrap gap-2">
            {images.map((img) => {
              const on = value?.id === img.id;
              return (
                <li key={img.id}>
                  <button type="button" onClick={() => onChange(on ? null : { id: img.id, url: img.url })} aria-pressed={on} title={img.name ?? undefined}
                    className={cn("block size-16 overflow-hidden rounded-lg border-2 bg-white transition-colors", on ? "border-blue" : "border-transparent hover:border-blue/40")}>
                    {img.url ? (
                      // eslint-disable-next-line @next/next/no-img-element -- signed URL from private storage
                      <img src={img.url} alt={img.name ?? ""} className="size-full object-contain" loading="lazy" referrerPolicy="no-referrer" />
                    ) : null}
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      )}
      {!value && <p className="text-xs text-ink-subtle">{t.noImage}</p>}
    </fieldset>
  );
}
