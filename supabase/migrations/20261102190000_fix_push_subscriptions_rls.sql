-- ============================================================
-- Corrige o RLS da tabela push_subscriptions.
--
-- As policies originais usavam claims top-level do JWT:
--   auth.jwt() ->> 'tenant_id' / auth.jwt() ->> 'role'
-- Mas no JWT real o top-level 'role' e 'authenticated' e o
-- tenant_id/role reais vivem em user_metadata. Resultado:
-- o tenant nao enxergava as proprias subscriptions (SELECT
-- sempre vazio) e o superadmin perdia o acesso total.
--
-- Padrao correto (mesmo de 20260929150000_fix_users_rls.sql):
--   auth.jwt() -> 'user_metadata' ->> 'tenant_id'
-- ============================================================

drop policy if exists "push_subscriptions_select_own_tenant" on public.push_subscriptions;
create policy "push_subscriptions_select_own_tenant"
  on public.push_subscriptions for select
  using (tenant_id::text = (auth.jwt() -> 'user_metadata' ->> 'tenant_id'));

drop policy if exists "push_subscriptions_insert_own_tenant" on public.push_subscriptions;
create policy "push_subscriptions_insert_own_tenant"
  on public.push_subscriptions for insert
  with check (tenant_id::text = (auth.jwt() -> 'user_metadata' ->> 'tenant_id'));

drop policy if exists "push_subscriptions_update_own_tenant" on public.push_subscriptions;
create policy "push_subscriptions_update_own_tenant"
  on public.push_subscriptions for update
  using (tenant_id::text = (auth.jwt() -> 'user_metadata' ->> 'tenant_id'))
  with check (tenant_id::text = (auth.jwt() -> 'user_metadata' ->> 'tenant_id'));

drop policy if exists "push_subscriptions_delete_own_tenant" on public.push_subscriptions;
create policy "push_subscriptions_delete_own_tenant"
  on public.push_subscriptions for delete
  using (tenant_id::text = (auth.jwt() -> 'user_metadata' ->> 'tenant_id'));

-- Superadmin enxerga tudo (role real vive em user_metadata)
drop policy if exists "push_subscriptions_superadmin_all" on public.push_subscriptions;
create policy "push_subscriptions_superadmin_all"
  on public.push_subscriptions for all
  using ((auth.jwt() -> 'user_metadata' ->> 'role') = 'superadmin')
  with check ((auth.jwt() -> 'user_metadata' ->> 'role') = 'superadmin');
