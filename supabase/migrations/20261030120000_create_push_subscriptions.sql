-- ============================================================
-- PUSH SUBSCRIPTIONS (notificacoes push do PWA)
-- Armazena a subscription Web Push de cada dispositivo por tenant.
-- ============================================================

-- Tabela de subscriptions (uma por dispositivo/navegador)
create table if not exists push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  endpoint text not null unique,
  p256dh text not null,
  auth text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- RLS: isolamento por tenant
alter table push_subscriptions enable row level security;

drop policy if exists "push_subscriptions_select_own_tenant" on push_subscriptions;
create policy "push_subscriptions_select_own_tenant"
  on push_subscriptions for select
  using (tenant_id::text = (auth.jwt() ->> 'tenant_id'));

drop policy if exists "push_subscriptions_insert_own_tenant" on push_subscriptions;
create policy "push_subscriptions_insert_own_tenant"
  on push_subscriptions for insert
  with check (tenant_id::text = (auth.jwt() ->> 'tenant_id'));

drop policy if exists "push_subscriptions_delete_own_tenant" on push_subscriptions;
create policy "push_subscriptions_delete_own_tenant"
  on push_subscriptions for delete
  using (tenant_id::text = (auth.jwt() ->> 'tenant_id'));

-- Superadmin enxerga tudo
drop policy if exists "push_subscriptions_superadmin_all" on push_subscriptions;
create policy "push_subscriptions_superadmin_all"
  on push_subscriptions for all
  using (auth.jwt() ->> 'role' = 'superadmin');

-- Indice para busca por tenant (edge function de envio)
create index if not exists idx_push_subscriptions_tenant
  on push_subscriptions(tenant_id);
