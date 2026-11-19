import { redirect } from "next/navigation";
import { Check } from "lucide-react";
import { UpgradeRequestForm } from "@/components/client/request-forms";
import { PageHeader, Panel } from "@/components/dashboard/primitives";
import { Badge } from "@/components/ui/badge";
import { PLAN_TIERS } from "@/config/plans";
import { localizedHref } from "@/i18n/config";
import { getClientWorkspace, getUsage } from "@/lib/client/workspace";
import { fill, formatDate } from "@/lib/format";
import { loadPage } from "@/lib/page";
import { createSupabaseServerClient, getCurrentProfile } from "@/lib/supabase/server";
import { cn } from "@/lib/utils";

export async function generateMetadata({ params }: PageProps<"/[locale]/dashboard/plan">) {
  const { dict } = await loadPage(params);
  return { title: dict.dashboard.plan.title };
}

export default async function PlanPage({ params }: PageProps<"/[locale]/dashboard/plan">) {
  const { locale, dict } = await loadPage(params);
  const profile = await getCurrentProfile();
  const workspace = await getClientWorkspace();
  const supabase = await createSupabaseServerClient();
  if (!profile || !workspace || !supabase) redirect(localizedHref(locale, "/dashboard"));
  const d = dict.dashboard;
  const p = d.plan;

  const [usage, { count: pending }] = await Promise.all([
    getUsage(supabase, profile.id, workspace),
    supabase.from("client_requests").select("id", { count: "exact", head: true }).eq("client_id", workspace.id).eq("kind", "upgrade").eq("status", "new"),
  ]);
  const meters = [
    { label: p.aiGenerations, ...usage.ai },
    { label: p.identityGenerations, ...usage.identity },
  ];

  return (
    <div className="space-y-8">
      <PageHeader title={p.title} description={p.subtitle} />
      <div className="grid gap-6 lg:grid-cols-3">
        <Panel title={p.usageTitle} className="lg:col-span-2" actions={<Badge tone="blue">{p.current}: {p.tiers[usage.tier].name}</Badge>}>
          <div className="space-y-5 p-5">
            {meters.map((m) => {
              const pct = Math.min(100, Math.round((m.used / Math.max(1, m.limit)) * 100));
              return (
                <div key={m.label}>
                  <div className="flex items-baseline justify-between text-sm">
                    <span>{m.label}</span>
                    <span className={cn("tabular-nums", pct >= 100 ? "text-yellow" : "text-ink-muted")}>{fill(p.usageOf, { used: m.used, limit: m.limit })}</span>
                  </div>
                  <div className="mt-2 h-2 overflow-hidden rounded-full bg-white/10" role="progressbar" aria-label={m.label} aria-valuenow={m.used} aria-valuemin={0} aria-valuemax={m.limit}>
                    <div className={cn("h-full rounded-full", pct >= 100 ? "bg-gradient-to-r from-yellow to-orange" : "bg-gradient-to-r from-blue to-blue-300")} style={{ width: `${pct}%` }} />
                  </div>
                </div>
              );
            })}
            <p className="text-xs text-ink-subtle">{fill(p.resets, { date: formatDate(usage.resetsAt, locale) })}</p>
          </div>
        </Panel>
        <div className="surface-card h-fit p-5">
          <h2 className="font-semibold">{p.requestTitle}</h2>
          <p className="mt-1 mb-4 text-sm text-ink-muted">{p.requestBody}</p>
          {usage.tier === "pro" ? <p className="text-sm text-blue-300">{p.tiers.pro.name} ✓</p> : <UpgradeRequestForm d={d} defaultTier={usage.tier === "growth" ? "pro" : "growth"} pending={(pending ?? 0) > 0} />}
        </div>
      </div>

      <ul className="grid gap-4 md:grid-cols-3">
        {PLAN_TIERS.map((tier) => {
          const current = tier === usage.tier;
          return (
            <li key={tier} className={cn("surface-card flex flex-col p-6", current && "border-blue/50 bg-gradient-to-b from-blue/15 to-transparent")}>
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold">{p.tiers[tier].name}</h3>
                {current && <Badge tone="orange">{p.currentBadge}</Badge>}
              </div>
              <p className="mt-1 text-sm text-ink-muted">{p.tiers[tier].body}</p>
              <p className="mt-4 text-2xl font-bold">{p.tiers[tier].price}</p>
              <ul className="mt-4 flex-1 space-y-2 border-t border-line pt-4 text-sm">
                {p.tiers[tier].features.map((f) => <li key={f} className="flex items-start gap-2"><Check className="mt-0.5 size-4 shrink-0 text-blue" aria-hidden />{f}</li>)}
              </ul>
            </li>
          );
        })}
      </ul>
      <p className="text-center text-xs text-ink-subtle">{p.noPayment}</p>
    </div>
  );
}
