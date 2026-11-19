"use client";
import { useActionState, useRef } from "react";
import { AlertCircle, CheckCircle2, Loader2, UserPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Field, Input, Select } from "@/components/ui/form";
import type { CrudState } from "@/lib/crud/actions";
import { inviteMember, updateMemberRole, type InviteState } from "@/lib/team/actions";
import type { Locale } from "@/i18n/config";
import type { Dictionary } from "@/i18n/dictionaries/en";
import type { Option } from "@/components/dashboard/crud/types";

type D = Dictionary["dashboard"];

export function InviteDialog({ locale, t, crud, roles, emailLabel, roleLabel }: { locale: Locale; t: D["team"]; crud: D["crud"]; roles: Option[]; emailLabel: string; roleLabel: string }) {
  const ref = useRef<HTMLDialogElement>(null);
  const [state, action, pending] = useActionState<InviteState, FormData>(inviteMember, undefined);
  const message =
    state?.ok === "sent" ? t.invited : state?.ok === "savedNoEmail" ? t.invitedNoEmail : state?.error === "exists" ? t.exists : state?.error ? crud[state.error] : null;

  return (
    <>
      <Button onClick={() => ref.current?.showModal()}>
        <UserPlus className="size-4" aria-hidden />
        {t.invite}
      </Button>
      <dialog ref={ref} aria-labelledby="invite-title" className="m-auto w-[calc(100%-2rem)] max-w-md rounded-(--radius-card) border border-line-strong bg-surface-1 p-0 text-white backdrop:bg-navy/75 backdrop:backdrop-blur-sm">
        <form action={action} className="space-y-5 p-6">
          <input type="hidden" name="locale" value={locale} />
          <div>
            <h2 id="invite-title" className="font-semibold">{t.inviteTitle}</h2>
            <p className="mt-1.5 text-sm text-ink-muted">{t.inviteBody}</p>
          </div>
          <Field label={emailLabel} htmlFor="invite-email" required>
            <Input id="invite-email" name="email" type="email" required dir="ltr" autoComplete="off" />
          </Field>
          <Field label={roleLabel} htmlFor="invite-role" required>
            <Select id="invite-role" name="role" defaultValue="team">
              {roles.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}
            </Select>
          </Field>
          {message && (
            <p role="status" className={state?.ok === "sent" ? "flex items-start gap-2 rounded-xl border border-blue/30 bg-blue/10 p-3 text-sm" : "flex items-start gap-2 rounded-xl border border-orange/30 bg-orange/10 p-3 text-sm"}>
              {state?.ok === "sent" ? <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-blue-300" aria-hidden /> : <AlertCircle className="mt-0.5 size-4 shrink-0 text-yellow" aria-hidden />}
              {message}
            </p>
          )}
          <div className="flex justify-end gap-2">
            <Button type="button" variant="secondary" onClick={() => ref.current?.close()}>{crud.close}</Button>
            <Button type="submit" disabled={pending}>
              {pending && <Loader2 className="size-4 animate-spin" aria-hidden />}
              {pending ? crud.saving : t.send}
            </Button>
          </div>
        </form>
      </dialog>
    </>
  );
}

export function RoleForm({ id, role, roles, t, crud, label }: { id: string; role: string; roles: Option[]; t: D["team"]; crud: D["crud"]; label: string }) {
  const [state, action, pending] = useActionState<CrudState, FormData>(updateMemberRole, undefined);
  return (
    <form action={action} className="flex items-center gap-2">
      <input type="hidden" name="_id" value={id} />
      <select name="role" defaultValue={role} aria-label={label} className="h-8 rounded-lg border border-line-strong bg-surface-1 px-2 text-xs outline-none focus:border-blue">
        {roles.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}
      </select>
      <button type="submit" disabled={pending} className="rounded-lg px-2 py-1 text-xs font-medium text-blue-300 hover:bg-blue/10 hover:text-white disabled:opacity-50">
        {pending ? <Loader2 className="size-3.5 animate-spin" aria-label={crud.saving} /> : t.updateRole}
      </button>
      <span aria-live="polite" className="text-xs">
        {state?.ok && <span className="text-blue-300">✓</span>}
        {state?.error && <span className="text-yellow">{crud[state.error]}</span>}
      </span>
    </form>
  );
}
