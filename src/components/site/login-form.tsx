"use client";
import { useActionState } from "react";
import { AlertCircle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/form";
import { signIn, type SignInState } from "@/lib/auth/actions";
import type { Locale } from "@/i18n/config";
import type { Dictionary } from "@/i18n/dictionaries/en";

export function LoginForm({ locale, t, next, disabled }: { locale: Locale; t: Dictionary["auth"]; next?: string; disabled?: boolean }) {
  const [state, action, pending] = useActionState<SignInState, FormData>(signIn, undefined);
  return (
    <form action={action} className="space-y-5">
      <input type="hidden" name="locale" value={locale} />
      {next && <input type="hidden" name="next" value={next} />}
      <Field label={t.email} htmlFor="email" required>
        <Input id="email" name="email" type="email" autoComplete="email" required dir="ltr" disabled={disabled} />
      </Field>
      <Field label={t.password} htmlFor="password" required>
        <Input id="password" name="password" type="password" autoComplete="current-password" required minLength={6} dir="ltr" disabled={disabled} />
      </Field>
      {state?.error && (
        <p role="alert" className="flex items-start gap-2 rounded-xl border border-orange/30 bg-orange/10 p-3 text-sm">
          <AlertCircle className="mt-0.5 size-4 shrink-0 text-yellow" aria-hidden />
          {state.error === "invalid" ? t.invalid : t.notConfigured}
        </p>
      )}
      <Button type="submit" size="lg" className="w-full" disabled={pending || disabled}>
        {pending && <Loader2 className="size-4 animate-spin" aria-hidden />}
        {pending ? t.submitting : t.submit}
      </Button>
    </form>
  );
}
