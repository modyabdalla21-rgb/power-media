"use client";
import Link from "next/link";
import { useActionState } from "react";
import { CheckCircle2, Loader2, Wand2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { activateKit, applyIdentityConcept, type ApplyState } from "@/lib/client/actions";
import type { Dictionary } from "@/i18n/dictionaries/en";

type D = Dictionary["dashboard"];

export function ApplyConceptButton({ generationId, concept, d, brandHref }: { generationId: string; concept: number; d: D; brandHref?: string }) {
  const [state, action, busy] = useActionState<ApplyState, FormData>(applyIdentityConcept, undefined);
  if (state?.ok) {
    return (
      <p role="status" className="flex flex-wrap items-center gap-2 text-sm text-blue-300">
        <CheckCircle2 className="size-4" aria-hidden />
        {d.identity.applied}
        {brandHref && <Link href={brandHref} className="font-medium underline underline-offset-2 hover:text-white">{d.identity.viewBrand}</Link>}
      </p>
    );
  }
  return (
    <form action={action}>
      <input type="hidden" name="generation_id" value={generationId} />
      <input type="hidden" name="concept" value={concept} />
      <Button type="submit" size="sm" disabled={busy}>
        {busy ? <Loader2 className="size-4 animate-spin" aria-hidden /> : <Wand2 className="size-4" aria-hidden />}
        {busy ? d.identity.applying : d.identity.apply}
      </Button>
      {state?.error && <p role="alert" className="mt-2 text-xs text-yellow">{d.crud[state.error === "invalid" ? "invalid" : state.error === "forbidden" ? "forbidden" : "dbError"]}</p>}
    </form>
  );
}

export function ActivateKitButton({ kitId, d }: { kitId: string; d: D }) {
  const [state, action, busy] = useActionState<ApplyState, FormData>(activateKit, undefined);
  return (
    <form action={action}>
      <input type="hidden" name="kit_id" value={kitId} />
      <button type="submit" disabled={busy || state?.ok} className="rounded-lg px-2.5 py-1.5 text-xs font-medium text-blue-300 hover:bg-blue/10 hover:text-white disabled:opacity-50">
        {busy ? <Loader2 className="size-3.5 animate-spin" aria-hidden /> : d.brand.activate}
      </button>
    </form>
  );
}
