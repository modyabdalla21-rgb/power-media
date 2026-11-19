-- ═══════════════════════════════════════════════════════════════════════
-- POWER MEDIA — Phase 4a: client self-serve, brand kits, plans & usage
--
-- Run AFTER 0001 and 0002. Idempotent: safe to paste into the Supabase SQL
-- Editor and run as a single script, any number of times.
--
-- • Every client user gets their own workspace (a public.clients row with
--   portal_user_id = the user) automatically on sign-up — no admin approval.
-- • Clients can edit only the brand fields of their own workspace; plan
--   tier, status, retainer and agency notes stay agency-controlled.
-- • brand_kits: brand identities (existing or AI-generated); one active per
--   client. AI tools use the active kit for consistent output.
-- • plan_tier (free / growth / pro) on the workspace; usage is counted from
--   ai_generations. client_requests: upgrade / brand-help requests.
-- ═══════════════════════════════════════════════════════════════════════

-- ── profiles: allow the Egyptian colloquial UI locale ──────────────────
alter table public.profiles drop constraint if exists profiles_locale_check;
alter table public.profiles add constraint profiles_locale_check check (locale in ('en', 'ar', 'eg'));

-- ── clients: brand profile, plan and self-serve metadata ───────────────
alter table public.clients add column if not exists audience     text;
alter table public.clients add column if not exists tone         text;
alter table public.clients add column if not exists dialect      text;
alter table public.clients add column if not exists website      text;
alter table public.clients add column if not exists brand_notes  text;
alter table public.clients add column if not exists plan_tier    text not null default 'free';
alter table public.clients add column if not exists source       text not null default 'agency';
alter table public.clients add column if not exists onboarded_at timestamptz;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'clients_plan_tier_check') then
    alter table public.clients add constraint clients_plan_tier_check check (plan_tier in ('free', 'growth', 'pro'));
  end if;
  if not exists (select 1 from pg_constraint where conname = 'clients_source_check') then
    alter table public.clients add constraint clients_source_check check (source in ('agency', 'self_serve'));
  end if;
  if not exists (select 1 from pg_constraint where conname = 'clients_dialect_check') then
    alter table public.clients add constraint clients_dialect_check check (dialect is null or dialect in ('en', 'ar_msa', 'ar_eg', 'ar_gulf'));
  end if;
  if not exists (select 1 from pg_constraint where conname = 'clients_brand_text_len') then
    alter table public.clients add constraint clients_brand_text_len check (
      coalesce(char_length(audience), 0) <= 2000 and coalesce(char_length(tone), 0) <= 300
      and coalesce(char_length(website), 0) <= 300 and coalesce(char_length(brand_notes), 0) <= 4000);
  end if;
end $$;

-- Agency-created clients are already set up; don't send them to onboarding.
update public.clients set onboarded_at = created_at where onboarded_at is null and source = 'agency';

-- ── Workspace provisioning ──────────────────────────────────────────────

create or replace function public.provision_client_workspace(uid uuid) returns uuid
language plpgsql security definer set search_path = public as $$
declare
  ws uuid;
  prof public.profiles%rowtype;
begin
  select id into ws from public.clients where portal_user_id = uid order by created_at limit 1;
  if ws is not null then return ws; end if;

  select * into prof from public.profiles where id = uid;
  if prof.id is null or prof.role <> 'client' then return null; end if;

  insert into public.clients (name, status, portal_user_id, source, plan_tier, contact_name, contact_email, dialect)
  values (
    coalesce(nullif(prof.full_name, ''), split_part(prof.email, '@', 1), 'My brand'),
    'lead', uid, 'self_serve', 'free', prof.full_name, nullif(prof.email, ''),
    case when prof.locale = 'eg' then 'ar_eg' when prof.locale = 'ar' then 'ar_msa' else null end
  )
  returning id into ws;
  return ws;
end $$;

/** Called by the app on login: returns the caller's workspace, creating it if needed. */
create or replace function public.ensure_client_workspace() returns uuid
language sql security definer set search_path = public as $$
  select public.provision_client_workspace(auth.uid())
$$;

revoke execute on function public.provision_client_workspace(uuid) from anon, authenticated, public;
revoke execute on function public.ensure_client_workspace() from anon, public;
grant execute on function public.ensure_client_workspace() to authenticated;

