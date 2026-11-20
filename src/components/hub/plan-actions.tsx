"use client";
import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { setPlanStatus } from "@/lib/hub/actions";
import type { Dictionary } from "@/i18n/dictionaries/en";

export function PlanActions({ planId, status, h }: { planId: string; status: string; h: Dictionary["dashboard"]["hub"] }) {
  const [pending, start] = useTransition();
  const router = useRouter();
  const set = (s: string) => start(async () => { await setPlanStatus(planId, s); router.refresh(); });
  const btn = "inline-flex h-10 items-center rounded-lg px-3 text-xs font-medium text-ink-muted hover:bg-white/5 hover:text-white disabled:opacity-50";
  return (
    <div className="flex flex-wrap items-center gap-1">
      {pending && <Loader2 className="size-4 animate-spin text-blue-300" aria-hidden />}
      {status === "active" ? (
        <>
          <button type="button" className={btn} disabled={pending} onClick={() => set("completed")}>{h.completePlan}</button>
          <button type="button" className={btn} disabled={pending} onClick={() => set("archived")}>{h.archivePlan}</button>
        </>
      ) : (
        <button type="button" className={btn} disabled={pending} onClick={() => set("active")}>{h.reopenPlan}</button>
      )}
    </div>
  );
}
