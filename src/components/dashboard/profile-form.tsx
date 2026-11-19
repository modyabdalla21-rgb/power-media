"use client";
import { useActionState } from "react";
import { CheckCircle2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Field, Input, Select } from "@/components/ui/form";
import { updateOwnProfile, type ProfileState } from "@/lib/team/actions";
import type { Dictionary } from "@/i18n/dictionaries/en";

export function ProfileForm({ fullName, email, locale, dict }: { fullName: string; email: string; locale: "en" | "ar"; dict: Dictionary["dashboard"] }) {
  const [state, action, pending] = useActionState<ProfileState, FormData>(updateOwnProfile, undefined);
  return (
    <form action={action} className="grid gap-4 p-5 sm:grid-cols-2">
      <Field label={dict.fields.fullName} htmlFor="pf-name" required>
        <Input id="pf-name" name="full_name" defaultValue={fullName} required maxLength={120} autoComplete="name" />
      </Field>
      <Field label={dict.fields.email} htmlFor="pf-email">
        <Input id="pf-email" value={email} disabled dir="ltr" readOnly />
      </Field>
      <Field label={dict.fields.language} htmlFor="pf-locale">
        <Select id="pf-locale" name="locale" defaultValue={locale}>
          <option value="en">{dict.options.en}</option>
          <option value="ar">{dict.options.ar}</option>
        </Select>
      </Field>
      <div className="flex items-end justify-end gap-3 sm:col-span-2">
        <span aria-live="polite" className="text-sm">
          {state?.ok && <span className="inline-flex items-center gap-1.5 text-blue-300"><CheckCircle2 className="size-4" aria-hidden />{dict.settings.profileSaved}</span>}
          {state?.error && <span className="text-yellow">{dict.crud[state.error]}</span>}
        </span>
        <Button type="submit" disabled={pending}>
          {pending && <Loader2 className="size-4 animate-spin" aria-hidden />}
          {pending ? dict.crud.saving : dict.crud.save}
        </Button>
      </div>
    </form>
  );
}
