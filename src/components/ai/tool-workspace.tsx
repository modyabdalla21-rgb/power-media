"use client";
import Link from "next/link";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { AlertCircle, Check, CheckCircle2, Copy, ExternalLink, Info, Loader2, RotateCcw, Sparkles } from "lucide-react";
import { Markdown } from "@/components/ai/markdown";
import { IdentityConceptsView } from "@/components/brand/identity-view";
import { UpgradeModal, type LimitInfo } from "@/components/client/upgrade-modal";
import type { BrandIdentity } from "@/lib/ai/identity";
import { Button } from "@/components/ui/button";
import { Input, Label, Select, Textarea } from "@/components/ui/form";
import type { Dictionary } from "@/i18n/dictionaries/en";
import { cn } from "@/lib/utils";

export type ClientToolField = {
  name: string;
  type: "text" | "textarea" | "select" | "number" | "date" | "client" | "project";
  required: boolean;
  label: string;
  placeholder?: string;
  options: { value: string; label: string; clientId?: string }[];
  defaultValue?: string;
  max?: number;
  wide?: boolean;
};

type T = Dictionary["dashboard"]["ai"];
type ErrorCode = keyof T["errors"];
type State =
  | { kind: "idle" }
  | { kind: "loading" }
  | { kind: "done"; text: string; id: string | null; truncated: boolean; language: string; identity: BrandIdentity | null }
  | { kind: "error"; code: ErrorCode; retryAfter?: number };

/**
 * Generic POWER AI tool UI: brief form → POST /api/ai/[slug] → rendered
 * output. The server validates, generates, saves to the AI library and
 * returns only normalised error codes.
 */
