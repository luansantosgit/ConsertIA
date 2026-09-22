-- ============================================================
-- FIX RLS: tabelas de IA criadas em 20260918210000 usavam o padrao
-- antigo de JWT (auth.jwt() ->> 'tenant_id' / ->> 'role').
-- O padrao correto deste projeto e:
--   auth.jwt() -> 'user_metadata' ->> 'tenant_id'
--   coalesce(auth.jwt() -> 'user_metadata' ->> 'role', '') = 'superadmin'
-- com WITH CHECK explicito (senao o INSERT e bloqueado).
-- ============================================================

-- ------------------------------------------------------------
-- 1. ai_agent_settings
-- ------------------------------------------------------------
drop policy if exists "Superadmin full access ai_agent_settings" on ai_agent_settings;
drop policy if exists "TI ai_agent_settings" on ai_agent_settings;

DO $$ begin
  create policy "Superadmin full access ai_agent_settings" on ai_agent_settings
    for all
    using (coalesce(auth.jwt() -> 'user_metadata' ->> 'role', '') = 'superadmin')
    with check (coalesce(auth.jwt() -> 'user_metadata' ->> 'role', '') = 'superadmin');
exception when duplicate_object then null; end $$;

DO $$ begin
  create policy "TI ai_agent_settings" on ai_agent_settings
    for all
    using ((tenant_id)::text = coalesce(auth.jwt() -> 'user_metadata' ->> 'tenant_id', ''))
    with check ((tenant_id)::text = coalesce(auth.jwt() -> 'user_metadata' ->> 'tenant_id', ''));
exception when duplicate_object then null; end $$;

-- ------------------------------------------------------------
-- 2. ai_quote_settings
-- ------------------------------------------------------------
drop policy if exists "Superadmin full access ai_quote_settings" on ai_quote_settings;
drop policy if exists "TI ai_quote_settings" on ai_quote_settings;

DO $$ begin
  create policy "Superadmin full access ai_quote_settings" on ai_quote_settings
    for all
    using (coalesce(auth.jwt() -> 'user_metadata' ->> 'role', '') = 'superadmin')
    with check (coalesce(auth.jwt() -> 'user_metadata' ->> 'role', '') = 'superadmin');
exception when duplicate_object then null; end $$;

DO $$ begin
  create policy "TI ai_quote_settings" on ai_quote_settings
    for all
    using ((tenant_id)::text = coalesce(auth.jwt() -> 'user_metadata' ->> 'tenant_id', ''))
    with check ((tenant_id)::text = coalesce(auth.jwt() -> 'user_metadata' ->> 'tenant_id', ''));
exception when duplicate_object then null; end $$;

-- ------------------------------------------------------------
-- 3. ai_pre_quote_templates
-- ------------------------------------------------------------
drop policy if exists "Superadmin full access ai_pre_quote_templates" on ai_pre_quote_templates;
drop policy if exists "TI ai_pre_quote_templates" on ai_pre_quote_templates;

DO $$ begin
  create policy "Superadmin full access ai_pre_quote_templates" on ai_pre_quote_templates
    for all
    using (coalesce(auth.jwt() -> 'user_metadata' ->> 'role', '') = 'superadmin')
    with check (coalesce(auth.jwt() -> 'user_metadata' ->> 'role', '') = 'superadmin');
exception when duplicate_object then null; end $$;

DO $$ begin
  create policy "TI ai_pre_quote_templates" on ai_pre_quote_templates
    for all
    using ((tenant_id)::text = coalesce(auth.jwt() -> 'user_metadata' ->> 'tenant_id', ''))
    with check ((tenant_id)::text = coalesce(auth.jwt() -> 'user_metadata' ->> 'tenant_id', ''));
exception when duplicate_object then null; end $$;

-- ------------------------------------------------------------
-- 4. ai_diagnosis_settings
-- ------------------------------------------------------------
drop policy if exists "Superadmin full access ai_diagnosis_settings" on ai_diagnosis_settings;
drop policy if exists "TI ai_diagnosis_settings" on ai_diagnosis_settings;

