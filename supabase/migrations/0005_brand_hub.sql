-- ═══════════════════════════════════════════════════════════════════════
-- POWER MEDIA — Phase 5: AI-first Brand hub (analysis, plans, tasks)
--
-- Run AFTER 0001–0004. Idempotent: safe to paste into the Supabase SQL
-- Editor and run as a single script, any number of times.
--
-- • AI brand analyses and growth plans are stored as ai_generations
--   (tools 'brandAnalysis' / 'growthPlan') so they count toward plan
--   quotas and appear in the AI library.
-- • brand_plans: plans for a brand (AI-generated or manual).
-- • brand_tasks: actionable tasks for a brand, optionally within a plan.
-- Access: the brand's own client manages its plans/tasks; agency staff can
-- read everything (oversight), team can update, admins can delete.
-- ═══════════════════════════════════════════════════════════════════════

-- ── New AI tools ────────────────────────────────────────────────────────
alter table public.ai_generations drop constraint if exists ai_generations_tool_check;
alter table public.ai_generations add constraint ai_generations_tool_check
  check (tool in ('adStudio', 'mediaPlanner', 'reportGenerator', 'brandIdentity', 'brandAnalysis', 'growthPlan')) not valid;

drop policy if exists ai_generations_insert on public.ai_generations;
create policy ai_generations_insert on public.ai_generations for insert to authenticated
  with check (
    user_id = auth.uid() and (
      public.is_staff()
      or (
        public.auth_role() = 'client'
        and client_id is not null and public.is_client_of(client_id)
        and tool in ('adStudio', 'mediaPlanner', 'brandIdentity', 'brandAnalysis', 'growthPlan')
      )
    )
  );

-- ── brand_plans ─────────────────────────────────────────────────────────
create table if not exists public.brand_plans (
  id             uuid primary key default gen_random_uuid(),
  client_id      uuid not null references public.clients (id) on delete cascade,
  title          text not null check (char_length(title) between 1 and 200),
  goal           text check (char_length(goal) <= 1000),
  summary        text check (char_length(summary) <= 4000),
  horizon        text not null default '1m' check (horizon in ('2w', '1m', '3m')),
  status         text not null default 'active' check (status in ('active', 'completed', 'archived')),
  source         text not null default 'manual' check (source in ('ai', 'manual')),
  generation_id  uuid references public.ai_generations (id) on delete set null,
  created_by     uuid references public.profiles (id) on delete set null default auth.uid(),
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);
create index if not exists brand_plans_client_idx on public.brand_plans (client_id, status, created_at desc);

-- ── brand_tasks ─────────────────────────────────────────────────────────
create table if not exists public.brand_tasks (
  id            uuid primary key default gen_random_uuid(),
  client_id     uuid not null references public.clients (id) on delete cascade,
  plan_id       uuid references public.brand_plans (id) on delete cascade,
  project_id    uuid references public.projects (id) on delete set null,
  title         text not null check (char_length(title) between 1 and 200),
  details       text check (char_length(details) <= 2000),
  category      text not null default 'other' check (category in ('content', 'video', 'ads', 'social', 'brand', 'website', 'research', 'other')),
  priority      text not null default 'medium' check (priority in ('low', 'medium', 'high')),
  status        text not null default 'todo' check (status in ('todo', 'in_progress', 'done')),
  due_date      date,
  tool_hint     text check (tool_hint in ('adStudio', 'mediaPlanner', 'brandIdentity', 'growthPlan')),
  source        text not null default 'manual' check (source in ('ai', 'manual')),
  sort_order    int not null default 0,
  completed_at  timestamptz,
  created_by    uuid references public.profiles (id) on delete set null default auth.uid(),
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);
create index if not exists brand_tasks_client_idx on public.brand_tasks (client_id, status, created_at desc);
create index if not exists brand_tasks_plan_idx on public.brand_tasks (plan_id);

-- Keep links within one brand; stamp completion time.
create or replace function public.guard_brand_task() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.plan_id is not null and not exists (
    select 1 from public.brand_plans p where p.id = new.plan_id and p.client_id = new.client_id
  ) then
    raise exception 'Plan belongs to another brand' using errcode = '23514';
  end if;
  if new.project_id is not null and not exists (
    select 1 from public.projects p where p.id = new.project_id and p.client_id = new.client_id
  ) then
    raise exception 'Project belongs to another brand' using errcode = '23514';
  end if;
  if tg_op = 'UPDATE' then
    new.client_id  := old.client_id;
    new.created_by := old.created_by;
    new.created_at := old.created_at;
  end if;
  if new.status = 'done' and (tg_op = 'INSERT' or old.status <> 'done') then
    new.completed_at := now();
  elsif new.status <> 'done' then
    new.completed_at := null;
  end if;
  return new;
end $$;

drop trigger if exists guard_brand_task on public.brand_tasks;
create trigger guard_brand_task before insert or update on public.brand_tasks
  for each row execute function public.guard_brand_task();

create or replace function public.guard_brand_plan() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'UPDATE' then
    new.client_id     := old.client_id;
    new.source        := old.source;
    new.generation_id := old.generation_id;
    new.created_by    := old.created_by;
    new.created_at    := old.created_at;
  end if;
  return new;
end $$;

drop trigger if exists guard_brand_plan on public.brand_plans;
create trigger guard_brand_plan before update on public.brand_plans
  for each row execute function public.guard_brand_plan();

do $$
declare t text;
begin
  foreach t in array array['brand_plans', 'brand_tasks'] loop
    execute format('drop trigger if exists set_updated_at on public.%I', t);
    execute format('create trigger set_updated_at before update on public.%I for each row execute function public.set_updated_at()', t);
  end loop;
end $$;

-- ── Row Level Security ──────────────────────────────────────────────────
alter table public.brand_plans enable row level security;
alter table public.brand_tasks enable row level security;

do $$
declare t text;
begin
  foreach t in array array['brand_plans', 'brand_tasks'] loop
    execute format('drop policy if exists %I on public.%I', t || '_select', t);
    execute format('create policy %I on public.%I for select to authenticated using (public.is_staff() or public.is_client_of(client_id))', t || '_select', t);
    execute format('drop policy if exists %I on public.%I', t || '_insert', t);
    execute format('create policy %I on public.%I for insert to authenticated with check (public.is_staff() or public.is_client_of(client_id))', t || '_insert', t);
    execute format('drop policy if exists %I on public.%I', t || '_update', t);
    execute format('create policy %I on public.%I for update to authenticated using (public.is_staff() or public.is_client_of(client_id)) with check (public.is_staff() or public.is_client_of(client_id))', t || '_update', t);
    execute format('drop policy if exists %I on public.%I', t || '_delete', t);
    execute format('create policy %I on public.%I for delete to authenticated using (public.is_admin() or public.is_client_of(client_id))', t || '_delete', t);
  end loop;
end $$;

revoke all on public.brand_plans, public.brand_tasks from anon;
grant select, insert, update, delete on public.brand_plans, public.brand_tasks to authenticated;
