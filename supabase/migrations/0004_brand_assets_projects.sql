-- ═══════════════════════════════════════════════════════════════════════
-- POWER MEDIA — Phase 4b: uploaded brand assets + decision-ready projects
--
-- Run AFTER 0001–0003. Idempotent: safe to paste into the Supabase SQL
-- Editor and run as a single script, any number of times.
--
-- • Storage bucket "brand-assets" (PRIVATE). Files live under
--   <client_id>/<file>; only agency staff and that client can read/write.
-- • brand_assets: uploaded logos and visual references per client; a brand
--   kit can use an uploaded logo (brand_kits.logo_asset_id).
-- • projects: objective, deliverables, priority and a decision workflow
--   (pending / approved / changes requested / on hold), linked to the brand
--   kit in use. Clients can create and steer projects in their own
--   workspace; agency-only fields stay protected.
-- ═══════════════════════════════════════════════════════════════════════

-- ── Storage bucket ──────────────────────────────────────────────────────
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('brand-assets', 'brand-assets', false, 5242880,
        array['image/png', 'image/jpeg', 'image/webp', 'image/svg+xml', 'image/gif'])
on conflict (id) do update
  set public = false,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

/** True when the caller may access files under "<client_id>/…". */
create or replace function public.can_access_brand_path(path text) returns boolean
language plpgsql stable security definer set search_path = public as $$
declare
  folder text := split_part(coalesce(path, ''), '/', 1);
begin
  if folder !~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' then
    return false;
  end if;
  return public.is_staff() or public.is_client_of(folder::uuid);
end $$;
revoke execute on function public.can_access_brand_path(text) from anon, public;
grant execute on function public.can_access_brand_path(text) to authenticated;

drop policy if exists brand_assets_storage_select on storage.objects;
create policy brand_assets_storage_select on storage.objects for select to authenticated
  using (bucket_id = 'brand-assets' and public.can_access_brand_path(name));
drop policy if exists brand_assets_storage_insert on storage.objects;
create policy brand_assets_storage_insert on storage.objects for insert to authenticated
  with check (bucket_id = 'brand-assets' and public.can_access_brand_path(name));
drop policy if exists brand_assets_storage_update on storage.objects;
create policy brand_assets_storage_update on storage.objects for update to authenticated
  using (bucket_id = 'brand-assets' and public.can_access_brand_path(name))
  with check (bucket_id = 'brand-assets' and public.can_access_brand_path(name));
drop policy if exists brand_assets_storage_delete on storage.objects;
create policy brand_assets_storage_delete on storage.objects for delete to authenticated
  using (bucket_id = 'brand-assets' and public.can_access_brand_path(name));

-- ── brand_assets ────────────────────────────────────────────────────────
create table if not exists public.brand_assets (
  id            uuid primary key default gen_random_uuid(),
  client_id     uuid not null references public.clients (id) on delete cascade,
  kind          text not null check (kind in ('logo', 'reference')),
  storage_path  text not null unique check (char_length(storage_path) <= 300),
  file_name     text check (char_length(file_name) <= 200),
  mime_type     text not null check (mime_type in ('image/png', 'image/jpeg', 'image/webp', 'image/svg+xml', 'image/gif')),
  size_bytes    int check (size_bytes between 1 and 5242880),
  caption       text check (char_length(caption) <= 300),
  created_by    uuid references public.profiles (id) on delete set null default auth.uid(),
  created_at    timestamptz not null default now(),
  -- A file must live in its own client's folder.
  constraint brand_assets_path_matches_client check (split_part(storage_path, '/', 1) = client_id::text)
);
create index if not exists brand_assets_client_idx on public.brand_assets (client_id, created_at desc);

alter table public.brand_assets enable row level security;
drop policy if exists brand_assets_select on public.brand_assets;
create policy brand_assets_select on public.brand_assets for select to authenticated
  using (public.is_staff() or public.is_client_of(client_id));
drop policy if exists brand_assets_write on public.brand_assets;
create policy brand_assets_write on public.brand_assets for all to authenticated
  using (public.is_staff() or public.is_client_of(client_id))
  with check (public.is_staff() or public.is_client_of(client_id));

alter table public.brand_kits add column if not exists logo_asset_id uuid references public.brand_assets (id) on delete set null;

-- A kit may only use a logo from its own client's assets.
create or replace function public.guard_brand_kit() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.logo_asset_id is not null and not exists (
    select 1 from public.brand_assets a where a.id = new.logo_asset_id and a.client_id = new.client_id
  ) then
    raise exception 'Logo asset belongs to another client' using errcode = '23514';
  end if;
  return new;
