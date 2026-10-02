-- ============================================================
-- Onboarding público (wizard /comece-agora)
-- Sessões de cadastro rápido de empresas: lead conecta o
-- WhatsApp (token global Uazapi), paga a assinatura via Asaas
-- e vira tenant ativo com admin criado automaticamente.
-- Expira em 24h sem pagamento → purga completa (tenant,
-- usuário, instância) feita de forma lazy pelas edge functions.
-- ============================================================
create table if not exists onboarding_sessions (
  id uuid primary key default gen_random_uuid(),
  token text unique not null,
  lead_name text not null,
  company_name text not null,
  email text not null,
  phone text,
  whatsapp text not null,
  cpf_cnpj text not null,
  address text,
  plan_id text not null,
  tenant_id uuid references tenants(id) on delete cascade,
  connection_id uuid references connections(id) on delete set null,
  asaas_customer_id text,
  asaas_payment_id text,
  amount numeric(10,2),
  status text not null default 'lead'
    check (status in ('lead', 'connected', 'awaiting_payment', 'paid', 'expired')),
  temp_password text,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default now() + interval '24 hours'
);
create index if not exists idx_onboarding_expired on onboarding_sessions(status, expires_at);
create index if not exists idx_onboarding_tenant on onboarding_sessions(tenant_id);

-- Acesso apenas via service role (edge functions) — sem policies
alter table onboarding_sessions enable row level security;
