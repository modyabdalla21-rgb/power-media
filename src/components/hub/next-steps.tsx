"use client";
import Link from "next/link";
import { useState, useTransition } from "react";
import { Check, ListPlus, Loader2, Sparkles } from "lucide-react";
import { StatusBadge } from "@/components/dashboard/crud/status-badge";
import { Button } from "@/components/ui/button";
import { addStepsAsTasks } from "@/lib/hub/actions";
import type { Dictionary } from "@/i18n/dictionaries/en";

type D = Dictionary["dashboard"];
export type Step = { title: string; why: string; category: string; priority: string; effort: string; tool: string | null };

export function NextSteps({ d, generationId, steps, addedTitles, toolHrefs }: {
  d: D;
  generationId: string;
  steps: Step[];
  addedTitles: string[];
  toolHrefs: Record<string, string>;
}) {
  const [added, setAdded] = useState(() => new Set(steps.map((s, i) => (addedTitles.includes(s.title) ? i : -1)).filter((i) => i >= 0)));
  const [pending, start] = useTransition();
  const [busyIdx, setBusyIdx] = useState<number | "all" | null>(null);
  const h = d.hub;
  const o = d.options as Record<string, string>;

  const add = (indices: number[], key: number | "all") => {
    setBusyIdx(key);
    start(async () => {
      const r = await addStepsAsTasks(generationId, indices);
      if (r.ok) setAdded((prev) => new Set([...prev, ...indices]));
      setBusyIdx(null);
    });
  };
  const remaining = steps.map((_, i) => i).filter((i) => !added.has(i));

  return (
    <div className="space-y-3">
      <ol className="space-y-2">
        {steps.map((s, i) => {
          const href = s.tool ? toolHrefs[s.tool] : null;
          return (
            <li key={`${s.title}-${i}`} className="rounded-xl border border-line p-3 sm:p-4">
              <div className="flex items-start gap-3">
                <span className="mt-0.5 inline-flex size-6 shrink-0 items-center justify-center rounded-full bg-blue/15 text-xs font-bold text-blue-300">{i + 1}</span>
                <div className="min-w-0 flex-1">
                  <p className="font-medium" dir="auto">{s.title}</p>
                  {s.why && <p className="mt-1 text-sm leading-relaxed text-ink-muted" dir="auto">{s.why}</p>}
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    <StatusBadge value={s.priority} label={o[s.priority] ?? s.priority} />
                    <StatusBadge value="neutral" label={o[s.category] ?? s.category} />
                    <StatusBadge value={s.effort === "quick" ? "active" : "neutral"} label={o[s.effort] ?? s.effort} />
                  </div>
                </div>
              </div>
              <div className="mt-3 flex flex-wrap gap-2 ps-9">
                {added.has(i) ? (
                  <span className="inline-flex h-10 items-center gap-1.5 text-sm text-blue-300"><Check className="size-4" aria-hidden />{h.added}</span>
                ) : (
                  <Button size="sm" variant="secondary" className="h-10" disabled={pending} onClick={() => add([i], i)}>
                    {busyIdx === i ? <Loader2 className="size-4 animate-spin" aria-hidden /> : <ListPlus className="size-4" aria-hidden />}
                    {h.addTask}
                  </Button>
                )}
                {href && (
                  <Link href={`${href}${href.includes("#") ? "" : `?brief=${encodeURIComponent(s.title)}`}`} className="inline-flex h-10 items-center gap-1.5 rounded-(--radius-control) px-3 text-sm font-medium text-yellow hover:bg-orange/10">
                    <Sparkles className="size-4" aria-hidden />
                    {h.doWithAi}
                  </Link>
                )}
              </div>
            </li>
          );
        })}
      </ol>
      {remaining.length > 1 && (
        <Button variant="primary" disabled={pending} onClick={() => add(remaining, "all")}>
          {busyIdx === "all" ? <Loader2 className="size-4 animate-spin" aria-hidden /> : <ListPlus className="size-4" aria-hidden />}
          {h.addAll}
        </Button>
      )}
    </div>
  );
}
