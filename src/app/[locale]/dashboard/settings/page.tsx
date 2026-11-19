import { CircleCheck, CircleDashed } from "lucide-react";
import { PageHeader, Panel } from "@/components/dashboard/primitives";
import { ProfileForm } from "@/components/dashboard/profile-form";
import { StatusBadge } from "@/components/dashboard/crud/status-badge";
import { isSupabaseConfigured } from "@/lib/env";
import { serverEnv } from "@/lib/env.server";
import { loadPage } from "@/lib/page";
import { getCurrentProfile } from "@/lib/supabase/server";

export async function generateMetadata({ params }: PageProps<"/[locale]/dashboard/settings">) {
  const { dict } = await loadPage(params);
  return { title: dict.dashboard.settings.title };
}

export default async function SettingsPage({ params }: PageProps<"/[locale]/dashboard/settings">) {
  const { dict } = await loadPage(params);
  const d = dict.dashboard;
  const s = d.settings;
  const profile = await getCurrentProfile();
  // Only booleans leave the server — never key values.
  const status = [
    { label: s.integrations.supabase, ok: isSupabaseConfigured },
    { label: s.integrations.serviceKey, ok: !!serverEnv.supabaseServiceRoleKey },
    { label: s.integrations.ai, ok: !!(serverEnv.anthropicApiKey || serverEnv.openaiApiKey) },
    { label: s.integrations.payments, ok: !!serverEnv.stripeSecretKey },
  ];

  return (
    <div className="space-y-8">
      <PageHeader title={s.title} description={s.description} />
      {profile && (
        <Panel title={s.profileTitle} actions={<StatusBadge value={profile.role} label={d.roles[profile.role]} />}>
          <ProfileForm fullName={profile.full_name ?? ""} email={profile.email} locale={profile.locale} dict={d} />
          <p className="border-t border-line px-5 py-3 text-xs text-ink-subtle">{s.roleNote}</p>
        </Panel>
      )}
      {(profile?.role === "admin" || !profile) && (
        <div className="grid gap-4 lg:grid-cols-3">
          <div className="grid gap-4 sm:grid-cols-2 lg:col-span-2">
            {s.sections.map((sec) => (
              <section key={sec.title} className="surface-card p-6">
                <h2 className="font-semibold">{sec.title}</h2>
                <p className="mt-1.5 text-sm leading-relaxed text-ink-muted">{sec.body}</p>
                <p className="mt-5 text-xs text-ink-subtle">{d.comingInPhase}</p>
              </section>
            ))}
          </div>
          <Panel title={s.integrationStatus}>
            <ul className="divide-y divide-line">
              {status.map((i) => (
                <li key={i.label} className="flex items-center justify-between gap-3 px-5 py-4 text-sm">
                  <span>{i.label}</span>
                  <span className={i.ok ? "inline-flex shrink-0 items-center gap-1.5 text-blue-300" : "inline-flex shrink-0 items-center gap-1.5 text-ink-subtle"}>
                    {i.ok ? <CircleCheck className="size-4" aria-hidden /> : <CircleDashed className="size-4" aria-hidden />}
                    {i.ok ? s.connected : s.notConnected}
                  </span>
                </li>
              ))}
            </ul>
          </Panel>
        </div>
      )}
    </div>
  );
}
