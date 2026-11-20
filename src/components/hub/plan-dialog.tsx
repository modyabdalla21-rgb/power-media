"use client";
import { useId, useRef, useState, type FormEvent } from "react";
import { AlertCircle, ListChecks, Loader2, X } from "lucide-react";
import { UpgradeModal } from "@/components/client/upgrade-modal";
import { Button } from "@/components/ui/button";
import { Input, Label, Select } from "@/components/ui/form";
import type { Dictionary } from "@/i18n/dictionaries/en";
import { useAiRun } from "./use-ai-run";

type D = Dictionary["dashboard"];

export function PlanDialog({ d, language, currency, defaultGoal }: { d: D; language: string; currency: string; defaultGoal?: string }) {
  const ref = useRef<HTMLDialogElement>(null);
  const { run, busy, elapsed, error, limit, clearLimit } = useAiRun("growth-plan");
  const [goalMissing, setGoalMissing] = useState(false);
  const uid = useId();
  const id = (n: string) => `${uid}-${n}`;
  const h = d.hub;
  const o = d.options;

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const inputs = Object.fromEntries(["goal", "horizon", "budget", "currency", "channels"].map((k) => [k, String(fd.get(k) ?? "").trim()]));
    if (!inputs.goal) return setGoalMissing(true);
    setGoalMissing(false);
    const res = await run({ ...inputs, language });
    if (res) ref.current?.close();
  }

  return (
    <>
      <Button variant="energy" onClick={() => ref.current?.showModal()}>
        <ListChecks className="size-4" aria-hidden />
        {h.newPlan}
      </Button>
      <dialog ref={ref} aria-labelledby={id("plan-title")} className="m-auto max-h-[90dvh] w-[calc(100%-2rem)] max-w-lg overflow-y-auto rounded-(--radius-card) border border-line-strong bg-surface-1 p-0 text-white backdrop:bg-navy/80 backdrop:backdrop-blur-sm">
        <form onSubmit={onSubmit} className="space-y-4 p-6" noValidate>
          <div className="flex items-start justify-between gap-3">
            <h2 id={id("plan-title")} className="text-lg font-semibold">{h.planTitle}</h2>
            <button type="button" onClick={() => ref.current?.close()} aria-label={d.crud.close} className="inline-flex size-10 items-center justify-center rounded-lg text-ink-muted hover:bg-white/5 hover:text-white">
              <X className="size-4" aria-hidden />
            </button>
          </div>
          <div>
            <Label htmlFor={id("plan-goal")} required>{d.fields.objective}</Label>
            <Input id={id("plan-goal")} name="goal" maxLength={300} placeholder={h.goalPlaceholder} defaultValue={defaultGoal} aria-invalid={goalMissing || undefined} disabled={busy} />
            {goalMissing && <p className="mt-1 text-xs text-yellow">{d.crud.required}</p>}
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label htmlFor={id("plan-horizon")}>{d.fields.period}</Label>
              <Select id={id("plan-horizon")} name="horizon" defaultValue="1m" disabled={busy}>
                {(["2w", "1m", "3m"] as const).map((k) => <option key={k} value={k}>{o[k]}</option>)}
              </Select>
            </div>
            <div className="grid grid-cols-[1fr_auto] gap-2">
              <div>
                <Label htmlFor={id("plan-budget")}>{d.fields.budget}</Label>
                <Input id={id("plan-budget")} name="budget" type="number" min={1} step="any" dir="ltr" className="rtl:text-end" disabled={busy} />
              </div>
              <div>
                <Label htmlFor={id("plan-currency")}>{d.fields.currency}</Label>
                <Select id={id("plan-currency")} name="currency" defaultValue={currency} disabled={busy}>
                  {(["EGP", "SAR", "AED", "USD"] as const).map((c) => <option key={c} value={c}>{c}</option>)}
                </Select>
              </div>
            </div>
          </div>
          <div>
            <Label htmlFor={id("plan-channels")}>{d.fields.platform}</Label>
            <Input id={id("plan-channels")} name="channels" maxLength={200} placeholder="Instagram, TikTok, WhatsApp…" disabled={busy} />
          </div>
          {error && (
            <p role="alert" className="flex items-start gap-2 rounded-xl border border-orange/30 bg-orange/10 p-3 text-sm">
              <AlertCircle className="mt-0.5 size-4 shrink-0 text-yellow" aria-hidden />
              {(d.ai.errors as Record<string, string>)[error.code] ?? d.ai.errors.unknown}
            </p>
          )}
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:items-center sm:justify-between">
            <span className="text-xs text-ink-subtle">{h.costNote}</span>
            <Button type="submit" variant="energy" disabled={busy}>
              {busy && <Loader2 className="size-4 animate-spin" aria-hidden />}
              {busy ? `${h.generatingPlan} ${elapsed}s` : h.generatePlan}
            </Button>
          </div>
        </form>
      </dialog>
      <UpgradeModal info={limit} d={d} onClose={clearLimit} />
    </>
  );
}
