"use client";
import { useActionState, useEffect, useId, useRef, useState } from "react";
import { AlertCircle, Loader2, Plus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input, Label, Select, Textarea } from "@/components/ui/form";
import { saveRecord, type CrudState } from "@/lib/crud/actions";
import { cn } from "@/lib/utils";
import type { ClientField, CrudStrings, RecordValues } from "./types";

type Props = {
  moduleKey: string;
  title: string;
  fields: ClientField[];
  values?: RecordValues & { id: string };
  t: CrudStrings;
  /** "create" renders a primary button, "edit" a compact text button. */
  triggerVariant: "create" | "edit";
  triggerLabel: string;
  readOnlyView?: boolean;
};

/** Modal create/edit form backed by the generic `saveRecord` server action. */
export function RecordDialog({ triggerVariant, triggerLabel, ...props }: Props) {
  const ref = useRef<HTMLDialogElement>(null);
  const [session, setSession] = useState(0);
  const open = () => {
    setSession((s) => s + 1);
    ref.current?.showModal();
  };
  const close = () => ref.current?.close();

  return (
    <>
      {triggerVariant === "create" ? (
        <Button onClick={open}>
          <Plus className="size-4" aria-hidden />
          {triggerLabel}
        </Button>
      ) : (
        <button type="button" onClick={open} className="rounded-lg px-2.5 py-1.5 text-xs font-medium text-blue-300 hover:bg-blue/10 hover:text-white">
          {triggerLabel}
        </button>
      )}
      <dialog
        ref={ref}
        aria-labelledby={`dlg-${props.moduleKey}-${props.values?.id ?? "new"}`}
        className="m-auto max-h-[90dvh] w-[calc(100%-2rem)] max-w-2xl overflow-y-auto rounded-(--radius-card) border border-line-strong bg-surface-1 p-0 text-white shadow-(--shadow-card) backdrop:bg-navy/75 backdrop:backdrop-blur-sm"
      >
        {session > 0 && <RecordForm key={session} {...props} onDone={close} />}
      </dialog>
    </>
  );
}

function RecordForm({ moduleKey, title, fields, values, t, onDone, readOnlyView }: Omit<Props, "triggerVariant" | "triggerLabel"> & { onDone: () => void }) {
  const [state, action, pending] = useActionState<CrudState, FormData>(saveRecord, undefined);
  const uid = useId();
  const isEdit = !!values;

  useEffect(() => {
    if (state?.ok) onDone();
  }, [state, onDone]);

  const visible = fields.filter((f) => isEdit || !f.hideOnCreate);
  const fe = state?.fieldErrors ?? {};

  return (
    <form action={action} noValidate>
      <input type="hidden" name="_module" value={moduleKey} />
      {isEdit && <input type="hidden" name="_id" value={values.id} />}
      <header className="sticky top-0 z-10 flex items-center justify-between border-b border-line bg-surface-1/95 px-6 py-4 backdrop-blur">
        <h2 id={`dlg-${moduleKey}-${values?.id ?? "new"}`} className="font-semibold">{title}</h2>
        <button type="button" onClick={onDone} aria-label={t.close} className="inline-flex size-8 items-center justify-center rounded-lg text-ink-muted hover:bg-white/5 hover:text-white">
          <X className="size-4" aria-hidden />
        </button>
      </header>

      <div className="grid gap-4 px-6 py-6 sm:grid-cols-2">
        {visible.map((f) => {
          const id = `${uid}-${f.column}`;
          const err = fe[f.column];
          const disabled = f.readOnly || readOnlyView;
          const value = values?.[f.column] ?? f.defaultValue ?? "";
          const common = {
            id,
            name: f.column,
            defaultValue: value,
            disabled,
            required: f.required,
            "aria-invalid": err ? true : undefined,
            "aria-describedby": err ? `${id}-err` : undefined,
          };
          return (
            <div key={f.column} className={cn((f.wide || f.type === "textarea") && "sm:col-span-2")}>
              <Label htmlFor={id} required={f.required && !disabled}>{f.label}</Label>
              {f.type === "textarea" ? (
                <Textarea {...common} rows={f.readOnly ? 5 : 3} maxLength={4000} className={cn(disabled && "opacity-80")} />
              ) : f.type === "select" || f.type === "relation" ? (
                <Select {...common}>
                  <option value="">{t.select}</option>
                  {f.options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                </Select>
              ) : (
                <Input
                  {...common}
                  type={f.type === "number" ? "number" : f.type === "date" ? "date" : f.type === "email" ? "email" : f.type === "tel" ? "tel" : "text"}
                  min={f.min}
                  max={f.max}
                  step={f.type === "number" ? "any" : undefined}
                  dir={f.type === "email" || f.type === "tel" || f.type === "number" ? "ltr" : undefined}
                  className={cn(disabled && "opacity-80", (f.type === "email" || f.type === "tel" || f.type === "number") && "rtl:text-end")}
                />
              )}
              {err && <p id={`${id}-err`} className="mt-1 text-xs text-yellow">{err === "required" ? t.required : t.invalid}</p>}
            </div>
          );
        })}
      </div>

      <footer className="sticky bottom-0 flex flex-col-reverse gap-3 border-t border-line bg-surface-1/95 px-6 py-4 backdrop-blur sm:flex-row sm:items-center sm:justify-between">
        <div aria-live="polite" className="text-sm">
          {state?.error && (
            <p role="alert" className="flex items-start gap-2 text-yellow">
              <AlertCircle className="mt-0.5 size-4 shrink-0" aria-hidden />
              {t[state.error]}
            </p>
          )}
        </div>
        <div className="flex gap-2 sm:shrink-0">
          <Button type="button" variant="secondary" onClick={onDone}>{t.cancel}</Button>
          {!readOnlyView && (
            <Button type="submit" disabled={pending}>
              {pending && <Loader2 className="size-4 animate-spin" aria-hidden />}
              {pending ? t.saving : t.save}
            </Button>
          )}
        </div>
      </footer>
    </form>
  );
}
