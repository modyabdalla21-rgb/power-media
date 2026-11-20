"use client";
import Link from "next/link";
import { useState } from "react";
import { AlertCircle, ArrowLeft, ArrowRight, Check, CheckCircle2, Loader2, Stethoscope } from "lucide-react";
import { UpgradeModal } from "@/components/client/upgrade-modal";
import { Button } from "@/components/ui/button";
import { Input, Label, Select, Textarea } from "@/components/ui/form";
import { BUDGET_RANGES, DISCOVERY, type Discovery } from "@/lib/client/discovery";
import { saveDiscovery } from "@/lib/hub/actions";
import type { Dictionary } from "@/i18n/dictionaries/en";
import { cn } from "@/lib/utils";
import { useAiRun } from "./use-ai-run";

type D = Dictionary["dashboard"];
const STEPS = ["channels", "stage", "budget", "bottleneck", "capacity", "goal"] as const;

/** Smart Discovery interview → saves answers → runs the Growth Diagnosis (one AI call). */
export function DiscoveryWizard({ d, initial, language, hubHref }: { d: D; initial: Partial<Discovery>; language: string; hubHref: string }) {
  const g = d.growth;
  const [step, setStep] = useState(initial.stage ? STEPS.length : 0);
  const [a, setA] = useState<Discovery>({
    channels: initial.channels ?? [],
    stage: initial.stage ?? "zero",
    budget: initial.budget ?? "none",
    bottleneck: initial.bottleneck ?? "awareness",
    capacity: initial.capacity ?? "me",
    offer: initial.offer ?? "",
    goal: initial.goal ?? "",
    notes: initial.notes ?? "",
    currency: initial.currency ?? "EGP",
  });
  const [horizon, setHorizon] = useState("1m");
  const [saveError, setSaveError] = useState(false);
  const [done, setDone] = useState(false);
  const { run, busy, elapsed, error, limit, clearLimit } = useAiRun("growth-diagnosis");
  const set = <K extends keyof Discovery>(k: K, v: Discovery[K]) => setA((p) => ({ ...p, [k]: v }));
  const review = step >= STEPS.length;

  async function generate() {
    setSaveError(false);
    const saved = await saveDiscovery(a);
    if (!saved.ok) return setSaveError(true);
    const res = await run({ horizon, language });
    if (res) setDone(true);
  }

  const choice = (selected: boolean) =>
    cn("flex min-h-12 w-full items-center gap-3 rounded-xl border px-4 py-3 text-start text-sm transition-colors", selected ? "border-blue/60 bg-blue/15 text-white" : "border-line text-ink-muted hover:border-line-strong hover:text-white");
  const single = <K extends "stage" | "budget" | "bottleneck" | "capacity">(k: K, labels: Record<string, string>, extra?: (v: string, i: number) => string) => (
    <div role="radiogroup" aria-label={g.q[k]} className="grid gap-2 sm:grid-cols-2">
      {DISCOVERY[k].map((v, i) => (
        <button key={v} type="button" role="radio" aria-checked={a[k] === v} onClick={() => set(k, v as Discovery[K])} className={choice(a[k] === v)}>
          <span className={cn("inline-flex size-5 shrink-0 items-center justify-center rounded-full border", a[k] === v ? "border-blue bg-blue" : "border-line-strong")}>{a[k] === v && <Check className="size-3" aria-hidden />}</span>
          <span className="min-w-0">{labels[v]}{extra && <span className="block text-xs text-ink-subtle" dir="ltr">{extra(v, i)}</span>}</span>
        </button>
      ))}
    </div>
  );

  if (done) {
    return (
      <div className="surface-card space-y-4 p-6 text-center sm:p-10">
        <CheckCircle2 className="mx-auto size-12 text-blue-300" aria-hidden />
        <h2 className="text-xl font-semibold">{g.doneTitle}</h2>
        <p className="mx-auto max-w-md text-sm text-ink-muted">{g.doneBody}</p>
        <Link href={hubHref} className="inline-flex h-12 items-center gap-2 rounded-(--radius-control) bg-blue px-6 font-semibold text-white hover:bg-blue-400">
          {g.openHub}
          <ArrowRight className="flip-rtl size-4" aria-hidden />
        </Link>
      </div>
    );
  }

  return (
    <div className="surface-card p-5 sm:p-8">
      {!review && (
        <div className="mb-6">
          <div className="flex items-center justify-between text-xs text-ink-subtle">
            <span>{g.stepOf.replace("{n}", String(step + 1)).replace("{total}", String(STEPS.length))}</span>
          </div>
          <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/10" role="progressbar" aria-valuenow={step + 1} aria-valuemin={1} aria-valuemax={STEPS.length}>
            <div className="h-full rounded-full bg-gradient-to-r from-blue to-yellow transition-all" style={{ width: `${((step + 1) / STEPS.length) * 100}%` }} />
          </div>
        </div>
      )}

      {!review && <h2 className="mb-4 text-lg font-semibold">{g.q[STEPS[step]]}</h2>}

      {STEPS[step] === "channels" && (
        <>
          <p className="mb-3 text-xs text-ink-subtle">{g.channelsHint}</p>
          <div className="grid gap-2 sm:grid-cols-2">
            {DISCOVERY.channels.map((c) => {
              const on = a.channels.includes(c);
              return (
                <button key={c} type="button" aria-pressed={on} onClick={() => set("channels", on ? a.channels.filter((x) => x !== c) : [...a.channels, c])} className={choice(on)}>
                  <span className={cn("inline-flex size-5 shrink-0 items-center justify-center rounded-md border", on ? "border-blue bg-blue" : "border-line-strong")}>{on && <Check className="size-3" aria-hidden />}</span>
                  {g.options.channels[c]}
                </button>
              );
            })}
          </div>
        </>
      )}
      {STEPS[step] === "stage" && single("stage", g.options.stage)}
      {STEPS[step] === "budget" && (
        <div className="space-y-4">
          <div className="max-w-40">
            <Label htmlFor="disc-cur">{g.currency}</Label>
            <Select id="disc-cur" value={a.currency} onChange={(e) => set("currency", e.target.value as Discovery["currency"])}>
              {(["EGP", "SAR", "AED", "USD"] as const).map((c) => <option key={c} value={c}>{c}</option>)}
            </Select>
          </div>
          {single("budget", g.options.budget, (_v, i) => (i === 0 ? "" : `${BUDGET_RANGES[a.currency][i]} ${a.currency}`))}
        </div>
      )}
      {STEPS[step] === "bottleneck" && (
        <div className="space-y-3">
          {single("bottleneck", g.options.bottleneck)}
          <Textarea value={a.notes} onChange={(e) => set("notes", e.target.value)} maxLength={500} rows={2} placeholder={g.notesPlaceholder} aria-label={g.notesPlaceholder} />
        </div>
      )}
      {STEPS[step] === "capacity" && single("capacity", g.options.capacity)}
      {STEPS[step] === "goal" && (
        <div className="space-y-4">
          <Input value={a.goal} onChange={(e) => set("goal", e.target.value)} maxLength={300} placeholder={g.goalPlaceholder} aria-label={g.q.goal} />
          <div>
            <Label htmlFor="disc-offer">{g.offer}</Label>
            <Input id="disc-offer" value={a.offer} onChange={(e) => set("offer", e.target.value)} maxLength={300} placeholder={g.offerPlaceholder} />
          </div>
        </div>
      )}

      {review && (
        <div className="space-y-5">
          <h2 className="text-lg font-semibold">{g.reviewTitle}</h2>
          <dl className="grid gap-3 text-sm sm:grid-cols-2">
            {[
              [g.q.channels, a.channels.length ? a.channels.map((c) => g.options.channels[c]).join(" · ") : g.noneYet],
              [g.q.stage, g.options.stage[a.stage]],
              [g.q.budget, a.budget === "none" ? g.options.budget.none : `${g.options.budget[a.budget]} · ${BUDGET_RANGES[a.currency][DISCOVERY.budget.indexOf(a.budget)]} ${a.currency}`],
              [g.q.bottleneck, g.options.bottleneck[a.bottleneck]],
              [g.q.capacity, g.options.capacity[a.capacity]],
              [g.q.goal, a.goal || "—"],
            ].map(([k, v]) => (
              <div key={k} className="rounded-xl border border-line p-3">
                <dt className="text-xs text-ink-subtle">{k}</dt>
                <dd className="mt-1 break-words" dir="auto">{v}</dd>
              </div>
            ))}
          </dl>
          <div className="grid gap-3 sm:grid-cols-[auto_1fr] sm:items-end">
            <div>
              <Label htmlFor="disc-horizon">{g.horizon}</Label>
              <Select id="disc-horizon" value={horizon} onChange={(e) => setHorizon(e.target.value)} disabled={busy}>
                {(["2w", "1m", "3m"] as const).map((h) => <option key={h} value={h}>{(d.options as Record<string, string>)[h]}</option>)}
              </Select>
            </div>
            <p className="text-xs text-ink-subtle">{d.hub.costNote}</p>
          </div>
          {(saveError || error) && (
            <p role="alert" className="flex items-start gap-2 rounded-xl border border-orange/30 bg-orange/10 p-3 text-sm">
              <AlertCircle className="mt-0.5 size-4 shrink-0 text-yellow" aria-hidden />
              {saveError ? g.saveError : (d.ai.errors as Record<string, string>)[error!.code] ?? d.ai.errors.unknown}
            </p>
          )}
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-between">
            <Button variant="secondary" onClick={() => setStep(0)} disabled={busy}>{g.edit}</Button>
            <Button variant="energy" size="lg" onClick={generate} disabled={busy}>
              {busy ? <Loader2 className="size-4 animate-spin" aria-hidden /> : <Stethoscope className="size-4" aria-hidden />}
              {busy ? `${g.generating} ${elapsed}s` : g.generate}
            </Button>
          </div>
        </div>
      )}

      {!review && (
        <div className="mt-6 flex justify-between gap-2">
          <Button variant="secondary" onClick={() => setStep((s) => Math.max(0, s - 1))} disabled={step === 0}>
            <ArrowLeft className="flip-rtl size-4" aria-hidden />
            {g.back}
          </Button>
          <Button onClick={() => setStep((s) => s + 1)}>
            {g.next}
            <ArrowRight className="flip-rtl size-4" aria-hidden />
          </Button>
        </div>
      )}
      <UpgradeModal info={limit} d={d} onClose={clearLimit} />
    </div>
  );
}
