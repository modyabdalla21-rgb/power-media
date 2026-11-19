import { redirect } from "next/navigation";
import { CalendarCheck, Clock, Repeat, Wallet } from "lucide-react";
import { EmptyState, PageHeader, Panel } from "@/components/dashboard/primitives";
import { LinkButton } from "@/components/ui/button";
import { localizedHref } from "@/i18n/config";
import { formatMoney, intlLocale } from "@/lib/format";
import { loadPage } from "@/lib/page";
import { createSupabaseServerClient, getCurrentProfile } from "@/lib/supabase/server";

export async function generateMetadata({ params }: PageProps<"/[locale]/dashboard/revenue">) {
  const { dict } = await loadPage(params);
  return { title: dict.dashboard.revenue.title };
}

type Totals = Record<string, number>;
const add = (t: Totals, currency: string, amount: number) => ((t[currency] = (t[currency] ?? 0) + amount), t);

/** Revenue is derived from source records (retainers + invoices) — never entered twice. */
export default async function RevenuePage({ params }: PageProps<"/[locale]/dashboard/revenue">) {
  const { locale, dict } = await loadPage(params);
  const d = dict.dashboard;
  const t = d.revenue;
  const profile = await getCurrentProfile();
  const supabase = await createSupabaseServerClient();

  if (!supabase || !profile) {
    return (
      <div className="space-y-6">
        <PageHeader title={t.title} description={t.description} />
        <div className="surface-card"><EmptyState icon={Wallet} title={t.emptyTitle} body={d.crud.notConfigured} /></div>
      </div>
    );
  }
  if (profile.role !== "admin") redirect(localizedHref(locale, "/dashboard"));

  const yearStart = `${new Date().getUTCFullYear()}-01-01`;
  const since = new Date();
  since.setUTCMonth(since.getUTCMonth() - 11, 1);
  const sinceStr = since.toISOString().slice(0, 10);

  const [{ data: clients, error: cErr }, { data: invoices, error: iErr }] = await Promise.all([
    supabase.from("clients").select("retainer_amount, currency").eq("status", "active").not("retainer_amount", "is", null),
    supabase.from("invoices").select("amount, currency, status, issued_on, paid_on").in("status", ["paid", "sent", "overdue"]),
  ]);
  if (cErr || iErr) {
    return (
      <div className="space-y-6">
        <PageHeader title={t.title} description={t.description} />
        <div className="surface-card"><EmptyState icon={Wallet} title={d.crud.loadError} body={(cErr ?? iErr)?.message} /></div>
      </div>
    );
  }

  const mrr: Totals = {}, ytd: Totals = {}, outstanding: Totals = {};
  const months = new Map<string, Totals>();
  for (const c of clients ?? []) add(mrr, c.currency, Number(c.retainer_amount));
  for (const inv of invoices ?? []) {
    const amount = Number(inv.amount);
    if (inv.status === "paid") {
      const date: string = inv.paid_on ?? inv.issued_on;
      if (date >= yearStart) add(ytd, inv.currency, amount);
      if (date >= sinceStr) {
        const key = date.slice(0, 7);
        months.set(key, add(months.get(key) ?? {}, inv.currency, amount));
      }
    } else add(outstanding, inv.currency, amount);
  }

  const lines = (totals: Totals) => {
    const entries = Object.entries(totals).sort((a, b) => b[1] - a[1]);
    return entries.length ? entries.map(([cur, v]) => formatMoney(v, cur, locale)) : ["—"];
  };
  const cards = [
    { label: t.mrr, hint: t.mrrHint, icon: Repeat, values: lines(mrr) },
    { label: t.paidYtd, hint: t.paidYtdHint, icon: CalendarCheck, values: lines(ytd) },
    { label: t.outstanding, hint: t.outstandingHint, icon: Clock, values: lines(outstanding) },
  ];

  // Last 12 months, oldest first; bars scaled per currency.
  const monthKeys = Array.from({ length: 12 }, (_, i) => {
    const dt = new Date(since);
    dt.setUTCMonth(since.getUTCMonth() + i);
    return dt.toISOString().slice(0, 7);
  });
  const currencies = [...new Set([...months.values()].flatMap((m) => Object.keys(m)))];
  const maxBy = Object.fromEntries(currencies.map((c) => [c, Math.max(...monthKeys.map((k) => months.get(k)?.[c] ?? 0), 1)]));
  const monthLabel = (key: string) =>
    new Intl.DateTimeFormat(intlLocale(locale), { month: "short", year: "2-digit", timeZone: "UTC" }).format(new Date(`${key}-01T00:00:00Z`));
  const empty = !Object.keys(mrr).length && !Object.keys(ytd).length && !Object.keys(outstanding).length;

  return (
    <div className="space-y-8">
      <PageHeader
        title={t.title}
        description={t.description}
        actions={<LinkButton href={localizedHref(locale, "/dashboard/invoices")} variant="secondary">{t.manageInvoices}</LinkButton>}
      />
      <div className="grid gap-4 md:grid-cols-3">
        {cards.map((c) => (
          <div key={c.label} className="surface-card p-5">
            <div className="flex items-center justify-between">
              <p className="text-sm text-ink-muted">{c.label}</p>
              <span className="inline-flex size-8 items-center justify-center rounded-lg bg-blue/15 text-blue-300"><c.icon className="size-4" aria-hidden /></span>
            </div>
            <div className="mt-4 space-y-1" dir="ltr">
              {c.values.map((v, i) => (
                <p key={v + i} className={i === 0 ? "text-2xl font-bold tabular-nums tracking-tight rtl:text-end" : "text-sm tabular-nums text-ink-muted rtl:text-end"}>{v}</p>
              ))}
            </div>
            <p className="mt-2 text-xs text-ink-subtle">{c.hint}</p>
          </div>
        ))}
      </div>

      <Panel title={t.byMonth}>
        {empty || currencies.length === 0 ? (
          <EmptyState icon={Wallet} title={t.emptyTitle} body={t.emptyBody} />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[560px] text-sm">
              <thead className="border-b border-line bg-white/[0.02]">
                <tr>
                  <th scope="col" className="px-5 py-3 text-start text-xs font-semibold uppercase tracking-wider text-ink-subtle">{t.month}</th>
                  {currencies.map((c) => <th key={c} scope="col" className="px-5 py-3 text-start text-xs font-semibold uppercase tracking-wider text-ink-subtle">{c}</th>)}
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {monthKeys.map((k) => (
                  <tr key={k}>
                    <td className="whitespace-nowrap px-5 py-2.5 text-ink-muted">{monthLabel(k)}</td>
                    {currencies.map((c) => {
                      const v = months.get(k)?.[c] ?? 0;
                      return (
                        <td key={c} className="px-5 py-2.5">
                          <div className="flex items-center gap-3">
                            <div className="h-2 w-28 overflow-hidden rounded-full bg-white/5">
                              <div className="h-full rounded-full bg-gradient-to-r from-blue to-blue-300" style={{ width: `${(v / maxBy[c]) * 100}%` }} />
                            </div>
                            <span className="tabular-nums text-ink-muted" dir="ltr">{v ? formatMoney(v, c, locale) : "—"}</span>
                          </div>
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Panel>
    </div>
  );
}
