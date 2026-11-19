-- ═══════════════════════════════════════════════════════════════════════
-- POWER MEDIA — database schema (Phase 2)
--
-- Idempotent: safe to paste into the Supabase SQL Editor and run as a
-- single script, as many times as needed. Nothing here deletes data.
--
-- Roles (public.profiles.role):
--   admin  — full access, manages team, invoices and revenue
--   team   — agency staff: clients, projects, campaigns, tasks, reports, leads
--   client — portal access to their own client account (read-only)
-- New sign-ups are 'client' unless an admin invited them with another role.
-- ═══════════════════════════════════════════════════════════════════════

-- ── Tables ──────────────────────────────────────────────────────────────

create table if not exists public.profiles (
  id          uuid primary key references auth.users (id) on delete cascade,
  email       text not null,
  full_name   text,
  role        text not null default 'client' check (role in ('admin', 'team', 'client')),
  locale      text not null default 'en' check (locale in ('en', 'ar')),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create table if not exists public.team_invites (
  id           uuid primary key default gen_random_uuid(),
  email        text not null,
  role         text not null default 'team' check (role in ('admin', 'team', 'client')),
  invited_by   uuid references public.profiles (id) on delete set null,
  accepted_at  timestamptz,
  created_at   timestamptz not null default now()
);
create unique index if not exists team_invites_pending_email_idx
  on public.team_invites (lower(email)) where accepted_at is null;

create table if not exists public.clients (
  id               uuid primary key default gen_random_uuid(),
  name             text not null check (char_length(name) between 1 and 160),
  industry         text,
  market           text check (market in ('egypt', 'ksa', 'uae', 'gcc', 'other')),
  status           text not null default 'active' check (status in ('lead', 'active', 'paused', 'churned')),
  contact_name     text,
  contact_email    text,
  contact_phone    text,
  retainer_amount  numeric(12, 2) check (retainer_amount >= 0),
  currency         text not null default 'USD' check (currency in ('EGP', 'SAR', 'AED', 'USD')),
  owner_id         uuid references public.profiles (id) on delete set null,
  portal_user_id   uuid references public.profiles (id) on delete set null,
  notes            text,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

create table if not exists public.projects (
  id           uuid primary key default gen_random_uuid(),
  client_id    uuid not null references public.clients (id) on delete cascade,
  name         text not null check (char_length(name) between 1 and 160),
  stage        text not null default 'discovery' check (stage in ('discovery', 'strategy', 'production', 'launch', 'optimisation', 'completed')),
  status       text not null default 'active' check (status in ('active', 'on_hold', 'completed', 'cancelled')),
  due_date     date,
  progress     smallint not null default 0 check (progress between 0 and 100),
  lead_id      uuid references public.profiles (id) on delete set null,
  description  text,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create table if not exists public.campaigns (
  id          uuid primary key default gen_random_uuid(),
  client_id   uuid not null references public.clients (id) on delete cascade,
  name        text not null check (char_length(name) between 1 and 160),
  platform    text not null check (platform in ('meta', 'google', 'tiktok', 'snapchat', 'youtube', 'x', 'linkedin', 'other')),
  objective   text check (objective in ('awareness', 'traffic', 'leads', 'sales', 'app')),
  budget      numeric(12, 2) check (budget >= 0),
  currency    text not null default 'USD' check (currency in ('EGP', 'SAR', 'AED', 'USD')),
  status      text not null default 'draft' check (status in ('draft', 'active', 'paused', 'completed')),
  starts_on   date,
  ends_on     date,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  constraint campaigns_dates_check check (ends_on is null or starts_on is null or ends_on >= starts_on)
);

create table if not exists public.tasks (
  id           uuid primary key default gen_random_uuid(),
  project_id   uuid references public.projects (id) on delete cascade,
  title        text not null check (char_length(title) between 1 and 200),
  assignee_id  uuid references public.profiles (id) on delete set null,
  priority     text not null default 'medium' check (priority in ('low', 'medium', 'high', 'urgent')),
  status       text not null default 'todo' check (status in ('todo', 'in_progress', 'review', 'done')),
  due_date     date,
  notes        text,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create table if not exists public.reports (
  id            uuid primary key default gen_random_uuid(),
  client_id     uuid not null references public.clients (id) on delete cascade,
  title         text not null check (char_length(title) between 1 and 200),
  period_start  date,
  period_end    date,
  summary       text,
  status        text not null default 'draft' check (status in ('draft', 'published')),
  created_by    uuid references public.profiles (id) on delete set null default auth.uid(),
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create sequence if not exists public.invoice_number_seq;

create table if not exists public.invoices (
  id          uuid primary key default gen_random_uuid(),
  number      text not null unique default ('INV-' || to_char(now(), 'YYYY') || '-' || lpad(nextval('public.invoice_number_seq')::text, 4, '0')),
  client_id   uuid not null references public.clients (id) on delete restrict,
  amount      numeric(12, 2) not null check (amount >= 0),
  currency    text not null default 'USD' check (currency in ('EGP', 'SAR', 'AED', 'USD')),
  issued_on   date not null default current_date,
  due_on      date,
  paid_on     date,
  status      text not null default 'draft' check (status in ('draft', 'sent', 'paid', 'overdue', 'void')),
  notes       text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create table if not exists public.leads (
  id          uuid primary key default gen_random_uuid(),
  name        text not null check (char_length(name) between 2 and 120),
  email       text not null check (char_length(email) <= 200),
  phone       text,
  company     text,
  country     text,
  service     text,
  budget      text,
  message     text not null check (char_length(message) between 10 and 4000),
  locale      text not null default 'en' check (locale in ('en', 'ar')),
  source      text not null default 'website_contact',
  status      text not null default 'new' check (status in ('new', 'contacted', 'qualified', 'won', 'lost')),
  notes       text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create table if not exists public.ai_generations (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references public.profiles (id) on delete cascade,
  tool        text not null,
  inputs      jsonb not null,
  output      text,
  provider    text,
  tokens_in   int,
  tokens_out  int,
  created_at  timestamptz not null default now()
);

-- Helpful indexes
create index if not exists projects_client_idx   on public.projects (client_id);
create index if not exists campaigns_client_idx  on public.campaigns (client_id);
create index if not exists tasks_project_idx     on public.tasks (project_id);
create index if not exists tasks_assignee_idx    on public.tasks (assignee_id);
create index if not exists reports_client_idx    on public.reports (client_id);
create index if not exists invoices_client_idx   on public.invoices (client_id);
create index if not exists leads_created_idx     on public.leads (created_at desc);
create index if not exists clients_portal_idx    on public.clients (portal_user_id);

-- ── Helper functions (security definer → no RLS recursion) ─────────────

create or replace function public.auth_role() returns text
language sql stable security definer set search_path = public as $$
  select role from public.profiles where id = auth.uid()
$$;

create or replace function public.is_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce(public.auth_role() = 'admin', false)
$$;

create or replace function public.is_staff() returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce(public.auth_role() in ('admin', 'team'), false)
$$;

create or replace function public.is_client_of(target_client uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.clients c where c.id = target_client and c.portal_user_id = auth.uid())
$$;

-- updated_at maintenance
create or replace function public.set_updated_at() returns trigger
language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;

do $$
declare t text;
begin
  foreach t in array array['profiles', 'clients', 'projects', 'campaigns', 'tasks', 'reports', 'invoices', 'leads'] loop
    execute format('drop trigger if exists set_updated_at on public.%I', t);
    execute format('create trigger set_updated_at before update on public.%I for each row execute function public.set_updated_at()', t);
  end loop;
end $$;

-- ── Profile creation on sign-up ─────────────────────────────────────────
-- Role comes ONLY from a pending admin invite, never from user-supplied
-- sign-up metadata (which anyone could forge).

create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  invite public.team_invites%rowtype;
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
    case when new.raw_user_meta_data ->> 'locale' = 'ar' then 'ar' else 'en' end
  )
  on conflict (id) do nothing;

  if invite.id is not null then
    update public.team_invites set accepted_at = now() where id = invite.id;
  end if;
  return new;
end $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Backfill profiles for any users that existed before this script ran.
insert into public.profiles (id, email)
select u.id, coalesce(u.email, '') from auth.users u
on conflict (id) do nothing;

-- Only admins may change roles (the SQL Editor / service role, where
-- auth.uid() is null, is always allowed). Admins can't demote themselves.
create or replace function public.guard_profile_role() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.role is distinct from old.role and auth.uid() is not null then
    if not public.is_admin() then
      raise exception 'Only admins can change roles' using errcode = '42501';
    end if;
    if old.id = auth.uid() then
      raise exception 'Admins cannot change their own role' using errcode = '42501';
    end if;
  end if;
  if new.email is distinct from old.email and auth.uid() is not null then
    new.email = old.email;
  end if;
  return new;
end $$;

drop trigger if exists guard_profile_role on public.profiles;
create trigger guard_profile_role
  before update on public.profiles
  for each row execute function public.guard_profile_role();

-- ── Row Level Security ──────────────────────────────────────────────────

alter table public.profiles       enable row level security;
alter table public.team_invites   enable row level security;
alter table public.clients        enable row level security;
alter table public.projects       enable row level security;
alter table public.campaigns      enable row level security;
alter table public.tasks          enable row level security;
alter table public.reports        enable row level security;
alter table public.invoices       enable row level security;
alter table public.leads          enable row level security;
alter table public.ai_generations enable row level security;

-- profiles
drop policy if exists profiles_select on public.profiles;
create policy profiles_select on public.profiles for select to authenticated
  using (id = auth.uid() or public.is_staff());
drop policy if exists profiles_update on public.profiles;
create policy profiles_update on public.profiles for update to authenticated
  using (id = auth.uid() or public.is_admin())
  with check (id = auth.uid() or public.is_admin());

-- team_invites (admin only)
drop policy if exists team_invites_admin on public.team_invites;
create policy team_invites_admin on public.team_invites for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- clients
drop policy if exists clients_select on public.clients;
create policy clients_select on public.clients for select to authenticated
  using (public.is_staff() or portal_user_id = auth.uid());
drop policy if exists clients_insert on public.clients;
create policy clients_insert on public.clients for insert to authenticated with check (public.is_staff());
drop policy if exists clients_update on public.clients;
create policy clients_update on public.clients for update to authenticated
  using (public.is_staff()) with check (public.is_staff());
drop policy if exists clients_delete on public.clients;
create policy clients_delete on public.clients for delete to authenticated using (public.is_admin());

-- projects
drop policy if exists projects_select on public.projects;
create policy projects_select on public.projects for select to authenticated
  using (public.is_staff() or public.is_client_of(client_id));
drop policy if exists projects_write on public.projects;
create policy projects_write on public.projects for all to authenticated
  using (public.is_staff()) with check (public.is_staff());

-- campaigns
drop policy if exists campaigns_select on public.campaigns;
create policy campaigns_select on public.campaigns for select to authenticated
  using (public.is_staff() or public.is_client_of(client_id));
drop policy if exists campaigns_write on public.campaigns;
create policy campaigns_write on public.campaigns for all to authenticated
  using (public.is_staff()) with check (public.is_staff());

-- tasks (staff only)
drop policy if exists tasks_staff on public.tasks;
create policy tasks_staff on public.tasks for all to authenticated
  using (public.is_staff()) with check (public.is_staff());

-- reports (clients see published reports for their account)
drop policy if exists reports_select on public.reports;
create policy reports_select on public.reports for select to authenticated
  using (public.is_staff() or (status = 'published' and public.is_client_of(client_id)));
drop policy if exists reports_write on public.reports;
create policy reports_write on public.reports for all to authenticated
  using (public.is_staff()) with check (public.is_staff());

-- invoices (admin manages; clients see non-draft invoices for their account)
drop policy if exists invoices_select on public.invoices;
create policy invoices_select on public.invoices for select to authenticated
  using (public.is_admin() or (status <> 'draft' and public.is_client_of(client_id)));
drop policy if exists invoices_write on public.invoices;
create policy invoices_write on public.invoices for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- leads (anyone may submit a new lead; staff read & update; admin deletes)
drop policy if exists leads_insert on public.leads;
create policy leads_insert on public.leads for insert to anon, authenticated
  with check (status = 'new' and source = 'website_contact' and notes is null);
drop policy if exists leads_select on public.leads;
create policy leads_select on public.leads for select to authenticated using (public.is_staff());
drop policy if exists leads_update on public.leads;
create policy leads_update on public.leads for update to authenticated
  using (public.is_staff()) with check (public.is_staff());
drop policy if exists leads_delete on public.leads;
create policy leads_delete on public.leads for delete to authenticated using (public.is_admin());

-- ai_generations (own rows)
drop policy if exists ai_generations_own on public.ai_generations;
create policy ai_generations_own on public.ai_generations for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

-- ── Grants ──────────────────────────────────────────────────────────────
-- Anonymous visitors can only insert leads; everything else needs a session.
revoke all on all tables in schema public from anon;
grant insert on public.leads to anon;
grant select, insert, update, delete on all tables in schema public to authenticated;
grant usage on sequence public.invoice_number_seq to authenticated;
revoke execute on function public.handle_new_user() from anon, authenticated, public;
