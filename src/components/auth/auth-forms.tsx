"use client";
import Link from "next/link";
import { useActionState, type ReactNode } from "react";
import { AlertCircle, CheckCircle2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/form";
import { requestPasswordReset, signIn, signUp, updatePassword, type AuthState } from "@/lib/auth/actions";
import { localizedHref, type Locale } from "@/i18n/config";
import type { Dictionary } from "@/i18n/dictionaries/en";

type T = Dictionary["auth"];
type Props = { locale: Locale; t: T; disabled?: boolean };

function Message({ state, t, success }: { state: AuthState; t: T; success?: string }) {
  if (state?.error) {
    return (
      <p role="alert" className="flex items-start gap-2 rounded-xl border border-orange/30 bg-orange/10 p-3 text-sm">
        <AlertCircle className="mt-0.5 size-4 shrink-0 text-yellow" aria-hidden />
        {t[state.error]}
      </p>
    );
  }
  if (state?.ok && success) {
    return (
      <p role="status" className="flex items-start gap-2 rounded-xl border border-blue/30 bg-blue/10 p-3 text-sm">
        <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-blue-300" aria-hidden />
        {success}
      </p>
    );
  }
  return null;
}

function Submit({ pending, label, pendingLabel, disabled }: { pending: boolean; label: string; pendingLabel: string; disabled?: boolean }) {
  return (
    <Button type="submit" size="lg" className="w-full" disabled={pending || disabled}>
      {pending && <Loader2 className="size-4 animate-spin" aria-hidden />}
      {pending ? pendingLabel : label}
    </Button>
  );
}

function Hidden({ locale, children }: { locale: Locale; children?: ReactNode }) {
  return (
    <>
      <input type="hidden" name="locale" value={locale} />
      {children}
    </>
  );
}

export function SignInForm({ locale, t, disabled, next }: Props & { next?: string }) {
  const [state, action, pending] = useActionState<AuthState, FormData>(signIn, undefined);
  return (
    <form action={action} className="space-y-5">
      <Hidden locale={locale}>{next && <input type="hidden" name="next" value={next} />}</Hidden>
      <Field label={t.email} htmlFor="email" required>
        <Input id="email" name="email" type="email" autoComplete="email" required dir="ltr" disabled={disabled} />
      </Field>
      <div>
        <Field label={t.password} htmlFor="password" required>
          <Input id="password" name="password" type="password" autoComplete="current-password" required dir="ltr" disabled={disabled} />
        </Field>
        <Link href={localizedHref(locale, "/forgot-password")} className="mt-1 inline-flex min-h-10 items-center text-xs text-blue-300 hover:text-white">{t.forgotLink}</Link>
      </div>
      <Message state={state} t={t} />
      <Submit pending={pending} label={t.submit} pendingLabel={t.submitting} disabled={disabled} />
    </form>
  );
}

export function SignUpForm({ locale, t, disabled }: Props) {
  const [state, action, pending] = useActionState<AuthState, FormData>(signUp, undefined);
  if (state?.ok) return <Message state={state} t={t} success={t.signupSuccess} />;
  return (
    <form action={action} className="space-y-5">
      <Hidden locale={locale} />
      <Field label={t.fullName} htmlFor="fullName" required>
        <Input id="fullName" name="fullName" autoComplete="name" required minLength={2} maxLength={120} disabled={disabled} />
      </Field>
      <Field label={t.email} htmlFor="email" required>
        <Input id="email" name="email" type="email" autoComplete="email" required dir="ltr" disabled={disabled} />
      </Field>
      <div>
        <Field label={t.password} htmlFor="password" required>
          <Input id="password" name="password" type="password" autoComplete="new-password" required minLength={8} dir="ltr" aria-describedby="pw-hint" disabled={disabled} />
        </Field>
        <p id="pw-hint" className="mt-1.5 text-xs text-ink-subtle">{t.passwordHint}</p>
      </div>
      <Message state={state} t={t} />
      <Submit pending={pending} label={t.signupSubmit} pendingLabel={t.signupSubmitting} disabled={disabled} />
    </form>
  );
}

export function ForgotPasswordForm({ locale, t, disabled }: Props) {
  const [state, action, pending] = useActionState<AuthState, FormData>(requestPasswordReset, undefined);
  if (state?.ok) return <Message state={state} t={t} success={t.forgotSent} />;
  return (
    <form action={action} className="space-y-5">
      <Hidden locale={locale} />
      <Field label={t.email} htmlFor="email" required>
        <Input id="email" name="email" type="email" autoComplete="email" required dir="ltr" disabled={disabled} />
      </Field>
      <Message state={state} t={t} />
      <Submit pending={pending} label={t.forgotSubmit} pendingLabel={t.sending} disabled={disabled} />
    </form>
  );
}

export function ResetPasswordForm({ locale, t, disabled }: Props) {
  const [state, action, pending] = useActionState<AuthState, FormData>(updatePassword, undefined);
  return (
    <form action={action} className="space-y-5">
      <Hidden locale={locale} />
      <div>
        <Field label={t.newPassword} htmlFor="password" required>
          <Input id="password" name="password" type="password" autoComplete="new-password" required minLength={8} dir="ltr" aria-describedby="pw-hint" disabled={disabled} />
        </Field>
        <p id="pw-hint" className="mt-1.5 text-xs text-ink-subtle">{t.passwordHint}</p>
      </div>
      <Field label={t.confirmPassword} htmlFor="confirm" required>
        <Input id="confirm" name="confirm" type="password" autoComplete="new-password" required minLength={8} dir="ltr" disabled={disabled} />
      </Field>
      <Message state={state} t={t} />
      <Submit pending={pending} label={t.resetSubmit} pendingLabel={t.submitting} disabled={disabled} />
    </form>
  );
}
