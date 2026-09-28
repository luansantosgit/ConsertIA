-- Leads capturados pelo site institucional (funil no superadmin).

create table if not exists landing_leads (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  name text not null,
  whatsapp text not null,
  store_name text not null,
  quotes_per_day int,
  ticket int,
  status text not null default 'novo' check (status in ('novo', 'contatado', 'convertido', 'perdido')),
  notes text,
  constraint landing_leads_whatsapp_key unique (whatsapp)
);

create index if not exists idx_landing_leads_status on landing_leads (status);
create index if not exists idx_landing_leads_created_at on landing_leads (created_at desc);

alter table landing_leads enable row level security;

-- Nenhuma política de insert público: leads entram apenas via Edge Function
-- (service role), que valida e faz upsert. Superadmin lê e gerencia o funil.
DO $$ begin
  create policy "LL superadmin read" on landing_leads
    for select to authenticated
    using (coalesce(auth.jwt() -> 'user_metadata' ->> 'role', '') = 'superadmin');
exception when duplicate_object then null; end $$;

DO $$ begin
  create policy "LL superadmin write" on landing_leads
    for all to authenticated
    using (coalesce(auth.jwt() -> 'user_metadata' ->> 'role', '') = 'superadmin')
    with check (coalesce(auth.jwt() -> 'user_metadata' ->> 'role', '') = 'superadmin');
exception when duplicate_object then null; end $$;

-- WhatsApp de suporte/vendas usado nos CTAs do site (wa.me).
-- A coluna support_whatsapp ja existe em platform_settings
-- (migration 20260916120000); aqui apenas garantimos o valor padrao.
update platform_settings
set support_whatsapp = coalesce(support_whatsapp, '5518997411233')
where support_whatsapp is null;