-- Sign-up trigger: create the profile (role from an admin invite only),
-- then a workspace for client users.
create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  invite public.team_invites%rowtype;
  meta_locale text := new.raw_user_meta_data ->> 'locale';
begin
  select * into invite from public.team_invites
   where lower(email) = lower(new.email) and accepted_at is null
   order by created_at desc limit 1;

  insert into public.profiles (id, email, full_name, role, locale)
  values (
    new.id,
    coalesce(new.email, ''),
    nullif(left(new.raw_user_meta_data ->> 'full_name', 120), ''),
    coalesce(invite.role, 'client'),
    case when meta_locale in ('ar', 'eg') then meta_locale else 'en' end
  )
  on conflict (id) do nothing;

  if invite.id is not null then
    update public.team_invites set accepted_at = now() where id = invite.id;
  end if;

  if coalesce(invite.role, 'client') = 'client' then
    perform public.provision_client_workspace(new.id);
  end if;
  return new;
end $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Backfill: workspaces for existing client users who don't have one.
select public.provision_client_workspace(p.id)
from public.profiles p
where p.role = 'client' and not exists (select 1 from public.clients c where c.portal_user_id = p.id);

-- Clients may edit their own workspace's brand fields only.
create or replace function public.guard_client_update() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is not null and not public.is_staff() then
    new.status          := old.status;
    new.plan_tier       := old.plan_tier;
    new.source          := old.source;
    new.retainer_amount := old.retainer_amount;
    new.currency        := old.currency;
    new.owner_id        := old.owner_id;
    new.portal_user_id  := old.portal_user_id;
    new.notes           := old.notes;
    new.created_at      := old.created_at;
    -- onboarded_at can be set once by the client, never cleared.
    new.onboarded_at    := coalesce(old.onboarded_at, new.onboarded_at);
  end if;
  return new;
end $$;

drop trigger if exists guard_client_update on public.clients;
create trigger guard_client_update before update on public.clients
  for each row execute function public.guard_client_update();

drop policy if exists clients_update_own on public.clients;
create policy clients_update_own on public.clients for update to authenticated
  using (portal_user_id = auth.uid()) with check (portal_user_id = auth.uid());

-- ── brand_kits ──────────────────────────────────────────────────────────

create table if not exists public.brand_kits (
  id             uuid primary key default gen_random_uuid(),
  client_id      uuid not null references public.clients (id) on delete cascade,
  name           text not null check (char_length(name) between 1 and 160),
  source         text not null default 'ai' check (source in ('ai', 'existing')),
  tagline        text check (char_length(tagline) <= 300),
  positioning    text check (char_length(positioning) <= 2000),
  palette        jsonb not null default '[]'::jsonb,
  typography     jsonb not null default '{}'::jsonb,
  voice          jsonb not null default '{}'::jsonb,
  logo_svg       text check (char_length(logo_svg) <= 12000),
  logo_url       text check (char_length(logo_url) <= 500),
  logo_prompt    text check (char_length(logo_prompt) <= 2000),
  notes          text check (char_length(notes) <= 4000),
  generation_id  uuid references public.ai_generations (id) on delete set null,
  is_active      boolean not null default false,
  created_by     uuid references public.profiles (id) on delete set null default auth.uid(),
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);
create unique index if not exists brand_kits_one_active_idx on public.brand_kits (client_id) where is_active;
create index if not exists brand_kits_client_idx on public.brand_kits (client_id, created_at desc);

drop trigger if exists set_updated_at on public.brand_kits;
create trigger set_updated_at before update on public.brand_kits
  for each row execute function public.set_updated_at();

alter table public.brand_kits enable row level security;
drop policy if exists brand_kits_select on public.brand_kits;
create policy brand_kits_select on public.brand_kits for select to authenticated
  using (public.is_staff() or public.is_client_of(client_id));
drop policy if exists brand_kits_write on public.brand_kits;
create policy brand_kits_write on public.brand_kits for all to authenticated
  using (public.is_staff() or public.is_client_of(client_id))
  with check (public.is_staff() or public.is_client_of(client_id));

/** Make one kit active for its client (atomically deactivates the others). */
create or replace function public.activate_brand_kit(kit uuid) returns void
language plpgsql security definer set search_path = public as $$
declare
  target uuid;
begin
  select client_id into target from public.brand_kits where id = kit;
  if target is null or not (public.is_staff() or public.is_client_of(target)) then
    raise exception 'Brand kit not found' using errcode = '42501';
  end if;
  update public.brand_kits set is_active = false where client_id = target and is_active and id <> kit;
  update public.brand_kits set is_active = true where id = kit;
