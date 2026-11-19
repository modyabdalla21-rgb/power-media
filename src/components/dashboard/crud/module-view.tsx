import Link from "next/link";
import { redirect } from "next/navigation";
import { AlertCircle, SearchX } from "lucide-react";
import { EmptyState, PageHeader } from "@/components/dashboard/primitives";
import { ConfirmDelete } from "@/components/dashboard/crud/delete-button";
import { RecordDialog } from "@/components/dashboard/crud/record-dialog";
import { renderCell } from "@/components/dashboard/crud/record-table";
import { ModuleToolbar } from "@/components/dashboard/crud/toolbar";
import type { ClientField, RecordValues } from "@/components/dashboard/crud/types";
import { moduleIcons } from "@/config/dashboard";
import { can, modulePath, type ModuleDef, type RelationSource } from "@/config/modules";
import { localizedHref, type Locale } from "@/i18n/config";
import type { Dictionary } from "@/i18n/dictionaries/en";
import { deleteRecord } from "@/lib/crud/actions";
import { PAGE_SIZE, listRecords, loadRelationOptions, type Row } from "@/lib/crud/queries";
import { fill, formatNumber } from "@/lib/format";
import { createSupabaseServerClient, getCurrentProfile } from "@/lib/supabase/server";
import { cn } from "@/lib/utils";

/** Serializable client-form fields for a module (relation options resolved). */
export function clientFields(def: ModuleDef, dict: Dictionary, relations: Partial<Record<RelationSource, { value: string; label: string }[]>>): ClientField[] {
  const opts = dict.dashboard.options;
  return def.fields.map((f) => ({
    column: f.column,
    label: dict.dashboard.fields[f.label],
    type: f.type,
    required: !!f.required,
    options:
      f.type === "select" ? (f.options ?? []).map((v) => ({ value: v, label: opts[v] }))
      : f.type === "boolean" ? [{ value: "false", label: opts.no }, { value: "true", label: opts.yes }]
      : f.relation ? relations[f.relation] ?? []
      : [],
    min: f.min,
    max: f.max,
    readOnly: !!f.readOnly,
    hideOnCreate: !!f.hideOnCreate,
    wide: !!f.wide,
    defaultValue: f.defaultValue ?? (f.type === "date" && f.required ? new Date().toISOString().slice(0, 10) : undefined),
  }));
}


const toValues = (row: Row, fields: ClientField[]): RecordValues & { id: string } => {
  const out: RecordValues & { id: string } = { id: row.id };
  for (const f of fields) {
    const v = row[f.column];
    out[f.column] = v === null || v === undefined ? "" : String(v);
  }
  return out;
};

/**
 * Generic, config-driven CRUD view (see src/config/modules.ts): list with
 * search, filter and pagination plus create/edit/delete per role.
 */
