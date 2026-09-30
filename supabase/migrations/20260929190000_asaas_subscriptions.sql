-- ============================================================
-- Assinaturas / pagamentos via Asaas
-- ============================================================

-- 1. Credenciais globais do Asaas (apenas superadmin).
--    NAO usar platform_settings: ela e legivel por qualquer
--    usuario autenticado e vazaria o token.
create table if not exists asaas_config (
  id uuid primary key default gen_random_uuid(),
  access_token text not null default '',
  environment text not null default 'sandbox' check (environment in ('sandbox', 'production')),
  enabled_methods text[] not null default '{PIX,BOLETO,CREDIT_CARD}',
  updated_at timestamptz not null default now()
);
insert into asaas_config (id) values ('00000000-0000-0000-0000-000000000002')
on conflict (id) do nothing;
alter table asaas_config enable row level security;
DO $$ begin
  create policy "Asaas config superadmin read" on asaas_config
    for select to authenticated
    using (coalesce(auth.jwt() -> 'user_metadata' ->> 'role', '') = 'superadmin');
exception when duplicate_object then null; end $$;
DO $$ begin
  create policy "Asaas config superadmin write" on asaas_config
    for all to authenticated
    using (coalesce(auth.jwt() -> 'user_metadata' ->> 'role', '') = 'superadmin')
    with check (coalesce(auth.jwt() -> 'user_metadata' ->> 'role', '') = 'superadmin');
exception when duplicate_object then null; end $$;

-- 2. Cliente Asaas cacheado por tenant
alter table tenants add column if not exists asaas_customer_id text;

-- 3. Faturas de assinatura (cobrancas mensais do plano)
create table if not exists subscription_invoices (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  plan_id text not null,
  plan_name text not null,
  amount numeric(10,2) not null,
  billing_type text not null check (billing_type in ('PIX','BOLETO','CREDIT_CARD')),
  status text not null default 'pending' check (status in ('pending','paid','overdue','canceled')),
  asaas_payment_id text unique,
  due_date date not null,
  paid_at date,
  invoice_url text,
  bank_slip_url text,
  pix_payload text,
  created_at timestamptz not null default now()
);
create index if not exists idx_subinv_tenant on subscription_invoices(tenant_id, created_at desc);
create index if not exists idx_subinv_status on subscription_invoices(tenant_id, status);

alter table subscription_invoices enable row level security;
-- Leitura: membros do tenant
DO $$ begin
  create policy "TI subscription_invoices select" on subscription_invoices
    for select to authenticated
    using (tenant_id = (nullif(auth.jwt() -> 'user_metadata' ->> 'tenant_id', ''))::uuid);
exception when duplicate_object then null; end $$;
-- Escrita: apenas superadmin (criacao/atualizacao ocorre via service role)
DO $$ begin
  create policy "Superadmin subscription_invoices all" on subscription_invoices
    for all to authenticated
    using (coalesce(auth.jwt() -> 'user_metadata' ->> 'role', '') = 'superadmin')
    with check (coalesce(auth.jwt() -> 'user_metadata' ->> 'role', '') = 'superadmin');
exception when duplicate_object then null; end $$;
