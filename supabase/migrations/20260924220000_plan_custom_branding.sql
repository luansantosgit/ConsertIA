-- Personalização de marca (logo/cor próprios por empresa) como feature de plano.

alter table plans add column if not exists custom_branding boolean not null default false;

-- Empresa só grava o próprio tema se o plano contratado permitir.
-- Superadmin continua com acesso total (política própria abaixo).
drop policy if exists "TI tenant_themes" on tenant_themes;

DO $$ begin
  create policy "TI tenant_themes" on tenant_themes for all
    using (
      tenant_id::text = coalesce(auth.jwt() -> 'user_metadata' ->> 'tenant_id', '')
      and coalesce(
        (
          select p.custom_branding
          from plans p
          where p.id = (select t.plan_id from tenants t where t.id = tenant_themes.tenant_id)
        ),
        false
      )
    )
    with check (
      tenant_id::text = coalesce(auth.jwt() -> 'user_metadata' ->> 'tenant_id', '')
      and coalesce(
        (
          select p.custom_branding
          from plans p
          where p.id = (select t.plan_id from tenants t where t.id = tenant_themes.tenant_id)
        ),
        false
      )
    );
exception when duplicate_object then null; end $$;

DO $$ begin
  create policy "SA tenant_themes" on tenant_themes for all
    using (coalesce(auth.jwt() -> 'user_metadata' ->> 'role', '') = 'superadmin');
exception when duplicate_object then null; end $$;
