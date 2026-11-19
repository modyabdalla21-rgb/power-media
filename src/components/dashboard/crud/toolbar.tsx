"use client";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";
import { Loader2, Search, X } from "lucide-react";
import type { CrudStrings, Option } from "./types";

/** Search box + status filter, synced to the URL (?q=&status=). */
export function ModuleToolbar({ statuses, placeholder, t }: { statuses: Option[]; placeholder: string; t: CrudStrings }) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [pending, startTransition] = useTransition();
  const [q, setQ] = useState(params.get("q") ?? "");
  const status = params.get("status") ?? "";
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);

  const update = (next: { q?: string; status?: string }) => {
    const sp = new URLSearchParams(params.toString());
    for (const [k, v] of Object.entries(next)) {
      if (v) sp.set(k, v);
      else sp.delete(k);
    }
    sp.delete("page");
    startTransition(() => router.replace(`${pathname}${sp.size ? `?${sp}` : ""}`, { scroll: false }));
  };

  useEffect(() => () => clearTimeout(timer.current), []);

  const onSearch = (value: string) => {
    setQ(value);
    clearTimeout(timer.current);
    timer.current = setTimeout(() => update({ q: value.trim() }), 300);
  };

  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
      <div className="relative w-full sm:max-w-sm">
        <Search className="pointer-events-none absolute start-3 top-1/2 size-4 -translate-y-1/2 text-ink-subtle" aria-hidden />
        <input
          type="search"
          value={q}
          onChange={(e) => onSearch(e.target.value)}
          placeholder={placeholder}
          aria-label={placeholder}
          className="h-10 w-full rounded-(--radius-control) border border-line-strong bg-surface-1 ps-9 pe-3 text-sm placeholder:text-ink-subtle outline-none focus:border-blue focus:ring-2 focus:ring-blue/30"
        />
      </div>
      <select
        value={status}
        onChange={(e) => update({ status: e.target.value })}
        aria-label={t.allStatuses}
        className="h-10 rounded-(--radius-control) border border-line-strong bg-surface-1 px-3 text-sm outline-none focus:border-blue"
      >
        <option value="">{t.allStatuses}</option>
        {statuses.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
      </select>
      {(q || status) && (
        <button type="button" onClick={() => { setQ(""); update({ q: "", status: "" }); }} className="inline-flex h-10 items-center gap-1.5 rounded-lg px-3 text-sm text-ink-muted hover:bg-white/5 hover:text-white">
          <X className="size-4" aria-hidden />
          {t.clearFilters}
        </button>
      )}
      {pending && <Loader2 className="size-4 animate-spin text-blue-300" aria-label={t.loading} />}
    </div>
  );
}
