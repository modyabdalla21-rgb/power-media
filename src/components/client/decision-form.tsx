"use client";
import { useActionState, useState } from "react";
import { CheckCircle2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label, Textarea } from "@/components/ui/form";
import { decideProject, type DecisionState } from "@/lib/projects/actions";
import type { Dictionary } from "@/i18n/dictionaries/en";
import { cn } from "@/lib/utils";

type D = Dictionary["dashboard"];
const STATUSES = ["approved", "changes_requested", "on_hold", "pending"] as const;

/** Approve / request changes / hold, with notes — the project's decision record. */
export function DecisionForm({ projectId, status, notes, d }: { projectId: string; status: string; notes: string; d: D }) {
  const [state, action, busy] = useActionState<DecisionState, FormData>(decideProject, undefined);
  const [choice, setChoice] = useState(status);
  const t = d.projectDetail;
  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="project_id" value={projectId} />
      <fieldset>
        <legend className="sr-only">{d.fields.decisionStatus}</legend>
        <div className="grid grid-cols-2 gap-2">
          {STATUSES.map((s) => (
            <label
              key={s}
              className={cn(
                "flex min-h-11 cursor-pointer items-center gap-2 rounded-lg border px-3 text-sm transition-colors",
                choice === s
                  ? s === "approved" ? "border-blue/60 bg-blue/15" : s === "changes_requested" ? "border-orange/50 bg-orange/10" : "border-line-strong bg-white/5"
                  : "border-line hover:border-line-strong",
              )}
            >
              <input type="radio" name="decision_status" value={s} checked={choice === s} onChange={() => setChoice(s)} className="accent-[var(--color-blue)]" />
              {d.options[s]}
            </label>
          ))}
        </div>
      </fieldset>
      <div>
        <Label htmlFor="decision-notes">{d.fields.decisionNotes}</Label>
        <Textarea id="decision-notes" name="decision_notes" rows={3} maxLength={4000} defaultValue={notes} placeholder={t.notesPlaceholder} />
      </div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <span aria-live="polite" className="text-sm">
          {state?.ok && <span className="inline-flex items-center gap-1.5 text-blue-300"><CheckCircle2 className="size-4" aria-hidden />{t.decisionSaved}</span>}
          {state?.error && <span className="text-yellow">{d.crud[state.error]}</span>}
        </span>
        <Button type="submit" disabled={busy}>
          {busy && <Loader2 className="size-4 animate-spin" aria-hidden />}
          {t.saveDecision}
        </Button>
      </div>
    </form>
  );
}