end $$;
revoke execute on function public.activate_brand_kit(uuid) from anon, public;
grant execute on function public.activate_brand_kit(uuid) to authenticated;

-- ── ai_generations: client generations + structured data ───────────────

alter table public.ai_generations add column if not exists data jsonb;

alter table public.ai_generations drop constraint if exists ai_generations_tool_check;
alter table public.ai_generations add constraint ai_generations_tool_check
  check (tool in ('adStudio', 'mediaPlanner', 'reportGenerator', 'brandIdentity')) not valid;

-- Keep `data` immutable after creation, like the output.
create or replace function public.guard_ai_generation() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  project_client uuid;
begin
  if new.project_id is not null then
    select client_id into project_client from public.projects where id = new.project_id;
    if new.client_id is null then
      new.client_id := project_client;
    elsif project_client is distinct from new.client_id then
      raise exception 'Project does not belong to the selected client' using errcode = '23514';
    end if;
  end if;
  if new.client_id is null then
    new.shared_with_client := false;
  end if;

  if tg_op = 'UPDATE' and auth.uid() is not null then
    new.user_id    := old.user_id;
    new.tool       := old.tool;
    new.inputs     := old.inputs;
    new.output     := old.output;
    new.data       := old.data;
    new.provider   := old.provider;
    new.model      := old.model;
    new.tokens_in  := old.tokens_in;
    new.tokens_out := old.tokens_out;
    new.created_at := old.created_at;
  end if;
  return new;
end $$;

-- Clients may save their own generations for their own workspace (the app
-- enforces plan quotas before calling the AI provider).
drop policy if exists ai_generations_insert on public.ai_generations;
create policy ai_generations_insert on public.ai_generations for insert to authenticated
  with check (
    user_id = auth.uid() and (
      public.is_staff()
      or (
        public.auth_role() = 'client'
        and client_id is not null and public.is_client_of(client_id)
        and tool in ('adStudio', 'mediaPlanner', 'brandIdentity')
      )
    )
  );

-- Clients may delete their own generations; staff rules unchanged.
drop policy if exists ai_generations_delete on public.ai_generations;
create policy ai_generations_delete on public.ai_generations for delete to authenticated
  using (user_id = auth.uid() or public.is_admin());

create index if not exists ai_generations_client_month_idx on public.ai_generations (client_id, tool, created_at desc);

-- ── client_requests: upgrades & agency follow-up ───────────────────────

create table if not exists public.client_requests (
  id              uuid primary key default gen_random_uuid(),
  client_id       uuid not null references public.clients (id) on delete cascade,
  requested_by    uuid not null references public.profiles (id) on delete cascade default auth.uid(),
  kind            text not null check (kind in ('upgrade', 'brand_help', 'general')),
  requested_tier  text check (requested_tier in ('growth', 'pro')),
  message         text check (char_length(message) <= 2000),
  status          text not null default 'new' check (status in ('new', 'contacted', 'done')),
  notes           text check (char_length(notes) <= 4000),
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);
create index if not exists client_requests_created_idx on public.client_requests (created_at desc);

drop trigger if exists set_updated_at on public.client_requests;
create trigger set_updated_at before update on public.client_requests
  for each row execute function public.set_updated_at();

alter table public.client_requests enable row level security;
drop policy if exists client_requests_select on public.client_requests;
create policy client_requests_select on public.client_requests for select to authenticated
  using (public.is_staff() or requested_by = auth.uid());
drop policy if exists client_requests_insert on public.client_requests;
create policy client_requests_insert on public.client_requests for insert to authenticated
  with check (
    requested_by = auth.uid() and status = 'new' and notes is null
    and (public.is_staff() or public.is_client_of(client_id))
  );
drop policy if exists client_requests_update on public.client_requests;
create policy client_requests_update on public.client_requests for update to authenticated
  using (public.is_staff()) with check (public.is_staff());
drop policy if exists client_requests_delete on public.client_requests;
create policy client_requests_delete on public.client_requests for delete to authenticated
  using (public.is_admin());

-- ── Grants ──────────────────────────────────────────────────────────────
revoke all on public.brand_kits, public.client_requests from anon;
grant select, insert, update, delete on public.brand_kits, public.client_requests to authenticated;
