import { redirect } from "next/navigation";
import { Mail, UsersRound } from "lucide-react";
import { EmptyState, PageHeader, Panel } from "@/components/dashboard/primitives";
import { ConfirmDelete } from "@/components/dashboard/crud/delete-button";
import { StatusBadge } from "@/components/dashboard/crud/status-badge";
import { InviteDialog, RoleForm } from "@/components/dashboard/team/team-forms";
import { localizedHref } from "@/i18n/config";
import { formatDate } from "@/lib/format";
import { loadPage } from "@/lib/page";
import { removeMember, revokeInvite } from "@/lib/team/actions";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSupabaseServerClient, getCurrentProfile } from "@/lib/supabase/server";

export async function generateMetadata({ params }: PageProps<"/[locale]/dashboard/team">) {
  const { dict } = await loadPage(params);
  return { title: dict.dashboard.team.title };
}

type Member = { id: string; email: string; full_name: string | null; role: "admin" | "team" | "client"; created_at: string };
type Invite = { id: string; email: string; role: Member["role"]; accepted_at: string | null; created_at: string };

export default async function TeamPage({ params }: PageProps<"/[locale]/dashboard/team">) {
  const { locale, dict } = await loadPage(params);
  const d = dict.dashboard;
  const t = d.team;
  const profile = await getCurrentProfile();
  const supabase = await createSupabaseServerClient();

  if (!supabase || !profile) {
    return (
      <div className="space-y-6">
        <PageHeader title={t.title} description={t.description} />
        <div className="surface-card"><EmptyState icon={UsersRound} title={t.noMembers} body={d.crud.notConfigured} /></div>
      </div>
    );
  }
  if (profile.role !== "admin") redirect(localizedHref(locale, "/dashboard"));

  const [{ data: members, error }, { data: invites }] = await Promise.all([
    supabase.from("profiles").select("id, email, full_name, role, created_at").order("created_at"),
    supabase.from("team_invites").select("id, email, role, accepted_at, created_at").order("created_at", { ascending: false }).limit(50),
  ]);
  const canRemove = !!createSupabaseAdminClient();
  const roles = (["admin", "team", "client"] as const).map((r) => ({ value: r, label: d.roles[r] }));

  return (
    <div className="space-y-8">
      <PageHeader
        title={t.title}
        description={t.description}
        actions={<InviteDialog locale={locale} t={t} crud={d.crud} roles={roles} emailLabel={d.fields.email} roleLabel={d.fields.role} />}
      />

      <Panel title={t.members}>
        {error ? (
          <EmptyState icon={UsersRound} title={d.crud.loadError} body={error.message} />
        ) : !members?.length ? (
          <EmptyState icon={UsersRound} title={t.noMembers} />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[680px] text-sm">
              <thead className="border-b border-line bg-white/[0.02]">
                <tr>
                  {[d.fields.name, d.fields.role, d.fields.joined].map((h) => (
                    <th key={h} scope="col" className="px-5 py-3 text-start text-xs font-semibold uppercase tracking-wider text-ink-subtle">{h}</th>
                  ))}
                  <th scope="col" className="px-5 py-3"><span className="sr-only">{d.crud.actions}</span></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {(members as Member[]).map((m) => {
                  const self = m.id === profile.id;
                  return (
                    <tr key={m.id}>
                      <td className="px-5 py-3.5">
                        <p className="font-medium">{m.full_name ?? m.email} {self && <span className="ms-1 text-xs text-yellow">({t.you})</span>}</p>
                        <p className="text-xs text-ink-subtle" dir="ltr">{m.email}</p>
                      </td>
                      <td className="px-5 py-3.5">
                        {self ? <StatusBadge value={m.role} label={d.roles[m.role]} /> : <RoleForm id={m.id} role={m.role} roles={roles} t={t} crud={d.crud} label={d.fields.role} />}
                      </td>
                      <td className="px-5 py-3.5 text-ink-muted">{formatDate(m.created_at, locale)}</td>
                      <td className="px-5 py-3.5 text-end">
                        {!self && canRemove && (
                          <ConfirmDelete action={removeMember} hidden={{ _id: m.id }} t={d.crud} title={t.removeTitle} body={t.removeBody} label={t.remove} />
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
        {!canRemove && <p className="border-t border-line px-5 py-3 text-xs text-ink-subtle">{t.removeUnavailable}</p>}
      </Panel>

      <Panel title={t.invites}>
        {!invites?.length ? (
          <EmptyState icon={Mail} title={t.noInvites} className="py-10" />
        ) : (
          <ul className="divide-y divide-line">
            {(invites as Invite[]).map((inv) => (
              <li key={inv.id} className="flex flex-wrap items-center justify-between gap-3 px-5 py-3.5 text-sm">
                <div>
                  <p className="font-medium" dir="ltr">{inv.email}</p>
                  <p className="text-xs text-ink-subtle">{d.roles[inv.role]} · {formatDate(inv.created_at, locale)}</p>
                </div>
                <div className="flex items-center gap-2">
                  <StatusBadge value={inv.accepted_at ? "active" : "draft"} label={inv.accepted_at ? t.accepted : t.pending} />
                  {!inv.accepted_at && <ConfirmDelete action={revokeInvite} hidden={{ _id: inv.id }} t={d.crud} label={t.revoke} />}
                </div>
              </li>
            ))}
          </ul>
        )}
      </Panel>
    </div>
  );
}
