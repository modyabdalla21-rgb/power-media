"use client";
import { useActionState, useEffect, useRef, type ReactNode } from "react";
import { AlertCircle, Loader2, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { CrudState } from "@/lib/crud/actions";
import type { CrudStrings } from "./types";

type Action = (prev: CrudState, fd: FormData) => Promise<CrudState>;

/** Icon button that opens a confirmation dialog, then calls a server action. */
export function ConfirmDelete({ action, hidden, t, title, body, label, errorText }: {
  action: Action;
  hidden: Record<string, string>;
  t: CrudStrings;
  title?: string;
  body?: string;
  label?: string;
  errorText?: (state: CrudState) => ReactNode;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const [state, formAction, pending] = useActionState<CrudState, FormData>(action, undefined);
  useEffect(() => {
    if (state?.ok) ref.current?.close();
  }, [state]);

  return (
    <>
      <button
        type="button"
        onClick={() => ref.current?.showModal()}
        className="inline-flex size-8 items-center justify-center rounded-lg text-ink-subtle transition-colors hover:bg-orange/10 hover:text-yellow"
        aria-label={label ?? t.delete}
        title={label ?? t.delete}
      >
        <Trash2 className="size-4" aria-hidden />
      </button>
      <dialog ref={ref} className="m-auto w-[calc(100%-2rem)] max-w-md rounded-(--radius-card) border border-line-strong bg-surface-1 p-0 text-white backdrop:bg-navy/75 backdrop:backdrop-blur-sm">
        <form action={formAction} className="p-6">
          {Object.entries(hidden).map(([k, v]) => <input key={k} type="hidden" name={k} value={v} />)}
          <h2 className="font-semibold">{title ?? t.deleteTitle}</h2>
          <p className="mt-2 text-sm leading-relaxed text-ink-muted">{body ?? t.deleteBody}</p>
          {state?.error && (
            <p role="alert" className="mt-4 flex items-start gap-2 rounded-xl border border-orange/30 bg-orange/10 p-3 text-sm">
              <AlertCircle className="mt-0.5 size-4 shrink-0 text-yellow" aria-hidden />
              {errorText ? errorText(state) : t[state.error]}
            </p>
          )}
          <div className="mt-6 flex justify-end gap-2">
            <Button type="button" variant="secondary" onClick={() => ref.current?.close()}>{t.cancel}</Button>
            <Button type="submit" variant="energy" disabled={pending}>
              {pending && <Loader2 className="size-4 animate-spin" aria-hidden />}
              {pending ? t.deleting : (label ?? t.delete)}
            </Button>
          </div>
        </form>
      </dialog>
    </>
  );
}
