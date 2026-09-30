-- ============================================================
-- Corrige RLS da tabela users.
--
-- As policies originais usavam claims top-level do JWT:
--   auth.jwt() ->> 'tenant_id' / ->> 'role'
-- Mas no JWT real o top-level 'role' e 'authenticated' e o
-- tenant_id/role reais vivem em user_metadata. Resultado:
-- UPDATE em users afetava 0 linhas silenciosamente.
--
-- Padrao correto (mesmo das migrations 20260918/20260922):
--   auth.jwt() -> 'user_metadata' ->> 'tenant_id'
-- ============================================================

-- Remove TODAS as policies existentes de users (inclui antigas
-- quebradas e eventuais criadas manualmente no dashboard)
do $$ declare r record; begin
  for r in (select policyname from pg_policies where schemaname = 'public' and tablename = 'users')
  loop
    execute format('drop policy if exists %I on public.users', r.policyname);
  end loop;
end $$;

-- Superadmin: acesso total (painel superadmin)
create policy "Superadmin all users" on users for all
  using (coalesce(auth.jwt() -> 'user_metadata' ->> 'role', '') = 'superadmin');

-- Membros do tenant: leitura (listar equipe, atribuir tecnico etc.)
create policy "TI users select" on users for select
  using (tenant_id = (nullif(auth.jwt() -> 'user_metadata' ->> 'tenant_id', ''))::uuid);

-- Escrita (editar/desativar/remover usuarios): apenas admin do tenant
create policy "TI users admin write" on users for all
  using (
    tenant_id = (nullif(auth.jwt() -> 'user_metadata' ->> 'tenant_id', ''))::uuid
    and coalesce(auth.jwt() -> 'user_metadata' ->> 'role', '') = 'admin'
  )
  with check (
    tenant_id = (nullif(auth.jwt() -> 'user_metadata' ->> 'tenant_id', ''))::uuid
    and coalesce(auth.jwt() -> 'user_metadata' ->> 'role', '') = 'admin'
  );
