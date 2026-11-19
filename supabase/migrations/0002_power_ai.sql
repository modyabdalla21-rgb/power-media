-- ═══════════════════════════════════════════════════════════════════════
-- POWER MEDIA — Phase 3: POWER AI library
--
-- Run AFTER 0001_initial_schema.sql. Idempotent: safe to paste into the
-- Supabase SQL Editor and run as a single script, any number of times.
--
-- Access model for public.ai_generations:
--   admin  — sees, edits and deletes everything
--   team   — sees all agency generations; edits/deletes their own
--   client — sees only generations an agency member explicitly shared
--            with their client account (read-only)
-- ═══════════════════════════════════════════════════════════════════════

-- ── Columns ─────────────────────────────────────────────────────────────
alter table public.ai_generations add column if not exists title              text;
alter table public.ai_generations add column if not exists client_id          uuid references public.clients (id) on delete set null;
alter table public.ai_generations add column if not exists project_id         uuid references public.projects (id) on delete set null;
alter table public.ai_generations add column if not exists model              text;
alter table public.ai_generations add column if not exists language           text;
alter table public.ai_generations add column if not exists truncated          boolean not null default false;
alter table public.ai_generations add column if not exists shared_with_client boolean not null default false;
alter table public.ai_generations add column if not exists updated_at         timestamptz not null default now();

update public.ai_generations set title = coalesce(title, tool) where title is null;
alter table public.ai_generations alter column title set not null;
alter table public.ai_generations alter column user_id set default auth.uid();

-- Constraints (added only if missing)
do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'ai_generations_title_len') then
    alter table public.ai_generations add constraint ai_generations_title_len check (char_length(title) between 1 and 200);
  end if;
  if not exists (select 1 from pg_constraint where conname = 'ai_generations_tool_check') then
    alter table public.ai_generations add constraint ai_generations_tool_check
      check (tool in ('adStudio', 'mediaPlanner', 'reportGenerator')) not valid;
  end if;
  if not exists (select 1 from pg_constraint where conname = 'ai_generations_output_len') then
    alter table public.ai_generations add constraint ai_generations_output_len check (output is null or char_length(output) <= 100000);
  end if;
end $$;

create index if not exists ai_generations_user_created_idx on public.ai_generations (user_id, created_at desc);
create index if not exists ai_generations_client_idx       on public.ai_generations (client_id);
create index if not exists ai_generations_project_idx      on public.ai_generations (project_id);
create index if not exists ai_generations_created_idx      on public.ai_generations (created_at desc);

-- ── Triggers ────────────────────────────────────────────────────────────

drop trigger if exists set_updated_at on public.ai_generations;
create trigger set_updated_at before update on public.ai_generations
  for each row execute function public.set_updated_at();

-- Keep links consistent (a project implies its client) and keep the
-- generated content immutable after creation — only metadata may change.
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
    new.provider   := old.provider;
    new.model      := old.model;
    new.tokens_in  := old.tokens_in;
    new.tokens_out := old.tokens_out;
    new.created_at := old.created_at;
  end if;
  return new;
end $$;

drop trigger if exists guard_ai_generation on public.ai_generations;
create trigger guard_ai_generation
  before insert or update on public.ai_generations
  for each row execute function public.guard_ai_generation();

-- ── Row Level Security ──────────────────────────────────────────────────
alter table public.ai_generations enable row level security;

drop policy if exists ai_generations_own    on public.ai_generations;
drop policy if exists ai_generations_select on public.ai_generations;
drop policy if exists ai_generations_insert on public.ai_generations;
drop policy if exists ai_generations_update on public.ai_generations;
drop policy if exists ai_generations_delete on public.ai_generations;

create policy ai_generations_select on public.ai_generations for select to authenticated
  using (
    public.is_staff()
    or user_id = auth.uid()
    or (shared_with_client and client_id is not null and public.is_client_of(client_id))
  );

create policy ai_generations_insert on public.ai_generations for insert to authenticated
  with check (public.is_staff() and user_id = auth.uid());

create policy ai_generations_update on public.ai_generations for update to authenticated
  using (public.is_staff() and (user_id = auth.uid() or public.is_admin()))
  with check (public.is_staff());

create policy ai_generations_delete on public.ai_generations for delete to authenticated
  using (public.is_staff() and (user_id = auth.uid() or public.is_admin()));

revoke all on public.ai_generations from anon;
grant select, insert, update, delete on public.ai_generations to authenticated;
