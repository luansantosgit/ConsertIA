-- Painel da empresa precisa exibir a cota efetiva (limite do plano).
-- plans: leitura para usuarios autenticados (dados de precificacao publicos).
-- tenants: leitura apenas da propria empresa.
DO $$ begin
  create policy "Authenticated read plans" on plans
    for select
    to authenticated
    using (true);
exception when duplicate_object then null; end $$;

DO $$ begin
  create policy "TI read own tenant" on tenants
    for select
    to authenticated
    using ((id)::text = coalesce(auth.jwt() -> 'user_metadata' ->> 'tenant_id', ''));
exception when duplicate_object then null; end $$;
