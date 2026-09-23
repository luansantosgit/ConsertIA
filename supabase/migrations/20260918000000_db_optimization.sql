-- ============================================================
-- Otimização de desempenho e consumo
-- 1. Índices para caminhos quentes (FKs e queries do app)
-- 2. Dedup atômico de mensagens (índice único parcial)
-- 3. RLS sem cast na coluna (permite usar índice)
-- 4. Correção das policies de scheduled_messages (user_metadata)
-- 5. Tabela tenant_kv para configurações chave-valor
-- ============================================================

-- ── 1. Índices ──
-- Webhook: procura conversa por telefone a cada mensagem recebida
create index if not exists idx_conv_phone on conversations(contact_phone, created_at desc);
-- Sidebar: listar conversas do tenant ordenadas pela última mensagem
create index if not exists idx_conv_tenant_lastmsg on conversations(tenant_id, last_message_at desc);
-- Join do service_orders com conversas via customer
create index if not exists idx_conv_customer on conversations(customer_id);
-- RLS de messages (toda query filtra tenant_id)
create index if not exists idx_messages_tenant on messages(tenant_id);
-- Histórico do chat: ordenar por data dentro da conversa
create index if not exists idx_messages_conv_created on messages(conversation_id, created_at);
-- Todo envio procura a conexão conectada do tenant
create index if not exists idx_connections_tenant_status on connections(tenant_id, status);
-- RLS de stock_movements
create index if not exists idx_stockmov_tenant on stock_movements(tenant_id);
-- Filtro de leads por status
create index if not exists idx_leads_tenant_status on leads(tenant_id, status);
-- Logs de IA por data
create index if not exists idx_ailogs_tenant_created on ai_logs(tenant_id, created_at desc);
-- Transações por data e OS
create index if not exists idx_tx_tenant_created on transactions(tenant_id, created_at desc);
create index if not exists idx_tx_os on transactions(service_order_id);
-- Eventos por OS
create index if not exists idx_events_os on calendar_events(os_id);
-- Fila de agendadas por tenant/status
create index if not exists idx_schedmsgs_tenant_status on scheduled_messages(tenant_id, status);

-- ── 2. Dedup atômico de mensagens do WhatsApp ──
-- Elimina a corrida do select-then-insert do webhook (não cria se houver duplicatas)
DO $do$ begin
  create unique index if not exists uq_messages_wa_id
  on messages(wa_message_id)
  where wa_message_id is not null and wa_message_id <> '';
exception when others then
  raise notice 'uq_messages_wa_id: duplicatas existentes, indice unico nao criado';
end $do$;

-- ── 3. RLS sem cast na coluna (usa índice de tenant_id) ──
-- O padrão antigo "(tenant_id)::text = ..." invalida o índice e
-- avalia cast linha a linha. O novo compara uuid = uuid.
DO $do$
declare
  tbl text;
begin
  for tbl in
    select unnest(array[
      'ai_configs', 'ai_logs', 'calendar_events', 'conversations',
      'customers', 'equipment', 'leads', 'messages', 'products',
      'service_orders', 'stock_movements', 'tenant_settings',
      'tenant_themes', 'transactions'
    ])
  loop
    execute format('drop policy if exists %I on public.%I', 'TI ' || tbl, tbl);
    execute format(
      'create policy %I on public.%I for all using (tenant_id = (nullif(auth.jwt() -> ''user_metadata'' ->> ''tenant_id'', ''''))::uuid)',
      'TI ' || tbl, tbl
    );
  end loop;
end $do$;

-- ── 4. Corrige policies de scheduled_messages (campo no user_metadata) ──
DROP POLICY IF EXISTS "Tenant can read scheduled_messages" ON scheduled_messages;
DROP POLICY IF EXISTS "Tenant can insert scheduled_messages" ON scheduled_messages;
DROP POLICY IF EXISTS "Tenant can update scheduled_messages" ON scheduled_messages;

CREATE POLICY "Tenant can read scheduled_messages" ON scheduled_messages
  FOR SELECT TO authenticated
  USING (tenant_id = (nullif(auth.jwt() -> 'user_metadata' ->> 'tenant_id', ''))::uuid);

CREATE POLICY "Tenant can insert scheduled_messages" ON scheduled_messages
  FOR INSERT TO authenticated
  WITH CHECK (tenant_id = (nullif(auth.jwt() -> 'user_metadata' ->> 'tenant_id', ''))::uuid);

CREATE POLICY "Tenant can update scheduled_messages" ON scheduled_messages
  FOR UPDATE TO authenticated
  USING (tenant_id = (nullif(auth.jwt() -> 'user_metadata' ->> 'tenant_id', ''))::uuid);

-- ── 5. Tabela chave-valor por tenant (configurações do app) ──
create table if not exists tenant_kv (
  tenant_id uuid not null references tenants(id) on delete cascade,
  key text not null,
  value text,
  updated_at timestamptz not null default now(),
  primary key (tenant_id, key)
);

alter table tenant_kv enable row level security;

DROP POLICY IF EXISTS "Tenant read kv" ON tenant_kv;
CREATE POLICY "Tenant read kv" ON tenant_kv
  FOR SELECT TO authenticated
  USING (tenant_id = (nullif(auth.jwt() -> 'user_metadata' ->> 'tenant_id', ''))::uuid);

DROP POLICY IF EXISTS "Tenant write kv" ON tenant_kv;
CREATE POLICY "Tenant write kv" ON tenant_kv
  FOR ALL TO authenticated
  USING (tenant_id = (nullif(auth.jwt() -> 'user_metadata' ->> 'tenant_id', ''))::uuid)
  WITH CHECK (tenant_id = (nullif(auth.jwt() -> 'user_metadata' ->> 'tenant_id', ''))::uuid);
