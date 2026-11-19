import Link from "next/link";
import type { ReactNode } from "react";
import type { ColumnDef } from "@/config/modules";
import type { Locale } from "@/i18n/config";
import type { Dictionary } from "@/i18n/dictionaries/en";
import type { Row } from "@/lib/crud/queries";
import { formatDate, formatMoney } from "@/lib/format";
import { StatusBadge } from "./status-badge";

type Opts = Dictionary["dashboard"]["options"];
const opt = (options: Opts, v: unknown) => (typeof v === "string" && v in options ? options[v as keyof Opts] : typeof v === "string" ? v : "—");

const person = (v: unknown) => {
  const p = v as { full_name?: string | null; email?: string; name?: string } | null;
  return p?.name ?? p?.full_name ?? p?.email ?? "—";
};

export function renderCell(col: ColumnDef, row: Row, dict: Dictionary, locale: Locale, href?: string): ReactNode {
  const o = dict.dashboard.options;
  switch (col.kind) {
    case "text": {
      const v = row[col.column];
      const sec = col.secondary ? row[col.secondary] : null;
      return (
        <div className="max-w-[18rem]">
          {col.link && href ? (
            <Link href={href} className="block truncate font-medium text-white hover:text-blue-300">{(v as string) || "—"}</Link>
          ) : (
            <p className={col.strong ? "truncate font-medium text-white" : "line-clamp-2 text-ink-muted"}>{(v as string) || "—"}</p>
          )}
          {typeof sec === "string" && sec && <p className="truncate text-xs text-ink-subtle">{sec}</p>}
        </div>
      );
    }
    case "boolean":
      return row[col.column] ? <StatusBadge value="active" label={o.yes} /> : <span className="text-ink-subtle">{o.no}</span>;
    case "option":
      return <span className="text-ink-muted">{row[col.column] ? opt(o, row[col.column]) : "—"}</span>;
    case "badge": {
      const v = row[col.column];
      return typeof v === "string" ? <StatusBadge value={v} label={opt(o, v)} /> : "—";
    }
    case "money":
      return <span className="whitespace-nowrap tabular-nums" dir="ltr">{formatMoney(row[col.column], row[col.currencyColumn], locale)}</span>;
    case "date":
      return <span className="whitespace-nowrap text-ink-muted">{formatDate(row[col.column], locale)}</span>;
    case "dateRange": {
      const a = row[col.column], b = row[col.endColumn];
      if (!a && !b) return "—";
      return <span className="whitespace-nowrap text-ink-muted">{formatDate(a, locale)} – {formatDate(b, locale)}</span>;
    }
    case "relation":
      return <span className="text-ink-muted">{person(row[col.path])}</span>;
    case "progress": {
      const n = Math.max(0, Math.min(100, Number(row[col.column]) || 0));
      return (
        <div className="flex items-center gap-2">
          <div className="h-1.5 w-20 overflow-hidden rounded-full bg-white/10" role="progressbar" aria-valuenow={n} aria-valuemin={0} aria-valuemax={100}>
            <div className="h-full rounded-full bg-gradient-to-r from-blue to-blue-300" style={{ width: `${n}%` }} />
          </div>
          <span className="text-xs tabular-nums text-ink-subtle">{n}%</span>
        </div>
      );
    }
  }
}
