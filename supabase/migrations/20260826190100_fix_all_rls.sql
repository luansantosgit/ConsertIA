-- Corrige TODAS as políticas RLS que usam auth.jwt() ->> 'tenant_id' e auth.jwt() ->> 'role'
-- O campo no JWT está em auth.jwt() -> 'user_metadata' ->> 'tenant_id'

-- Tenants
DROP POLICY IF EXISTS "Superadmin full access tenants" ON public.tenants;
CREATE POLICY "Superadmin full access tenants" ON public.tenants
  FOR ALL USING (
    coalesce(auth.jwt() -> 'user_metadata' ->> 'role', '') = 'superadmin'
  );

-- Plans
DROP POLICY IF EXISTS "Superadmin full access plans" ON public.plans;
CREATE POLICY "Superadmin full access plans" ON public.plans
  FOR ALL USING (
    coalesce(auth.jwt() -> 'user_metadata' ->> 'role', '') = 'superadmin'
  );

-- Todas as tabelas com tenant_id
DO $$
DECLARE
  tbl text;
BEGIN
  FOR tbl IN
    SELECT unnest(ARRAY[
      'ai_configs', 'ai_logs', 'calendar_events', 'conversations',
      'customers', 'equipment', 'leads', 'messages', 'products',
      'service_orders', 'stock_movements', 'tenant_settings',
      'tenant_themes', 'transactions'
    ])
  LOOP
    EXECUTE format(
      'DROP POLICY IF EXISTS %I ON public.%I', 'TI ' || tbl, tbl
    );
    EXECUTE format(
      'CREATE POLICY %I ON public.%I FOR ALL USING ((tenant_id)::text = coalesce(auth.jwt() -> ''user_metadata'' ->> ''tenant_id'', ''''))',
      'TI ' || tbl, tbl
    );
  END LOOP;
END $$;
