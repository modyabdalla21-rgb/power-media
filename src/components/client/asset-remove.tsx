"use client";
import { useActionState } from "react";
import { Loader2, Trash2 } from "lucide-react";
import { deleteBrandAsset, type SimpleState } from "@/lib/client/assets";

export function RemoveAssetButton({ assetId, label }: { assetId: string; label: string }) {
  const [state, action, busy] = useActionState<SimpleState, FormData>(deleteBrandAsset, undefined);
  if (state?.ok) return null;
  return (
    <form action={action}>
      <input type="hidden" name="asset_id" value={assetId} />
      <button type="submit" disabled={busy} aria-label={label} title={label} className="inline-flex size-10 items-center justify-center rounded-lg bg-navy/70 text-white backdrop-blur hover:bg-orange/80 disabled:opacity-60">
        {busy ? <Loader2 className="size-4 animate-spin" aria-hidden /> : <Trash2 className="size-4" aria-hidden />}
      </button>
    </form>
  );
}
