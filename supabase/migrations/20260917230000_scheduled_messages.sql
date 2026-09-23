-- Fila de mensagens agendadas (disparo independente do navegador)
create table if not exists scheduled_messages (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  conversation_id uuid references conversations(id) on delete cascade,
  customer_id uuid,
  customer_name text,
  contact_phone text not null,
  content text not null,
  scheduled_at timestamptz not null,
  status text not null default 'pending',
  claimed_at timestamptz,
  error text,
  created_at timestamptz not null default now()
);
create index if not exists idx_schedmsgs_due on scheduled_messages(status, scheduled_at);
create index if not exists idx_schedmsgs_tenant on scheduled_messages(tenant_id);

alter table scheduled_messages enable row level security;

DROP POLICY IF EXISTS "Tenant can read scheduled_messages" ON scheduled_messages;
create policy "Tenant can read scheduled_messages"
on scheduled_messages for select
to authenticated
using (tenant_id = (auth.jwt() ->> 'tenant_id')::uuid);

DROP POLICY IF EXISTS "Tenant can insert scheduled_messages" ON scheduled_messages;
create policy "Tenant can insert scheduled_messages"
on scheduled_messages for insert
to authenticated
with check (tenant_id = (auth.jwt() ->> 'tenant_id')::uuid);

DROP POLICY IF EXISTS "Tenant can update scheduled_messages" ON scheduled_messages;
create policy "Tenant can update scheduled_messages"
on scheduled_messages for update
to authenticated
using (tenant_id = (auth.jwt() ->> 'tenant_id')::uuid);

-- ── Fallback: pg_cron chama a Edge Function a cada 30s ──
create extension if not exists pg_cron;
create extension if not exists pg_net;

DO $do$ begin
  perform cron.schedule(
    'process-scheduled-messages',
    '30 seconds',
    $cron$
    select net.http_post(
      url := 'https://sknimzjwpdbcuutxbycq.supabase.co/functions/v1/process-scheduled-messages',
      headers := '{"Content-Type":"application/json"}'::jsonb
    );
    $cron$
  );
exception when others then null; end $do$;