DO $$ begin
  create policy "Superadmin full access ai_diagnosis_settings" on ai_diagnosis_settings
    for all
    using (coalesce(auth.jwt() -> 'user_metadata' ->> 'role', '') = 'superadmin')
    with check (coalesce(auth.jwt() -> 'user_metadata' ->> 'role', '') = 'superadmin');
exception when duplicate_object then null; end $$;

DO $$ begin
  create policy "TI ai_diagnosis_settings" on ai_diagnosis_settings
    for all
    using ((tenant_id)::text = coalesce(auth.jwt() -> 'user_metadata' ->> 'tenant_id', ''))
    with check ((tenant_id)::text = coalesce(auth.jwt() -> 'user_metadata' ->> 'tenant_id', ''));
exception when duplicate_object then null; end $$;

-- ------------------------------------------------------------
-- 5. ai_device_coverage
-- ------------------------------------------------------------
drop policy if exists "Superadmin full access ai_device_coverage" on ai_device_coverage;
drop policy if exists "TI ai_device_coverage" on ai_device_coverage;

DO $$ begin
  create policy "Superadmin full access ai_device_coverage" on ai_device_coverage
    for all
    using (coalesce(auth.jwt() -> 'user_metadata' ->> 'role', '') = 'superadmin')
    with check (coalesce(auth.jwt() -> 'user_metadata' ->> 'role', '') = 'superadmin');
exception when duplicate_object then null; end $$;

DO $$ begin
  create policy "TI ai_device_coverage" on ai_device_coverage
    for all
    using ((tenant_id)::text = coalesce(auth.jwt() -> 'user_metadata' ->> 'tenant_id', ''))
    with check ((tenant_id)::text = coalesce(auth.jwt() -> 'user_metadata' ->> 'tenant_id', ''));
exception when duplicate_object then null; end $$;

-- ------------------------------------------------------------
-- 6. platform_ai_config (somente superadmin)
-- ------------------------------------------------------------
drop policy if exists "Superadmin full access platform_ai_config" on platform_ai_config;

DO $$ begin
  create policy "Superadmin full access platform_ai_config" on platform_ai_config
    for all
    using (coalesce(auth.jwt() -> 'user_metadata' ->> 'role', '') = 'superadmin')
    with check (coalesce(auth.jwt() -> 'user_metadata' ->> 'role', '') = 'superadmin');
exception when duplicate_object then null; end $$;

-- ------------------------------------------------------------
-- 7. tenant_ai_entitlements (superadmin escreve, tenant le)
-- ------------------------------------------------------------
drop policy if exists "Superadmin full access tenant_ai_entitlements" on tenant_ai_entitlements;
drop policy if exists "TI read tenant_ai_entitlements" on tenant_ai_entitlements;

DO $$ begin
  create policy "Superadmin full access tenant_ai_entitlements" on tenant_ai_entitlements
    for all
    using (coalesce(auth.jwt() -> 'user_metadata' ->> 'role', '') = 'superadmin')
    with check (coalesce(auth.jwt() -> 'user_metadata' ->> 'role', '') = 'superadmin');
exception when duplicate_object then null; end $$;

DO $$ begin
  create policy "TI read tenant_ai_entitlements" on tenant_ai_entitlements
    for select
    using ((tenant_id)::text = coalesce(auth.jwt() -> 'user_metadata' ->> 'tenant_id', ''));
exception when duplicate_object then null; end $$;

-- ------------------------------------------------------------
-- 8. ai_token_usage (superadmin escreve, tenant le)
-- ------------------------------------------------------------
drop policy if exists "Superadmin full access ai_token_usage" on ai_token_usage;
drop policy if exists "TI read ai_token_usage" on ai_token_usage;

DO $$ begin
  create policy "Superadmin full access ai_token_usage" on ai_token_usage
    for all
    using (coalesce(auth.jwt() -> 'user_metadata' ->> 'role', '') = 'superadmin')
    with check (coalesce(auth.jwt() -> 'user_metadata' ->> 'role', '') = 'superadmin');
exception when duplicate_object then null; end $$;

DO $$ begin
  create policy "TI read ai_token_usage" on ai_token_usage
    for select
    using ((tenant_id)::text = coalesce(auth.jwt() -> 'user_metadata' ->> 'tenant_id', ''));
exception when duplicate_object then null; end $$;
