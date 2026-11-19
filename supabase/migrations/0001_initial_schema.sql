-- POWER MEDIA — initial schema (draft for Phase 2).
-- Apply with: supabase db push   (or paste into the Supabase SQL editor)

create type public.user_role as enum ('admin', 'manager', 'specialist', 'client');
create type public.record_status as enum ('active', 'paused', 'completed', 'archived');
create type public.invoice_status as enum ('draft', 'sent', 'paid', 'overdue', 'void');
create type public.currency as enum ('EGP', 'SAR', 'AED', 'USD');

-- Profiles mirror auth.users and hold the role.
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  full_name text,
  role public.user_role not null default 'specialist',
  locale text not null default 'en' check (locale in ('en', 'ar')),
  created_at timestamptz not null default now()
);

create table public.clients (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  industry text,
  market text,
  status public.record_status not null default 'active',
  retainer_amount numeric(12,2),
  currency public.currency not null default 'USD',
  owner_id uuid references public.profiles (id),
  portal_user_id uuid references public.profiles (id), -- client login (Phase 4 portal)
  created_at timestamptz not null default now()
);

create table public.projects (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients (id) on delete cascade,
  name text not null,
  stage text not null default 'discovery',
  due_date date,
  progress smallint not null default 0 check (progress between 0 and 100),
  lead_id uuid references public.profiles (id),
  created_at timestamptz not null default now()
);

create table public.campaigns (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients (id) on delete cascade,
  name text not null,
  platform text not null,
  budget numeric(12,2),
  currency public.currency not null default 'USD',
  status public.record_status not null default 'active',
  starts_on date,
  ends_on date,
  created_at timestamptz not null default now()
);

create table public.tasks (
  id uuid primary key default gen_random_uuid(),
  project_id uuid references public.projects (id) on delete cascade,
  title text not null,
  assignee_id uuid references public.profiles (id),
  priority smallint not null default 2 check (priority between 1 and 4),
  due_date date,
  done boolean not null default false,
  created_at timestamptz not null default now()
);

create table public.invoices (
  id uuid primary key default gen_random_uuid(),
  number text unique not null,
  client_id uuid not null references public.clients (id),
  amount numeric(12,2) not null,
  currency public.currency not null,
  issued_on date not null default current_date,
  due_on date,
  status public.invoice_status not null default 'draft',
  created_at timestamptz not null default now()
);

-- Website contact form submissions.
create table public.leads (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  email text not null,
  phone text, company text, country text, service text, budget text,
  message text not null,
  locale text not null default 'en',
  source text not null default 'website_contact',
  created_at timestamptz not null default now()
);

-- POWER AI usage log (Phase 3).
create table public.ai_generations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  tool text not null,
  inputs jsonb not null,
  output text,
  provider text,
  tokens_in int, tokens_out int,
  created_at timestamptz not null default now()
);

-- ── Helpers ───────────────────────────────────────────────
create or replace function public.current_role() returns public.user_role
language sql stable security definer set search_path = public as $$
  select role from public.profiles where id = auth.uid()
$$;

create or replace function public.is_staff() returns boolean
language sql stable as $$ select public.current_role() in ('admin', 'manager', 'specialist') $$;

-- Auto-create a profile on sign-up.
create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, full_name) values (new.id, new.raw_user_meta_data ->> 'full_name');
  return new;
end $$;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

-- ── Row Level Security ────────────────────────────────────
alter table public.profiles enable row level security;
alter table public.clients enable row level security;
alter table public.projects enable row level security;
alter table public.campaigns enable row level security;
alter table public.tasks enable row level security;
alter table public.invoices enable row level security;
alter table public.leads enable row level security;
alter table public.ai_generations enable row level security;

create policy "own profile" on public.profiles for select using (id = auth.uid() or public.is_staff());
create policy "admin manages profiles" on public.profiles for update using (public.current_role() = 'admin');

create policy "staff read clients" on public.clients for select using (public.is_staff() or portal_user_id = auth.uid());
create policy "managers write clients" on public.clients for all using (public.current_role() in ('admin', 'manager'));

create policy "staff projects" on public.projects for all using (public.is_staff());
create policy "staff campaigns" on public.campaigns for all using (public.is_staff());
create policy "staff tasks" on public.tasks for all using (public.is_staff());
create policy "managers invoices" on public.invoices for all using (public.current_role() in ('admin', 'manager'));

-- Anyone may submit a lead; only staff can read them.
create policy "public insert leads" on public.leads for insert with check (true);
create policy "staff read leads" on public.leads for select using (public.is_staff());

create policy "own ai generations" on public.ai_generations for all using (user_id = auth.uid());