export async function ModuleView({ def, locale, dict, searchParams }: {
  def: ModuleDef;
  locale: Locale;
  dict: Dictionary;
  searchParams: Record<string, string | string[] | undefined>;
}) {
  const m = dict.dashboard.modules[def.key];
  const t = dict.dashboard.crud;
  const Icon = moduleIcons[def.key];

  const profile = await getCurrentProfile();
  const supabase = await createSupabaseServerClient();

  // Preview mode (no Supabase): show the shell with an honest notice.
  if (!supabase || !profile) {
    return (
      <div className="space-y-6">
        <PageHeader title={m.title} description={m.description} />
        <div className="surface-card"><EmptyState icon={Icon} title={m.emptyTitle} body={t.notConfigured} /></div>
      </div>
    );
  }
  if (!can(profile.role, def.roles.view)) redirect(localizedHref(locale, "/dashboard"));

  const sp = searchParams;
  const q = typeof sp.q === "string" ? sp.q : "";
  const status = typeof sp.status === "string" ? sp.status : "";
  const page = Math.max(1, Number(sp.page) || 1);

  const canCreate = can(profile.role, def.roles.create);
  const canUpdate = can(profile.role, def.roles.update);
  const canDelete = can(profile.role, def.roles.delete);
  const canWrite = canCreate || canUpdate;

  const relationSources = def.fields.flatMap((f) => (f.relation ? [f.relation] : [])) as RelationSource[];
  const [{ rows, error, count }, relations] = await Promise.all([
    listRecords(supabase, def, { q, status, page }),
    canWrite ? loadRelationOptions(supabase, relationSources) : Promise.resolve({} as Awaited<ReturnType<typeof loadRelationOptions>>),
  ]);

  const opts = dict.dashboard.options;
  const fields = clientFields(def, dict, relations);

  const basePath = modulePath(def);
  const pages = Math.max(1, Math.ceil(count / PAGE_SIZE));
  const pageHref = (p: number) => {
    const s = new URLSearchParams();
    if (q) s.set("q", q);
    if (status) s.set("status", status);
    if (p > 1) s.set("page", String(p));
    return `${localizedHref(locale, basePath)}${s.size ? `?${s}` : ""}`;
  };
  const filtered = !!(q || status);
  const showActions = canUpdate || canDelete;

  return (
    <div className="space-y-6">
      <PageHeader
        title={m.title}
        description={m.description}
        actions={
          canCreate && (
            <RecordDialog
              moduleKey={def.key}
              title={`${t.createTitle} — ${m.title}`}
              fields={fields}
              t={t}
              triggerVariant="create"
              triggerLabel={m.action}
            />
          )
        }
      />

      <ModuleToolbar statuses={def.filter.options.map((v) => ({ value: v, label: opts[v] }))} placeholder={dict.dashboard.search} t={t} />

      <div className="surface-card overflow-hidden">
        {error ? (
          <EmptyState icon={AlertCircle} title={t.loadError} body={error.message} />
        ) : rows.length === 0 ? (
          filtered ? (
            <EmptyState icon={SearchX} title={t.noResults} action={<Link href={localizedHref(locale, basePath)} className="text-sm font-medium text-blue-300 hover:text-white">{t.clearFilters}</Link>} />
          ) : (
            <EmptyState icon={Icon} title={m.emptyTitle} body={m.emptyBody} />
          )
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] text-sm">
              <thead className="border-b border-line bg-white/[0.02]">
                <tr>
                  {def.columns.map((c) => (
                    <th key={c.label + c.kind} scope="col" className="px-5 py-3 text-start text-xs font-semibold uppercase tracking-wider text-ink-subtle">
                      {dict.dashboard.fields[c.label]}
                    </th>
                  ))}
                  {showActions && <th scope="col" className="px-5 py-3 text-end text-xs font-semibold uppercase tracking-wider text-ink-subtle"><span className="sr-only">{t.actions}</span></th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {rows.map((row) => (
                  <tr key={row.id} className="transition-colors hover:bg-white/[0.02]">
                    {def.columns.map((c) => (
                      <td key={c.label + c.kind} className="px-5 py-3.5 align-middle">{renderCell(c, row, dict, locale, localizedHref(locale, `${basePath}/${row.id}`))}</td>
                    ))}
                    {showActions && (
                      <td className="px-5 py-3.5 text-end">
                        <div className="inline-flex items-center gap-1">
                          {canUpdate && (
                            <RecordDialog
                              moduleKey={def.key}
                              title={`${t.editTitle} — ${m.title}`}
                              fields={fields}
                              values={toValues(row, fields)}
                              t={t}
                              triggerVariant="edit"
                              triggerLabel={t.edit}
                            />
                          )}
                          {canDelete && <ConfirmDelete action={deleteRecord} hidden={{ _module: def.key, _id: row.id }} t={t} />}
                        </div>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {count > 0 && (
        <nav className="flex items-center justify-between gap-4 text-sm text-ink-muted" aria-label="Pagination">
          <span>{fill(t.total, { count: formatNumber(count, locale) })}</span>
          <div className="flex items-center gap-2">
            <Link aria-disabled={page <= 1} href={pageHref(page - 1)} className={cn("rounded-lg border border-line-strong px-3 py-1.5 hover:text-white", page <= 1 && "pointer-events-none opacity-40")}>{t.previous}</Link>
            <span className="tabular-nums">{fill(t.pageOf, { page, pages })}</span>
            <Link aria-disabled={page >= pages} href={pageHref(page + 1)} className={cn("rounded-lg border border-line-strong px-3 py-1.5 hover:text-white", page >= pages && "pointer-events-none opacity-40")}>{t.next}</Link>
          </div>
        </nav>
      )}
    </div>
  );
}
