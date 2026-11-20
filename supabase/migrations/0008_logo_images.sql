-- ═══════════════════════════════════════════════════════════════════════
-- POWER MEDIA — Phase 8: AI logo images
--
-- Run AFTER 0001–0007. Idempotent: safe to paste into the Supabase SQL
-- Editor and run as a single script, any number of times.
--
-- • brand_logo_images: one rendered logo image (PNG/JPEG/WebP) per concept
--   of an AI brand-identity generation. Files live in the existing PRIVATE
--   "brand-assets" bucket under "<client_id>/…" (same storage policies), so
--   no new bucket is needed.
-- • Clients can read their brand's images and add images only for their
--   own identity generations; staff can manage all.
-- ═══════════════════════════════════════════════════════════════════════

create table if not exists public.brand_logo_images (
  id             uuid primary key default gen_random_uuid(),
  generation_id  uuid not null references public.ai_generations (id) on delete cascade,
  concept        smallint not null check (concept between 0 and 2),
  client_id      uuid not null references public.clients (id) on delete cascade,
  storage_path   text not null unique check (char_length(storage_path) <= 300),
  mime_type      text not null check (mime_type in ('image/png', 'image/jpeg', 'image/webp')),
  model          text check (char_length(model) <= 80),
  created_by     uuid references public.profiles (id) on delete set null default auth.uid(),
  created_at     timestamptz not null default now(),
  constraint brand_logo_images_one_per_concept unique (generation_id, concept),
  -- A file must live in its own client's folder.
  constraint brand_logo_images_path_matches_client check (split_part(storage_path, '/', 1) = client_id::text)
);
create index if not exists brand_logo_images_client_idx on public.brand_logo_images (client_id, created_at desc);

alter table public.brand_logo_images enable row level security;

drop policy if exists brand_logo_images_select on public.brand_logo_images;
create policy brand_logo_images_select on public.brand_logo_images for select to authenticated
  using (public.is_staff() or public.is_client_of(client_id));

-- Insert / update: only for an identity generation of the same client that
-- the caller can see and owns (staff: any).
drop policy if exists brand_logo_images_insert on public.brand_logo_images;
create policy brand_logo_images_insert on public.brand_logo_images for insert to authenticated
  with check (
    (public.is_staff() or public.is_client_of(client_id))
    and exists (
      select 1 from public.ai_generations g
      where g.id = generation_id and g.client_id = brand_logo_images.client_id and g.tool = 'brandIdentity'
        and (public.is_staff() or g.user_id = auth.uid())
    )
  );

drop policy if exists brand_logo_images_update on public.brand_logo_images;
create policy brand_logo_images_update on public.brand_logo_images for update to authenticated
  using (public.is_staff() or (public.is_client_of(client_id) and created_by = auth.uid()))
  with check (
    (public.is_staff() or public.is_client_of(client_id))
    and exists (
      select 1 from public.ai_generations g
      where g.id = generation_id and g.client_id = brand_logo_images.client_id and g.tool = 'brandIdentity'
        and (public.is_staff() or g.user_id = auth.uid())
    )
  );

drop policy if exists brand_logo_images_delete on public.brand_logo_images;
create policy brand_logo_images_delete on public.brand_logo_images for delete to authenticated
  using (public.is_staff() or (public.is_client_of(client_id) and created_by = auth.uid()));

revoke all on public.brand_logo_images from anon;
grant select, insert, update, delete on public.brand_logo_images to authenticated;