export function ToolWorkspace({ slug, fields, t, d, libraryHref, languageField, mode = "markdown", brandNote, brandHref, canApply }: {
  slug: string;
  fields: ClientToolField[];
  t: T;
  d: Dictionary["dashboard"];
  libraryHref: string;
  languageField: string;
  /** "identity": structured brand identity with apply-as-brand-kit actions. */
  mode?: "markdown" | "identity";
  /** e.g. "Using your active brand kit: …" (clients). */
  brandNote?: { text: string; warn?: boolean } | null;
  brandHref?: string;
  canApply?: boolean;
}) {
  const crud = d.crud;
  const [limit, setLimit] = useState<LimitInfo | null>(null);
  const [state, setState] = useState<State>({ kind: "idle" });
  const [fieldErrors, setFieldErrors] = useState<Record<string, "required" | "invalid">>({});
  const [copied, setCopied] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [clientId, setClientId] = useState(fields.find((f) => f.type === "client")?.defaultValue ?? "");
  const outputRef = useRef<HTMLElement>(null);

  useEffect(() => {
    if (state.kind !== "loading") return;
    const started = Date.now();
    const timer = setInterval(() => setElapsed(Math.floor((Date.now() - started) / 1000)), 1000);
    return () => clearInterval(timer);
  }, [state.kind]);

  const mainFields = fields.filter((f) => f.type !== "client" && f.type !== "project");
  const linkFields = fields.filter((f) => f.type === "client" || f.type === "project");
  const linksRequired = linkFields.some((f) => f.required);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const inputs = Object.fromEntries(fields.map((f) => [f.name, String(fd.get(f.name) ?? "").trim()]));
    const missing = Object.fromEntries(fields.filter((f) => f.required && !inputs[f.name]).map((f) => [f.name, "required" as const]));
    setFieldErrors(missing);
    if (Object.keys(missing).length) return setState({ kind: "error", code: "invalidInput" });

    setElapsed(0);
    setState({ kind: "loading" });
    outputRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
    try {
      const res = await fetch(`/api/ai/${slug}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ inputs }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok && typeof data.text === "string") {
        setState({ kind: "done", text: data.text, id: data.id ?? null, truncated: !!data.truncated, language: data.language ?? inputs[languageField] ?? "en", identity: data.identity ?? null });
        return;
      }
      if (data.code === "planLimit") setLimit({ tier: data.tier ?? "free", quota: data.quota === "identity" ? "identity" : "ai", limit: Number(data.limit) || 0 });
      if (data.fields) setFieldErrors(data.fields);
      // A platform-level timeout (e.g. Vercel 504) returns no JSON code.
      const code: ErrorCode =
        data.code && data.code in t.errors ? data.code : res.status === 504 || res.status === 408 ? "timeout" : "unknown";
      setState({ kind: "error", code, retryAfter: typeof data.retryAfter === "number" ? data.retryAfter : undefined });
    } catch {
      setState({ kind: "error", code: "network" });
    }
  }

  async function copy(text: string) {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch {
      /* clipboard blocked — ignore */
    }
  }

  const id = (n: string) => `${slug}-${n}`;
  const renderField = (f: ClientToolField) => {
    const err = fieldErrors[f.name];
    const common = {
      id: id(f.name),
      name: f.name,
      required: f.required,
      "aria-invalid": err ? true : undefined,
      "aria-describedby": err ? `${id(f.name)}-err` : undefined,
    };
    let control;
    if (f.type === "textarea") {
      control = <Textarea {...common} placeholder={f.placeholder} rows={f.wide ? 4 : 3} maxLength={4000} defaultValue={f.defaultValue} />;
    } else if (f.type === "select") {
      control = (
        <Select {...common} defaultValue={f.defaultValue ?? ""}>
          {f.required ? null : <option key="" value="">{t.selectNone}</option>}
          {f.options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
        </Select>
      );
    } else if (f.type === "client") {
      control = (
        <Select {...common} value={clientId} onChange={(e) => setClientId(e.target.value)}>
          <option key="" value="">{f.required ? "—" : t.selectNone}</option>
          {f.options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
        </Select>
      );
    } else if (f.type === "project") {
      const visible = clientId ? f.options.filter((o) => o.clientId === clientId) : f.options;
      control = (
        <Select {...common} key={clientId} defaultValue="">
          <option key="" value="">{t.selectNone}</option>
          {visible.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
        </Select>
      );
    } else {
      control = (
        <Input
          {...common}
          type={f.type === "number" ? "number" : f.type === "date" ? "date" : "text"}
          min={f.type === "number" ? 1 : undefined}
          step={f.type === "number" ? "any" : undefined}
          dir={f.type === "number" ? "ltr" : undefined}
          className={f.type === "number" ? "rtl:text-end" : undefined}
          placeholder={f.placeholder}
          maxLength={f.type === "text" ? f.max ?? 300 : undefined}
          defaultValue={f.defaultValue}
        />
      );
    }
    return (
      <div key={f.name} className={cn(f.wide && "sm:col-span-2")}>
        <Label htmlFor={id(f.name)} required={f.required}>{f.label}</Label>
        {control}
        {err && <p id={`${id(f.name)}-err`} className="mt-1 text-xs text-yellow">{err === "required" ? crud.required : crud.invalid}</p>}
      </div>
    );
  };

  const loading = state.kind === "loading";
  const outputDir = state.kind === "done" && state.language.startsWith("ar") ? "rtl" : "ltr";

  return (
    <div className="grid gap-6 xl:grid-cols-5">
      <form onSubmit={onSubmit} className="surface-card space-y-5 p-6 xl:col-span-2 xl:self-start" noValidate>
        <h2 className="text-sm font-semibold">{t.inputTitle}</h2>
        {brandNote && (
          <p className={brandNote.warn ? "flex items-start gap-2 rounded-lg border border-orange/30 bg-orange/10 p-2.5 text-xs text-yellow" : "flex items-start gap-2 rounded-lg border border-blue/25 bg-blue/10 p-2.5 text-xs text-blue-300"}>
            <Info className="mt-0.5 size-3.5 shrink-0" aria-hidden />
            {brandHref ? <Link href={brandHref} className="hover:underline">{brandNote.text}</Link> : brandNote.text}
          </p>
        )}
        {linksRequired && <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-1">{linkFields.map(renderField)}</div>}
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-1 2xl:grid-cols-2">{mainFields.map(renderField)}</div>
        {!linksRequired && linkFields.length > 0 && (
          <fieldset className="rounded-xl border border-line p-4">
            <legend className="px-1 text-xs font-semibold uppercase tracking-wider text-ink-subtle">{t.linkTitle}</legend>
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-1 2xl:grid-cols-2">{linkFields.map(renderField)}</div>
          </fieldset>
        )}
        {linksRequired && (
          <p className="flex items-start gap-2 text-xs leading-relaxed text-ink-subtle">
            <Info className="mt-0.5 size-3.5 shrink-0" aria-hidden />
            {t.contextNote}
          </p>
        )}
        <Button type="submit" variant="energy" size="lg" className="w-full" disabled={loading}>
          {loading ? <Loader2 className="size-4 animate-spin" aria-hidden /> : state.kind === "done" ? <RotateCcw className="size-4" aria-hidden /> : <Sparkles className="size-4" aria-hidden />}
          {loading ? t.generating : state.kind === "done" ? t.regenerate : t.generate}
        </Button>
      </form>

      <section ref={outputRef} className="surface-card flex min-h-[28rem] scroll-mt-24 flex-col xl:sticky xl:top-24 xl:col-span-3 xl:max-h-[calc(100dvh-7.5rem)] xl:self-start xl:overflow-y-auto" aria-live="polite" aria-busy={loading}>
        <header className="flex flex-wrap items-center justify-between gap-2 border-b border-line px-6 py-4">
          <h2 className="text-sm font-semibold">{t.outputTitle}</h2>
          {state.kind === "done" && (
            <div className="flex items-center gap-1">
              {state.id && (
                <Link href={`${libraryHref}/${state.id}`} className="inline-flex h-9 items-center gap-1.5 rounded-lg px-3 text-sm text-ink-muted hover:bg-white/5 hover:text-white">
                  <ExternalLink className="flip-rtl size-4" aria-hidden />
                  {t.openSaved}
                </Link>
              )}
              <Button variant="ghost" size="sm" onClick={() => copy(state.text)}>
                {copied ? <Check className="size-4" aria-hidden /> : <Copy className="size-4" aria-hidden />}
                {copied ? t.copied : t.copy}
              </Button>
            </div>
          )}
        </header>
        <div className="flex flex-1 flex-col p-6">
          {state.kind === "idle" && <p className="m-auto max-w-xs text-center text-sm text-ink-subtle">{t.outputEmpty}</p>}
          {loading && (
            <div className="space-y-4">
              <p className="flex items-center gap-2 text-sm text-ink-muted">
                <Loader2 className="size-4 animate-spin text-blue-300" aria-hidden />
                {t.generating} <span className="tabular-nums text-ink-subtle">{elapsed}s</span>
              </p>
              <p className="text-xs text-ink-subtle">{t.generatingHint}</p>
              <div className="space-y-3" aria-hidden>
                {[92, 70, 84, 60, 76].map((w) => <div key={w} className="h-3 animate-pulse rounded bg-white/5" style={{ width: `${w}%` }} />)}
              </div>
            </div>
          )}
          {state.kind === "error" && (
            <div role="alert" className="flex items-start gap-2 rounded-xl border border-orange/30 bg-orange/10 p-4 text-sm">
              <AlertCircle className="mt-0.5 size-4 shrink-0 text-yellow" aria-hidden />
              <span>
                {t.errors[state.code]}
                {state.retryAfter && state.retryAfter < 600 ? ` ${t.retryIn.replace("{seconds}", String(state.retryAfter))}` : ""}
                {state.code === "planLimit" && (
                  <button type="button" onClick={() => setLimit((l) => l ?? { tier: "free", quota: "ai", limit: 0 })} className="ms-2 font-semibold text-white underline underline-offset-2">
                    {d.plan.seePlans}
                  </button>
                )}
              </span>
            </div>
          )}
          {state.kind === "done" && (
            <div className="space-y-4">
              {state.id ? (
                <p className="flex items-center gap-2 text-xs text-blue-300"><CheckCircle2 className="size-3.5" aria-hidden />{t.saved}</p>
              ) : (
                <p className="flex items-start gap-2 text-xs text-yellow"><AlertCircle className="mt-0.5 size-3.5 shrink-0" aria-hidden />{t.notSaved}</p>
              )}
              {state.truncated && <p className="flex items-start gap-2 text-xs text-yellow"><AlertCircle className="mt-0.5 size-3.5 shrink-0" aria-hidden />{t.truncated}</p>}
              {mode === "identity" && state.identity ? (
                <IdentityConceptsView identity={state.identity} d={d} generationId={state.id} canApply={canApply && !!state.id} brandHref={brandHref} dir={outputDir} />
              ) : (
                <Markdown text={state.text} dir={outputDir} />
              )}
              <p className="border-t border-line pt-4 text-xs text-ink-subtle">{t.disclaimer}</p>
            </div>
          )}
        </div>
      </section>
      <UpgradeModal info={limit} d={d} onClose={() => setLimit(null)} />
    </div>
  );
}
