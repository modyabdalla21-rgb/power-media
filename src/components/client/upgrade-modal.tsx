"use client";
import { useEffect, useRef } from "react";
import { Check, X, Zap } from "lucide-react";
import type { Dictionary } from "@/i18n/dictionaries/en";
import { UpgradeRequestForm } from "./request-forms";

type D = Dictionary["dashboard"];
export type LimitInfo = { tier: "free" | "growth" | "pro"; quota: "ai" | "identity"; limit: number };

/** Shown when a client hits a plan limit: explains tiers and requests an upgrade. */
export function UpgradeModal({ info, d, onClose }: { info: LimitInfo | null; d: D; onClose: () => void }) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    if (info && !ref.current?.open) ref.current?.showModal();
    if (!info && ref.current?.open) ref.current.close();
  }, [info]);

  const p = d.plan;
  const what = info?.quota === "identity" ? p.identityGenerations : p.aiGenerations;
  const body = info ? p.limitBody.replace("{tier}", p.tiers[info.tier].name).replace("{limit}", String(info.limit)).replace("{what}", what) : "";
  const nextTier = info?.tier === "growth" ? "pro" : "growth";

  return (
    <dialog
      ref={ref}
      onClose={onClose}
      aria-labelledby="upgrade-title"
      className="m-auto max-h-[90dvh] w-[calc(100%-2rem)] max-w-3xl overflow-y-auto rounded-(--radius-card) border border-line-strong bg-surface-1 p-0 text-white backdrop:bg-navy/80 backdrop:backdrop-blur-sm"
    >
      <div className="flex items-start justify-between gap-4 border-b border-line p-6">
        <div className="flex items-start gap-3">
          <span className="mt-0.5 inline-flex size-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-yellow to-orange text-navy"><Zap className="size-5" aria-hidden /></span>
          <div>
            <h2 id="upgrade-title" className="text-lg font-semibold">{p.limitTitle}</h2>
            <p className="mt-1 text-sm leading-relaxed text-ink-muted">{body}</p>
          </div>
        </div>
        <button type="button" onClick={() => ref.current?.close()} aria-label={p.notNow} className="inline-flex size-8 shrink-0 items-center justify-center rounded-lg text-ink-muted hover:bg-white/5 hover:text-white">
          <X className="size-4" aria-hidden />
        </button>
      </div>
      <div className="grid gap-6 p-6 md:grid-cols-5">
        <ul className="grid gap-3 md:col-span-3">
          {(["growth", "pro"] as const).map((tier) => (
            <li key={tier} className={tier === nextTier ? "surface-card border-blue/40 p-4" : "surface-card p-4"}>
              <div className="flex items-baseline justify-between gap-2">
                <p className="font-semibold">{p.tiers[tier].name}</p>
                <p className="text-xs text-ink-subtle">{p.tiers[tier].price}</p>
              </div>
              <p className="mt-1 text-xs text-ink-muted">{p.tiers[tier].body}</p>
              <ul className="mt-3 space-y-1.5 text-xs">
                {p.tiers[tier].features.map((f) => <li key={f} className="flex items-start gap-2"><Check className="mt-0.5 size-3.5 shrink-0 text-blue" aria-hidden />{f}</li>)}
              </ul>
            </li>
          ))}
        </ul>
        <div className="md:col-span-2">
          <h3 className="text-sm font-semibold">{p.requestTitle}</h3>
          <p className="mt-1 mb-4 text-xs leading-relaxed text-ink-muted">{p.requestBody}</p>
          {info && <UpgradeRequestForm d={d} defaultTier={nextTier} />}
        </div>
      </div>
    </dialog>
  );
}
