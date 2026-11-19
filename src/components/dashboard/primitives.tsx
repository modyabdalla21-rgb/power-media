import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export function PageHeader({ title, description, actions }: { title: string; description?: string; actions?: ReactNode }) {
  return (
    <div className="flex flex-col gap-4 border-b border-line pb-6 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">{title}</h1>
        {description && <p className="mt-1.5 text-sm text-ink-muted">{description}</p>}
      </div>
      {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
    </div>
  );
}

export function StatCard({ label, value, icon: Icon, hint, accent = "blue" }: { label: string; value: string; icon: LucideIcon; hint?: string; accent?: "blue" | "energy" }) {
  return (
    <div className="surface-card p-5">
      <div className="flex items-center justify-between">
        <p className="text-sm text-ink-muted">{label}</p>
        <span className={cn("inline-flex size-8 items-center justify-center rounded-lg", accent === "blue" ? "bg-blue/15 text-blue-300" : "bg-orange/15 text-yellow")}>
          <Icon className="size-4" aria-hidden />
        </span>
      </div>
      <p className="mt-4 text-3xl font-bold tabular-nums tracking-tight">{value}</p>
      {hint && <p className="mt-1 text-xs text-ink-subtle">{hint}</p>}
    </div>
  );
}

export function EmptyState({ icon: Icon, title, body, action, className }: { icon: LucideIcon; title: string; body?: string; action?: ReactNode; className?: string }) {
  return (
    <div className={cn("flex flex-col items-center justify-center px-6 py-14 text-center", className)}>
      <span className="relative inline-flex size-14 items-center justify-center rounded-2xl border border-blue/25 bg-blue/10 text-blue-300">
        <span aria-hidden className="absolute inset-0 rounded-2xl bg-blue/20 blur-xl" />
        <Icon className="relative size-6" aria-hidden />
      </span>
      <h2 className="mt-5 font-semibold">{title}</h2>
      {body && <p className="mt-1.5 max-w-sm text-sm leading-relaxed text-ink-muted">{body}</p>}
      {action && <div className="mt-6">{action}</div>}
    </div>
  );
}

export function Panel({ title, children, className, actions }: { title: string; children: ReactNode; className?: string; actions?: ReactNode }) {
  return (
    <section className={cn("surface-card overflow-hidden", className)}>
      <header className="flex items-center justify-between border-b border-line px-5 py-4">
        <h2 className="text-sm font-semibold">{title}</h2>
        {actions}
      </header>
      {children}
    </section>
  );
}

/** Table shell with header columns; renders `empty` when there are no rows. */
export function DataTable({ columns, rows, empty }: { columns: string[]; rows: ReactNode[][]; empty: ReactNode }) {
  return (
    <div className="surface-card overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[640px] text-sm">
          <thead className="border-b border-line bg-white/[0.02]">
            <tr>
              {columns.map((c) => (
                <th key={c} scope="col" className="px-5 py-3 text-start text-xs font-semibold uppercase tracking-wider text-ink-subtle">{c}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {rows.map((r, i) => (
              <tr key={i} className="hover:bg-white/[0.02]">
                {r.map((cell, j) => <td key={j} className="px-5 py-3.5">{cell}</td>)}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {rows.length === 0 && <div className="border-t border-line">{empty}</div>}
    </div>
  );
}
