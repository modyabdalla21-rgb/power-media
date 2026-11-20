-- ═══════════════════════════════════════════════════════════════════════
-- POWER MEDIA — Phase 7: self-serve growth tools
--
-- Run AFTER 0001–0006. Idempotent: safe to paste into the Supabase SQL
-- Editor and run as a single script, any number of times.
--
-- • New AI tools: 'marketingStrategy', 'metaAds', 'staticPost'.
-- • Brand assets: new kind 'product' (product photos for the Static Post
--   Studio). Visual references are no longer requested; existing
--   'reference' rows stay valid.
-- • Brand tasks may point to the new tools (and Offer & Competitor Angles).
-- ═══════════════════════════════════════════════════════════════════════

-- ── AI generations: allowed tools ───────────────────────────────────────
alter table public.ai_generations drop constraint if exists ai_generations_tool_check;
alter table public.ai_generations add constraint ai_generations_tool_check
  check (tool in (
    'adStudio', 'mediaPlanner', 'reportGenerator', 'brandIdentity', 'brandAnalysis', 'growthPlan',
    'growthDiagnosis', 'offerAngles', 'marketingStrategy', 'metaAds', 'staticPost'
  )) not valid;

-- Clients may save generations of client-facing tools in their own workspace only.
drop policy if exists ai_generations_insert on public.ai_generations;
create policy ai_generations_insert on public.ai_generations for insert to authenticated
  with check (
    user_id = auth.uid() and (
      public.is_staff()
      or (
        public.auth_role() = 'client'
        and client_id is not null and public.is_client_of(client_id)
        and tool in (
          'adStudio', 'mediaPlanner', 'brandIdentity', 'brandAnalysis', 'growthPlan',
          'growthDiagnosis', 'offerAngles', 'marketingStrategy', 'metaAds', 'staticPost'
        )
      )
    )
  );

-- ── Brand assets: product photos ────────────────────────────────────────
alter table public.brand_assets drop constraint if exists brand_assets_kind_check;
alter table public.brand_assets add constraint brand_assets_kind_check
  check (kind in ('logo', 'reference', 'product'));

-- ── Brand tasks: tool hints ─────────────────────────────────────────────
alter table public.brand_tasks drop constraint if exists brand_tasks_tool_hint_check;
alter table public.brand_tasks add constraint brand_tasks_tool_hint_check
  check (tool_hint in (
    'adStudio', 'mediaPlanner', 'brandIdentity', 'growthPlan',
    'staticPost', 'metaAds', 'marketingStrategy', 'offerAngles'
  ));