end $$;
drop trigger if exists guard_brand_kit on public.brand_kits;
create trigger guard_brand_kit before insert or update on public.brand_kits
  for each row execute function public.guard_brand_kit();

-- ── projects: decision support ─────────────────────────────────────────
alter table public.projects add column if not exists objective       text;
alter table public.projects add column if not exists deliverables    text;
alter table public.projects add column if not exists priority        text not null default 'medium';
alter table public.projects add column if not exists decision_status text not null default 'pending';
alter table public.projects add column if not exists decision_notes  text;
alter table public.projects add column if not exists decided_at      timestamptz;
alter table public.projects add column if not exists decided_by      uuid references public.profiles (id) on delete set null;
alter table public.projects add column if not exists brand_kit_id    uuid references public.brand_kits (id) on delete set null;
alter table public.projects add column if not exists created_by      uuid references public.profiles (id) on delete set null;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'projects_priority_check') then
    alter table public.projects add constraint projects_priority_check check (priority in ('low', 'medium', 'high', 'urgent'));
  end if;
  if not exists (select 1 from pg_constraint where conname = 'projects_decision_status_check') then
    alter table public.projects add constraint projects_decision_status_check
      check (decision_status in ('pending', 'approved', 'changes_requested', 'on_hold'));
  end if;
  if not exists (select 1 from pg_constraint where conname = 'projects_decision_text_len') then
    alter table public.projects add constraint projects_decision_text_len check (
      coalesce(char_length(objective), 0) <= 2000 and coalesce(char_length(deliverables), 0) <= 4000
      and coalesce(char_length(decision_notes), 0) <= 4000);
  end if;
end $$;
create index if not exists projects_decision_idx on public.projects (client_id, decision_status);

/**
 * Projects: clients may create and edit projects in their own workspace,
 * but agency-run fields (status, stage, progress, lead) stay staff-only.
 * Decisions are time-stamped; the brand kit must belong to the same client
 * (defaults to the client's active kit).
 */
create or replace function public.guard_project_write() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  is_agency boolean := auth.uid() is null or public.is_staff();
begin
  if tg_op = 'INSERT' then
    new.created_by := coalesce(new.created_by, auth.uid());
    if not is_agency then
      new.status := 'active';
      new.stage := 'discovery';
      new.progress := 0;
      new.lead_id := null;
      new.created_by := auth.uid();
    end if;
    if new.brand_kit_id is null then
      select id into new.brand_kit_id from public.brand_kits where client_id = new.client_id and is_active limit 1;
    end if;
    if new.decision_status <> 'pending' then
      new.decided_at := now();
      new.decided_by := auth.uid();
    end if;
  else
    if not is_agency then
      new.client_id  := old.client_id;
      new.status     := old.status;
      new.stage      := old.stage;
      new.progress   := old.progress;
      new.lead_id    := old.lead_id;
      new.created_by := old.created_by;
    end if;
    if new.decision_status is distinct from old.decision_status
       or new.decision_notes is distinct from old.decision_notes then
      new.decided_at := now();
      new.decided_by := auth.uid();
    else
      new.decided_at := old.decided_at;
      new.decided_by := old.decided_by;
    end if;
  end if;

  if new.brand_kit_id is not null and not exists (
    select 1 from public.brand_kits k where k.id = new.brand_kit_id and k.client_id = new.client_id
  ) then
    raise exception 'Brand kit belongs to another client' using errcode = '23514';
  end if;
  return new;
end $$;

drop trigger if exists guard_project_write on public.projects;
create trigger guard_project_write before insert or update on public.projects
  for each row execute function public.guard_project_write();

-- Client project rights (staff keep the existing projects_write policy).
drop policy if exists projects_client_insert on public.projects;
create policy projects_client_insert on public.projects for insert to authenticated
  with check (public.auth_role() = 'client' and public.is_client_of(client_id));
drop policy if exists projects_client_update on public.projects;
create policy projects_client_update on public.projects for update to authenticated
  using (public.auth_role() = 'client' and public.is_client_of(client_id))
  with check (public.auth_role() = 'client' and public.is_client_of(client_id));
drop policy if exists projects_client_delete on public.projects;
create policy projects_client_delete on public.projects for delete to authenticated
  using (public.auth_role() = 'client' and public.is_client_of(client_id) and created_by = auth.uid());

-- ── Grants ──────────────────────────────────────────────────────────────
revoke all on public.brand_assets from anon;
grant select, insert, update, delete on public.brand_assets to authenticated;
