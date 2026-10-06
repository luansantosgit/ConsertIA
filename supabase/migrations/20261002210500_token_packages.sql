-- ============================================================
-- Pacotes de tokens de IA (compra avulsa pelo tenant)
--   - token_packages: configurados pelo superadmin (Provedor de IA)
--   - tenant_ai_entitlements.extra_tokens: saldo comprado, somado à
--     cota do plano; consumo vem dele primeiro (semanal/mensal)
--   - token_purchases: rastreio das compras (Asaas)
-- ============================================================
create table if not exists token_packages (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  tokens bigint not null,
  price numeric(10,2) not null,
  active boolean not null default true,
  sort_order int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table token_packages enable row level security;
DO $$ begin
  create policy "Public read active token packages" on token_packages
    for select to anon, authenticated
    using (active = true);
exception when duplicate_object then null; end $$;
DO $$ begin
  create policy "Superadmin token packages" on token_packages
    for all to authenticated
    using (coalesce(auth.jwt() -> 'user_metadata' ->> 'role', '') = 'superadmin')
    with check (coalesce(auth.jwt() -> 'user_metadata' ->> 'role', '') = 'superadmin');
exception when duplicate_object then null; end $$;

-- Saldo de tokens comprados pela empresa
alter table tenant_ai_entitlements add column if not exists extra_tokens bigint not null default 0;

-- Compras de pacotes (cobranças Asaas de tokens)
create table if not exists token_purchases (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  package_id uuid not null references token_packages(id),
  package_name text not null,
  tokens bigint not null,
  amount numeric(10,2) not null,
  status text not null default 'pending' check (status in ('pending', 'paid', 'canceled')),
  asaas_payment_id text unique,
  invoice_url text,
  bank_slip_url text,
  created_at timestamptz not null default now()
);
create index if not exists idx_token_purchases_tenant on token_purchases(tenant_id, created_at desc);
alter table token_purchases enable row level security;
DO $$ begin
  create policy "TI token purchases" on token_purchases
    for select to authenticated
    using (tenant_id = (nullif(auth.jwt() -> 'user_metadata' ->> 'tenant_id', ''))::uuid);
exception when duplicate_object then null; end $$;
DO $$ begin
  create policy "Superadmin token purchases" on token_purchases
    for all to authenticated
    using (coalesce(auth.jwt() -> 'user_metadata' ->> 'role', '') = 'superadmin')
    with check (coalesce(auth.jwt() -> 'user_metadata' ->> 'role', '') = 'superadmin');
exception when duplicate_object then null; end $$;
