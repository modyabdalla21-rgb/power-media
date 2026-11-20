import type { ReactNode } from "react";
import type { ColumnDef } from "@/config/modules";
import { localizedHref, type Locale } from "@/i18n/config";
import type { Dictionary } from "@/i18n/dictionaries/en";
import type { Row } from "@/lib/crud/queries";
import { renderCell } from "./record-table";

/** Mobile view of a module table: one stacked card per row — no sideways scrolling. */
export function RecordCards({ rows, columns, dict, locale, basePath, actions }: {
  rows: Row[];
  columns: readonly ColumnDef[];
  dict: Dictionary;
  locale: Locale;
  basePath: string;
  actions?: (row: Row) => ReactNode;
}) {
  return (
    <ul className="divide-y divide-line md:hidden">
      {rows.map((row) => {
        const [primary, ...rest] = columns;
        return (
          <li key={row.id} className="p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0 flex-1 break-words [&_*]:max-w-full [&_.truncate]:whitespace-normal" dir="auto">{renderCell(primary, row, dict, locale, localizedHref(locale, `${basePath}/${row.id}`))}</div>
              {actions && <div className="flex shrink-0 items-center gap-1">{actions(row)}</div>}
            </div>
            {rest.length > 0 && (
              <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2.5 text-sm">
                {rest.map((c) => (
                  <div key={c.label + c.kind} className="min-w-0">
                    <dt className="text-[11px] font-semibold uppercase tracking-wider text-ink-subtle">{dict.dashboard.fields[c.label]}</dt>
                    <dd className="mt-0.5 min-w-0 break-words [&_*]:max-w-full">{renderCell(c, row, dict, locale)}</dd>
                  </div>
                ))}
              </dl>
            )}
          </li>
        );
      })}
    </ul>
  );
}
