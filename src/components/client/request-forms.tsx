"use client";
import { useActionState } from "react";
import { CheckCircle2, LifeBuoy, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label, Select, Textarea } from "@/components/ui/form";
import { submitClientRequest, type RequestState } from "@/lib/client/actions";
import type { Dictionary } from "@/i18n/dictionaries/en";

type D = Dictionary["dashboard"];

/** Upgrade request (no payment) → creates a client_requests row for the agency. */
export function UpgradeRequestForm({ d, defaultTier = "growth", pending }: { d: D; defaultTier?: "growth" | "pro"; pending?: boolean }) {
  const [state, action, busy] = useActionState<RequestState, FormData>(submitClientRequest, undefined);
  const p = d.plan;
  if (state?.ok || pending) {
    return (
      <p role="status" className="flex items-start gap-2 rounded-xl border border-blue/30 bg-blue/10 p-3 text-sm">
        <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-blue-300" aria-hidden />
        {state?.ok === "sent" ? p.sent : p.pending}
      </p>
    );
  }
  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="kind" value="upgrade" />
      <div>
        <Label htmlFor="up-tier" required>{d.fields.requestedTier}</Label>
        <Select id="up-tier" name="requested_tier" defaultValue={defaultTier}>
          <option value="growth">{p.tiers.growth.name}</option>
          <option value="pro">{p.tiers.pro.name}</option>
        </Select>
      </div>
      <div>
        <Label htmlFor="up-msg">{p.messageLabel}</Label>
        <Textarea id="up-msg" name="message" rows={3} maxLength={2000} />
      </div>
      {state?.error && <p role="alert" className="text-sm text-yellow">{d.crud[state.error === "invalid" ? "invalid" : state.error === "forbidden" ? "forbidden" : "dbError"]}</p>}
      <Button type="submit" variant="energy" className="w-full" disabled={busy}>
        {busy && <Loader2 className="size-4 animate-spin" aria-hidden />}
        {busy ? p.sending : p.send}
      </Button>
      <p className="text-xs text-ink-subtle">{p.noPayment}</p>
    </form>
  );
}

/** One-click "ask the agency for brand/logo help". */
export function BrandHelpButton({ d }: { d: D }) {
  const [state, action, busy] = useActionState<RequestState, FormData>(submitClientRequest, undefined);
  if (state?.ok) {
    return <p role="status" className="flex items-center gap-2 text-sm text-blue-300"><CheckCircle2 className="size-4" aria-hidden />{d.brand.helpSent}</p>;
  }
  return (
    <form action={action}>
      <input type="hidden" name="kind" value="brand_help" />
      <Button type="submit" variant="secondary" disabled={busy}>
        {busy ? <Loader2 className="size-4 animate-spin" aria-hidden /> : <LifeBuoy className="size-4" aria-hidden />}
        {d.brand.helpCta}
      </Button>
      {state?.error && <p role="alert" className="mt-2 text-sm text-yellow">{d.crud.dbError}</p>}
    </form>
  );
}
