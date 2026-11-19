"use client";
import { useState, type FormEvent } from "react";
import { AlertCircle, Check, Copy, Loader2, PlugZap, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Field, Input, Select, Textarea } from "@/components/ui/form";
import type { Locale } from "@/i18n/config";
import type { Dictionary } from "@/i18n/dictionaries/en";

export type ClientField = {
  name: string;
  type: "text" | "textarea" | "select";
  required: boolean;
  label: string;
  placeholder?: string;
  options?: { value: string; label: string }[];
};

type State =
  | { kind: "idle" }
  | { kind: "loading" }
  | { kind: "done"; text: string }
  | { kind: "notConnected" }
  | { kind: "error"; message: string };

/**
 * Generic AI tool UI: brief form → POST /api/ai/[slug] → output panel.
 * The API returns 503/501 until a provider is connected (Phase 3); the UI
 * shows that state honestly instead of fabricating output.
 */
export function ToolWorkspace({ locale, slug, fields, t }: { locale: Locale; slug: string; fields: ClientField[]; t: Dictionary["dashboard"]["ai"] }) {
  const [state, setState] = useState<State>({ kind: "idle" });
  const [copied, setCopied] = useState(false);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const inputs = Object.fromEntries(fields.map((f) => [f.name, String(fd.get(f.name) ?? "")]));
    if (fields.some((f) => f.required && !inputs[f.name].trim())) {
      setState({ kind: "error", message: t.required });
      return;
    }
    setState({ kind: "loading" });
    try {
      const res = await fetch(`/api/ai/${slug}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ inputs, outputLanguage: fd.get("outputLanguage") ?? locale }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok && typeof data.text === "string") setState({ kind: "done", text: data.text });
      else if (res.status === 503 || res.status === 501) setState({ kind: "notConnected" });
      else setState({ kind: "error", message: res.status === 422 ? t.required : t.errorBody });
    } catch {
      setState({ kind: "error", message: t.errorBody });
    }
  }

  async function copy(text: string) {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 1600);
  }

  const id = (n: string) => `${slug}-${n}`;

  return (
    <div className="grid gap-6 xl:grid-cols-5">
      <form onSubmit={onSubmit} className="surface-card space-y-5 p-6 xl:col-span-2" noValidate>
        <h2 className="text-sm font-semibold">{t.inputTitle}</h2>
        {fields.map((f) => (
          <Field key={f.name} label={f.label} htmlFor={id(f.name)} required={f.required}>
            {f.type === "textarea" ? (
              <Textarea id={id(f.name)} name={f.name} placeholder={f.placeholder} rows={3} maxLength={4000} />
            ) : f.type === "select" ? (
              <Select id={id(f.name)} name={f.name} defaultValue="">
                <option value="">—</option>
                {f.options?.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
              </Select>
            ) : (
              <Input id={id(f.name)} name={f.name} placeholder={f.placeholder} maxLength={300} />
            )}
          </Field>
        ))}
        <Field label={t.outputLanguage} htmlFor={id("lang")}>
          <Select id={id("lang")} name="outputLanguage" defaultValue={locale}>
            <option value="en">English</option>
            <option value="ar">العربية</option>
          </Select>
        </Field>
        <Button type="submit" variant="energy" size="lg" className="w-full" disabled={state.kind === "loading"}>
          {state.kind === "loading" ? <Loader2 className="size-4 animate-spin" aria-hidden /> : <Sparkles className="size-4" aria-hidden />}
          {state.kind === "loading" ? t.generating : t.generate}
        </Button>
      </form>

      <section className="surface-card flex min-h-96 flex-col xl:col-span-3" aria-live="polite" aria-busy={state.kind === "loading"}>
        <header className="flex items-center justify-between border-b border-line px-6 py-4">
          <h2 className="text-sm font-semibold">{t.outputTitle}</h2>
          {state.kind === "done" && (
            <Button variant="ghost" size="sm" onClick={() => copy(state.text)}>
              {copied ? <Check className="size-4" aria-hidden /> : <Copy className="size-4" aria-hidden />}
              {copied ? t.copied : t.copy}
            </Button>
          )}
        </header>
        <div className="flex flex-1 flex-col p-6">
          {state.kind === "idle" && <p className="m-auto text-sm text-ink-subtle">{t.outputEmpty}</p>}
          {state.kind === "loading" && (
            <div className="space-y-3" aria-hidden>
              {[90, 75, 82, 60].map((w) => <div key={w} className="h-3 animate-pulse rounded bg-white/5" style={{ width: `${w}%` }} />)}
            </div>
          )}
          {state.kind === "done" && <div className="whitespace-pre-wrap text-sm leading-relaxed">{state.text}</div>}
          {state.kind === "notConnected" && (
            <div className="m-auto max-w-sm text-center">
              <span className="mx-auto inline-flex size-12 items-center justify-center rounded-2xl border border-orange/30 bg-orange/10 text-yellow">
                <PlugZap className="size-5" aria-hidden />
              </span>
              <h3 className="mt-4 font-semibold">{t.notConnectedTitle}</h3>
              <p className="mt-1.5 text-sm leading-relaxed text-ink-muted">{t.notConnectedBody}</p>
            </div>
          )}
          {state.kind === "error" && (
            <p role="alert" className="flex items-start gap-2 rounded-xl border border-orange/30 bg-orange/10 p-4 text-sm">
              <AlertCircle className="mt-0.5 size-4 shrink-0 text-yellow" aria-hidden />{state.message}
            </p>
          )}
        </div>
      </section>
    </div>
  );
}
