"use client";
import { useState } from "react";
import { AlertCircle, Loader2, Radar } from "lucide-react";
import { UpgradeModal } from "@/components/client/upgrade-modal";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/form";
import type { Dictionary } from "@/i18n/dictionaries/en";
import { useAiRun } from "./use-ai-run";

type D = Dictionary["dashboard"];

export function AnalyzePanel({ d, language, hasAnalysis }: { d: D; language: string; hasAnalysis: boolean }) {
  const { run, busy, elapsed, error, limit, clearLimit } = useAiRun("brand-analysis");
  const [focus, setFocus] = useState("");
  const h = d.hub;
  const errors = d.ai.errors;
  return (
    <div className="space-y-3">
      <Textarea value={focus} onChange={(e) => setFocus(e.target.value)} rows={2} maxLength={600} placeholder={h.focusPlaceholder} aria-label={h.focusPlaceholder} disabled={busy} />
      <div className="flex flex-wrap items-center gap-3">
        <Button variant="energy" onClick={() => run({ focus, language })} disabled={busy}>
          {busy ? <Loader2 className="size-4 animate-spin" aria-hidden /> : <Radar className="size-4" aria-hidden />}
          {busy ? `${h.analysing} ${elapsed}s` : hasAnalysis ? h.rerunAnalysis : h.runAnalysis}
        </Button>
        <span className="text-xs text-ink-subtle">{h.costNote}</span>
      </div>
      {error && (
        <p role="alert" className="flex items-start gap-2 rounded-xl border border-orange/30 bg-orange/10 p-3 text-sm">
          <AlertCircle className="mt-0.5 size-4 shrink-0 text-yellow" aria-hidden />
          {(errors as Record<string, string>)[error.code] ?? errors.unknown}
          {error.retryAfter && error.retryAfter < 600 ? ` ${d.ai.retryIn.replace("{seconds}", String(error.retryAfter))}` : ""}
        </p>
      )}
      <UpgradeModal info={limit} d={d} onClose={clearLimit} />
    </div>
  );
}
