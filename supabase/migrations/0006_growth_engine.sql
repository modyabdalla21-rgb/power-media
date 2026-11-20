-- ═══════════════════════════════════════════════════════════════════════
-- POWER MEDIA — Phase 6: AI Brand Growth Engine
--
-- Run AFTER 0001–0005. Idempotent: safe to paste into the Supabase SQL
-- Editor and run as a single script, any number of times.
--
-- • clients.discovery: the brand's Smart Discovery answers (channels,
--   stage, budget range, bottleneck, goal…) used by the Growth Diagnosis.
-- • New AI tools: 'growthDiagnosis' (diagnosis + roadmap + tasks) and
--   'offerAngles' (competitor & offer angle generator).
-- ═══════════════════════════════════════════════════════════════════════

alter table public.clients add column if not exists discovery jsonb;
alter table public.clients add column if not exists discovery_updated_at timestamptz;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'clients_discovery_size') then
    alter table public.clients add constraint clients_discovery_size
      check (discovery is null or (jsonb_typeof(discovery) = 'object' and pg_column_size(discovery) <= 8000));
  end if;
end $$;

alter table public.ai_generations drop constraint if exists ai_generations_tool_check;
alter table public.ai_generations add constraint ai_generations_tool_check
  check (tool in ('adStudio', 'mediaPlanner', 'reportGenerator', 'brandIdentity', 'brandAnalysis', 'growthPlan', 'growthDiagnosis', 'offerAngles')) not valid;

drop policy if exists ai_generations_insert on public.ai_generations;
create policy ai_generations_insert on public.ai_generations for insert to authenticated
  with check (
    user_id = auth.uid() and (
      public.is_staff()
      or (
        public.auth_role() = 'client'
        and client_id is not null and public.is_client_of(client_id)
        and tool in ('adStudio', 'mediaPlanner', 'brandIdentity', 'brandAnalysis', 'growthPlan', 'growthDiagnosis', 'offerAngles')
      )
    )
  );
