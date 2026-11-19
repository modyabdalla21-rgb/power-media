import { CircleCheck, CircleDashed } from "lucide-react";
import { PageHeader, Panel } from "@/components/dashboard/primitives";
import { isSupabaseConfigured } from "@/lib/env";
import { serverEnv } from "@/lib/env.server";
import { loadPage } from "@/lib/page";

export default async function SettingsPage({ params }: PageProps<"/[locale]/dashboard/settings">) {
  const { dict } = await loadPage(params);
  const s = dict.dashboard.settings;
  // Only booleans leave the server — never key values.
  const status = [
    { label: s.integrations.supabase, ok: isSupabaseConfigured },
    { label: s.integrations.ai, ok: !!(serverEnv.anthropicApiKey || serverEnv.openaiApiKey) },
    { label: s.integrations.payments, ok: !!serverEnv.stripeSecretKey },
  ];
  return (
    <div className="space-y-8">
      <PageHeader title={s.title} description={s.description} />
      <div className="grid gap-4 lg:grid-cols-3">
        <div className="grid gap-4 sm:grid-cols-2 lg:col-span-2">
          {s.sections.map((sec) => (
            <section key={sec.title} className="surface-card p-6">
              <h2 className="font-semibold">{sec.title}</h2>
              <p className="mt-1.5 text-sm leading-relaxed text-ink-muted">{sec.body}</p>
              <p className="mt-5 text-xs text-ink-subtle">{dict.dashboard.comingInPhase}</p>
            </section>
          ))}
        </div>
        <Panel title={s.integrationStatus}>
          <ul className="divide-y divide-line">
            {status.map((i) => (
              <li key={i.label} className="flex items-center justify-between gap-3 px-5 py-4 text-sm">
                <span>{i.label}</span>
                <span className={i.ok ? "inline-flex items-center gap-1.5 text-blue-300" : "inline-flex items-center gap-1.5 text-ink-subtle"}>
                  {i.ok ? <CircleCheck className="size-4" aria-hidden /> : <CircleDashed className="size-4" aria-hidden />}
                  {i.ok ? s.connected : s.notConnected}
                </span>
              </li>
            ))}
          </ul>
        </Panel>
      </div>
    </div>
  );
}
