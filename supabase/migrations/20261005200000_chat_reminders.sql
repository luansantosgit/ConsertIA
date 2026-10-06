-- ============================================================
-- Lembretes automáticos do chat: mensagens agendadas que o
-- sistema envia ao lead via WhatsApp na data/hora marcada.
-- Criados pelo botão Lembrete no cabeçalho do chat.
-- ============================================================
create table if not exists chat_reminders (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  conversation_id uuid not null references conversations(id) on delete cascade,
  contact_phone text not null,
  message text not null,
  status text not null default 'pending' check (status in ('pending', 'sent', 'cancelled')),
  scheduled_at timestamptz not null,
  sent_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists idx_chat_reminders_pending on chat_reminders(status, scheduled_at);
create index if not exists idx_chat_reminders_tenant on chat_reminders(tenant_id, scheduled_at desc);

alter table chat_reminders enable row level security;
DO $$ begin
  create policy "TI chat_reminders" on chat_reminders
    for all to authenticated
    using (tenant_id = (nullif(auth.jwt() -> 'user_metadata' ->> 'tenant_id', ''))::uuid)
    with check (tenant_id = (nullif(auth.jwt() -> 'user_metadata' ->> 'tenant_id', ''))::uuid);
exception when duplicate_object then null; end $$;
DO $$ begin
  create policy "Superadmin chat_reminders" on chat_reminders
    for all to authenticated
    using (coalesce(auth.jwt() -> 'user_metadata' ->> 'role', '') = 'superadmin');
exception when duplicate_object then null; end $$;
