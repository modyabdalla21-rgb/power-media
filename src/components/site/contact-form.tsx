"use client";
import { useState, type FormEvent } from "react";
import { CheckCircle2, AlertCircle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Field, Input, Select, Textarea } from "@/components/ui/form";
import type { Locale } from "@/i18n/config";
import type { Dictionary } from "@/i18n/dictionaries/en";

type Status = "idle" | "sending" | "success" | "notConfigured" | "error";

export function ContactForm({ locale, t, services, defaultService }: {
  locale: Locale;
  t: Dictionary["contact"]["form"];
  services: { value: string; label: string }[];
  defaultService?: string;
}) {
  const [status, setStatus] = useState<Status>("idle");

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const data = Object.fromEntries(new FormData(form)) as Record<string, string>;
    setStatus("sending");
    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...data, locale }),
      });
      if (res.ok) {
        setStatus("success");
        form.reset();
      } else setStatus(res.status === 503 ? "notConfigured" : "error");
    } catch {
      setStatus("error");
    }
  }

  const id = (n: string) => `contact-${n}`;

  return (
    <form onSubmit={onSubmit} className="surface-card grid gap-5 p-6 sm:grid-cols-2 sm:p-8" noValidate={false}>
      <Field label={t.name} htmlFor={id("name")} required>
        <Input id={id("name")} name="name" required minLength={2} maxLength={120} autoComplete="name" />
      </Field>
      <Field label={t.email} htmlFor={id("email")} required>
        <Input id={id("email")} name="email" type="email" required autoComplete="email" dir="ltr" />
      </Field>
      <Field label={t.phone} htmlFor={id("phone")}>
        <Input id={id("phone")} name="phone" type="tel" autoComplete="tel" dir="ltr" className="rtl:text-end" />
      </Field>
      <Field label={t.company} htmlFor={id("company")}>
        <Input id={id("company")} name="company" autoComplete="organization" />
      </Field>
      <Field label={t.country} htmlFor={id("country")}>
        <Select id={id("country")} name="country" defaultValue="">
          <option value="" disabled>{t.selectPlaceholder}</option>
          {t.countries.map((c) => <option key={c} value={c}>{c}</option>)}
        </Select>
      </Field>
      <Field label={t.budget} htmlFor={id("budget")}>
        <Select id={id("budget")} name="budget" defaultValue="">
          <option value="" disabled>{t.selectPlaceholder}</option>
          {t.budgets.map((b) => <option key={b} value={b}>{b}</option>)}
        </Select>
      </Field>
      <Field label={t.service} htmlFor={id("service")} className="sm:col-span-2">
        <Select id={id("service")} name="service" defaultValue={defaultService ?? ""}>
          <option value="" disabled>{t.selectPlaceholder}</option>
          {services.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
        </Select>
      </Field>
      <Field label={t.message} htmlFor={id("message")} required className="sm:col-span-2">
        <Textarea id={id("message")} name="message" required minLength={10} maxLength={4000} rows={5} />
      </Field>
      {/* Honeypot */}
      <div aria-hidden className="absolute -start-[9999px] h-0 w-0 overflow-hidden">
        <label htmlFor={id("website")}>Website</label>
        <input id={id("website")} name="website" tabIndex={-1} autoComplete="off" />
      </div>

      <div className="flex flex-col gap-4 sm:col-span-2 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-xs text-ink-subtle">{t.privacy}</p>
        <Button type="submit" size="lg" disabled={status === "sending"}>
          {status === "sending" && <Loader2 className="size-4 animate-spin" aria-hidden />}
          {status === "sending" ? t.sending : t.submit}
        </Button>
      </div>

      <div aria-live="polite" className="sm:col-span-2 empty:hidden">
        {status === "success" && (
          <p className="flex items-start gap-2 rounded-xl border border-blue/30 bg-blue/10 p-4 text-sm"><CheckCircle2 className="mt-0.5 size-4 shrink-0 text-blue-300" aria-hidden />{t.success}</p>
        )}
        {(status === "error" || status === "notConfigured") && (
          <p className="flex items-start gap-2 rounded-xl border border-orange/30 bg-orange/10 p-4 text-sm"><AlertCircle className="mt-0.5 size-4 shrink-0 text-yellow" aria-hidden />{status === "error" ? t.error : t.notConfigured}</p>
        )}
      </div>
    </form>
  );
}
