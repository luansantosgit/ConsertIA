-- ============================================================
-- ConsertIA — WhatsApp API Oficial + API Alternativa + Ligacoes
-- Migration: Adiciona suporte a canais WhatsApp, modo hibrido
-- e ligacoes via servidor Go
-- ============================================================

-- ============================================================
-- 1. COLUNAS NA TABELA CONNECTIONS (se nao existir, criar tabela)
-- ============================================================
DO $$ begin
  -- Tabela connections para canais WhatsApp
  create table if not exists connections (
    id uuid primary key default gen_random_uuid(),
    tenant_id uuid not null references tenants(id) on delete cascade,
    name text not null,
    phone_number text,
    color text default '#0EA5E9',
    provider text not null default 'api_alternativa'
      check (provider in ('api_alternativa', 'api_oficial')),
    status text not null default 'pending'
      check (status in ('pending', 'connected', 'disconnected', 'waiting')),
    profile_name text,
    profile_pic_url text,
    number text,

    -- API Alternativa (ex: Uazapi)
    instance_name text,
    instance_token text,
    instance_data jsonb default '{}',

    -- API Oficial (Meta Cloud API via Pontaltech)
    bsp_username text,
    bsp_password text,
    bsp_waba_id text,
    bsp_phone_number_id text,
    bsp_app_id text,
    bsp_config_id text,
    bsp_webhook_url text,

    -- Modo Hibrido
    hybrid_connection_id uuid,

    -- Roteamento e automacao
    routing_type text not null default 'department'
      check (routing_type in ('department', 'flow')),
    department_id uuid,
    flow_id uuid,
    ai_agent_project_id uuid,

    -- Historico
    import_history boolean default false,
    history_days int default 7,
    history_sync_data jsonb default '{}',

    -- Timestamps
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
  );
exception when duplicate_object then null; end $$;

-- Adicionar colunas caso tabela ja exista
DO $$ begin
  alter table connections add column if not exists provider text not null default 'api_alternativa'
    check (provider in ('api_alternativa', 'api_oficial'));
exception when duplicate_column then null; end $$;
DO $$ begin
  alter table connections add column if not exists instance_name text;
exception when duplicate_column then null; end $$;
DO $$ begin
  alter table connections add column if not exists instance_token text;
exception when duplicate_column then null; end $$;
DO $$ begin
  alter table connections add column if not exists instance_data jsonb default '{}';
exception when duplicate_column then null; end $$;
DO $$ begin
  alter table connections add column if not exists bsp_username text;
exception when duplicate_column then null; end $$;
DO $$ begin
  alter table connections add column if not exists bsp_password text;
exception when duplicate_column then null; end $$;
DO $$ begin
  alter table connections add column if not exists bsp_waba_id text;
exception when duplicate_column then null; end $$;
DO $$ begin
  alter table connections add column if not exists bsp_phone_number_id text;
exception when duplicate_column then null; end $$;
DO $$ begin
  alter table connections add column if not exists bsp_app_id text;
exception when duplicate_column then null; end $$;
DO $$ begin
  alter table connections add column if not exists bsp_config_id text;
exception when duplicate_column then null; end $$;
DO $$ begin
  alter table connections add column if not exists bsp_webhook_url text;
exception when duplicate_column then null; end $$;
DO $$ begin
  alter table connections add column if not exists hybrid_connection_id uuid;
exception when duplicate_column then null; end $$;
DO $$ begin
  alter table connections add column if not exists profile_name text;
exception when duplicate_column then null; end $$;
DO $$ begin
  alter table connections add column if not exists profile_pic_url text;
exception when duplicate_column then null; end $$;
DO $$ begin
  alter table connections add column if not exists number text;
exception when duplicate_column then null; end $$;
DO $$ begin
  alter table connections add column if not exists history_sync_data jsonb default '{}';
exception when duplicate_column then null; end $$;

create index if not exists idx_connections_tenant on connections(tenant_id);
create index if not exists idx_connections_provider on connections(tenant_id, provider);

-- ============================================================
-- 2. COLUNAS NA TABELA TENANT_SETTINGS
-- ============================================================
DO $$ begin
  alter table tenant_settings add column if not exists admin_api_token text;
exception when duplicate_column then null; end $$;
DO $$ begin
  alter table tenant_settings add column if not exists uazapi_subdomain text;
exception when duplicate_column then null; end $$;
DO $$ begin
  alter table tenant_settings add column if not exists uazapi_mode text default 'intermediario';
exception when duplicate_column then null; end $$;
DO $$ begin
  alter table tenant_settings add column if not exists bsp_username text;
exception when duplicate_column then null; end $$;
DO $$ begin
  alter table tenant_settings add column if not exists bsp_password text;
exception when duplicate_column then null; end $$;
DO $$ begin
  alter table tenant_settings add column if not exists bsp_app_id text;
exception when duplicate_column then null; end $$;
DO $$ begin
  alter table tenant_settings add column if not exists bsp_config_id text;
exception when duplicate_column then null; end $$;
DO $$ begin
  alter table tenant_settings add column if not exists bsp_waba_id text;
exception when duplicate_column then null; end $$;
DO $$ begin
  alter table tenant_settings add column if not exists bsp_phone_number_id text;
exception when duplicate_column then null; end $$;
DO $$ begin
  alter table tenant_settings add column if not exists bsp_webhook_url text;
exception when duplicate_column then null; end $$;
DO $$ begin
  alter table tenant_settings add column if not exists bsp_template_pricing jsonb default '{}';
exception when duplicate_column then null; end $$;
DO $$ begin
  alter table tenant_settings add column if not exists hybrid_mode text default 'integral'
    check (hybrid_mode in ('integral', 'partial', 'random'));
exception when duplicate_column then null; end $$;
DO $$ begin
  alter table tenant_settings add column if not exists hybrid_random_percentage int default 50;
exception when duplicate_column then null; end $$;
DO $$ begin
  alter table tenant_settings add column if not exists support_whatsapp text;
exception when duplicate_column then null; end $$;

-- ============================================================
-- 3. ESTADO HIBRIDO POR CONVERSA
-- ============================================================
create table if not exists conversation_hybrid_state (
  conversation_id uuid primary key,
  provider_override text check (provider_override in ('api_oficial', 'api_alternativa')),
  first_response_sent boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

DO $$ begin
  create trigger trg_conversation_hybrid_state_updated
    before update on conversation_hybrid_state
    for each row execute function update_updated_at();
exception when duplicate_object then null; end $$;

-- ============================================================
-- 4. WEBHOOK EVENTS DA API OFICIAL (debug)
-- ============================================================
create table if not exists whatsapp_official_webhook_events (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid references tenants(id) on delete cascade,
  event_type text,
  event_name text,
  payload jsonb default '{}',
  connection_id uuid,
  conversation_id uuid,
  contact_phone text,
  created_at timestamptz not null default now()
);

create index if not exists idx_wa_webhook_events_tenant on whatsapp_official_webhook_events(tenant_id);
create index if not exists idx_wa_webhook_events_created on whatsapp_official_webhook_events(created_at desc);

-- ============================================================
-- 5. SESSOES DE LIGACOES
-- ============================================================
create table if not exists wacalls_sessions (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  fork_session_id text not null,
  name text,
  phone_number text,
  status text not null default 'connecting'
    check (status in ('connecting', 'connected', 'disconnected', 'error')),
  jid text,
  connection_id uuid,
  max_concurrent_calls int default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_wacalls_sessions_tenant on wacalls_sessions(tenant_id);
create unique index if not exists idx_wacalls_sessions_fork on wacalls_sessions(fork_session_id);

DO $$ begin
  create trigger trg_wacalls_sessions_updated
    before update on wacalls_sessions
    for each row execute function update_updated_at();
exception when duplicate_object then null; end $$;

-- ============================================================
-- 6. CHAMADAS DE LIGACOES
-- ============================================================
create table if not exists wacalls_calls (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  session_id uuid not null references wacalls_sessions(id) on delete cascade,
  direction text not null check (direction in ('inbound', 'outbound')),
  status text not null default 'ringing'
    check (status in ('ringing', 'active', 'ended', 'missed', 'rejected')),
  caller_phone text,
  callee_phone text,
  started_at timestamptz not null default now(),
  ended_at timestamptz,
  duration_seconds int,
  recording_url text,
  created_at timestamptz not null default now()
);

create index if not exists idx_wacalls_calls_session on wacalls_calls(session_id);
create index if not exists idx_wacalls_calls_tenant on wacalls_calls(tenant_id);

-- ============================================================
-- 7. LIMITES DE LIGACOES POR PLANO
-- ============================================================
create table if not exists wacalls_plan_limits (
  id uuid primary key default gen_random_uuid(),
  plan_name text not null,
  max_channels int not null default 1,
  max_concurrent_calls int not null default 1,
  max_calls_per_day int not null default 50,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create unique index if not exists idx_wacalls_plan_limits_plan on wacalls_plan_limits(plan_name);

-- Seed: limites por plano
insert into wacalls_plan_limits (plan_name, max_channels, max_concurrent_calls, max_calls_per_day) values
  ('starter', 1, 1, 30),
  ('profissional', 2, 2, 100),
  ('empresarial', 5, 5, 9999)
on conflict (plan_name) do nothing;

-- ============================================================
-- 8. COLUNAS NA TABELA CONVERSATIONS
-- ============================================================
DO $$ begin
  alter table conversations add column if not exists connection_id uuid references connections(id);
exception when duplicate_column then null; end $$;
DO $$ begin
  alter table conversations add column if not exists remote_jid text;
exception when duplicate_column then null; end $$;
DO $$ begin
  alter table conversations add column if not exists is_group boolean default false;
exception when duplicate_column then null; end $$;
DO $$ begin
  alter table conversations add column if not exists last_message text;
exception when duplicate_column then null; end $$;
DO $$ begin
  alter table conversations add column if not exists last_message_time timestamptz;
exception when duplicate_column then null; end $$;
DO $$ begin
  alter table conversations add column if not exists archived_at timestamptz;
exception when duplicate_column then null; end $$;

create index if not exists idx_conv_connection on conversations(connection_id);

-- ============================================================
-- 9. COLUNAS NA TABELA MESSAGES
-- ============================================================
DO $$ begin
  alter table messages add column if not exists message_id_provider text;
exception when duplicate_column then null; end $$;
DO $$ begin
  alter table messages add column if not exists message_type text default 'text';
exception when duplicate_column then null; end $$;
DO $$ begin
  alter table messages add column if not exists media_url text;
exception when duplicate_column then null; end $$;
DO $$ begin
  alter table messages add column if not exists is_internal_note boolean default false;
exception when duplicate_column then null; end $$;
DO $$ begin
  alter table messages add column if not exists connection_id uuid references connections(id);
exception when duplicate_column then null; end $$;
DO $$ begin
  alter table messages add column if not exists hybrid_provider text;
exception when duplicate_column then null; end $$;

-- ============================================================
-- 10. COLUNAS NA TABELA PLANS
-- ============================================================
DO $$ begin
  alter table plans add column if not exists max_whatsapp_channels int default 1;
exception when duplicate_column then null; end $$;
DO $$ begin
  alter table plans add column if not exists max_instagram_channels int default 0;
exception when duplicate_column then null; end $$;
DO $$ begin
  alter table plans add column if not exists has_ligacoes boolean default false;
exception when duplicate_column then null; end $$;

-- ============================================================
-- 11. PLATAFORMA SETTINGS (se nao existir)
-- ============================================================
DO $$ begin
  create table if not exists platform_settings (
    id uuid primary key default gen_random_uuid(),
    admin_api_token text,
    uazapi_subdomain text,
    uazapi_mode text default 'intermediario',
    bsp_username text,
    bsp_password text,
    bsp_app_id text,
    bsp_config_id text,
    bsp_waba_id text,
    bsp_phone_number_id text,
    bsp_webhook_url text,
    bsp_template_pricing jsonb default '{}',
    hybrid_mode text default 'integral'
      check (hybrid_mode in ('integral', 'partial', 'random')),
    hybrid_random_percentage int default 50,
    support_whatsapp text,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
  );
exception when duplicate_object then null; end $$;

-- ============================================================
-- 12. BUCKET PARA GRAVACOES DE LIGACOES
-- ============================================================
DO $$ begin
  insert into storage.buckets (id, name, public)
  values ('wacalls_recordings', 'wacalls_recordings', false)
  on conflict (id) do nothing;
exception when others then null; end $$;

-- ============================================================
-- 13. RLS PARA TABELAS NOVAS
-- ============================================================

-- Connections
alter table connections enable row level security;
DO $$ begin
  create policy "Superadmin full access connections" on connections
    for all using (auth.jwt() ->> 'role' = 'superadmin');
exception when duplicate_object then null; end $$;
DO $$ begin
  create policy "TI connections" on connections
    for all using (tenant_id::text = auth.jwt() ->> 'tenant_id');
exception when duplicate_object then null; end $$;

-- conversation_hybrid_state
alter table conversation_hybrid_state enable row level security;
DO $$ begin
  create policy "Superadmin full access hybrid_state" on conversation_hybrid_state
    for all using (auth.jwt() ->> 'role' = 'superadmin');
exception when duplicate_object then null; end $$;

-- whatsapp_official_webhook_events
alter table whatsapp_official_webhook_events enable row level security;
DO $$ begin
  create policy "Superadmin full access webhook_events" on whatsapp_official_webhook_events
    for all using (auth.jwt() ->> 'role' = 'superadmin');
exception when duplicate_object then null; end $$;
DO $$ begin
  create policy "TI webhook_events" on whatsapp_official_webhook_events
    for all using (tenant_id::text = auth.jwt() ->> 'tenant_id');
exception when duplicate_object then null; end $$;

-- wacalls_sessions
alter table wacalls_sessions enable row level security;
DO $$ begin
  create policy "Superadmin full access wacalls_sessions" on wacalls_sessions
    for all using (auth.jwt() ->> 'role' = 'superadmin');
exception when duplicate_object then null; end $$;
DO $$ begin
  create policy "TI wacalls_sessions" on wacalls_sessions
    for all using (tenant_id::text = auth.jwt() ->> 'tenant_id');
exception when duplicate_object then null; end $$;

-- wacalls_calls
alter table wacalls_calls enable row level security;
DO $$ begin
  create policy "Superadmin full access wacalls_calls" on wacalls_calls
    for all using (auth.jwt() ->> 'role' = 'superadmin');
exception when duplicate_object then null; end $$;
DO $$ begin
  create policy "TI wacalls_calls" on wacalls_calls
    for all using (tenant_id::text = auth.jwt() ->> 'tenant_id');
exception when duplicate_object then null; end $$;

-- wacalls_plan_limits
alter table wacalls_plan_limits enable row level security;
DO $$ begin
  create policy "Superadmin full access wacalls_plan_limits" on wacalls_plan_limits
    for all using (auth.jwt() ->> 'role' = 'superadmin');
exception when duplicate_object then null; end $$;
DO $$ begin
  create policy "Authenticated read wacalls_plan_limits" on wacalls_plan_limits
    for select using (auth.role() = 'authenticated');
exception when duplicate_object then null; end $$;

-- platform_settings
DO $$ begin
  alter table platform_settings enable row level security;
exception when undefined_table then null; end $$;
DO $$ begin
  create policy "Superadmin full access platform_settings" on platform_settings
    for all using (auth.jwt() ->> 'role' = 'superadmin');
exception when duplicate_object then null; end $$;

-- ============================================================
-- 14. TRIGGER PARA AUTO-UPDATED_AT EM CONNECTIONS
-- ============================================================
DO $$ begin
  create trigger trg_connections_updated before update on connections
    for each row execute function update_updated_at();
exception when duplicate_object then null; end $$;

-- ============================================================
-- 15. RPC PARA VERIFICAR LIMITES DE LIGACOES
-- ============================================================
create or replace function can_call(
  p_tenant_id uuid,
  p_session_id uuid
)
returns jsonb as $$
declare
  v_plan_name text;
  v_max_concurrent int;
  v_max_per_day int;
  v_active_calls int;
  v_calls_today int;
  v_session_status text;
begin
  -- Buscar plano do tenant
  select t.plan_id into v_plan_name
  from tenants t where t.id = p_tenant_id;

  -- Buscar limites do plano
  select wl.max_concurrent_calls, wl.max_calls_per_day
  into v_max_concurrent, v_max_per_day
  from wacalls_plan_limits wl
  where wl.plan_name = v_plan_name and wl.active = true;

  -- Defaults se nao encontrar plano
  v_max_concurrent := coalesce(v_max_concurrent, 1);
  v_max_per_day := coalesce(v_max_per_day, 50);

  -- Verificar status da sessao
  select ws.status into v_session_status
  from wacalls_sessions ws where ws.id = p_session_id;

  if v_session_status != 'connected' then
    return jsonb_build_object('allowed', false, 'reason', 'session_not_connected');
  end if;

  -- Chamadas ativas nesta sessao
  select count(*) into v_active_calls
  from wacalls_calls wc
  where wc.session_id = p_session_id
    and wc.status = 'active';

  if v_active_calls >= v_max_concurrent then
    return jsonb_build_object('allowed', false, 'reason', 'max_concurrent_reached');
  end if;

  -- Chamadas hoje nesta sessao
  select count(*) into v_calls_today
  from wacalls_calls wc
  where wc.session_id = p_session_id
    and wc.created_at::date = current_date;

  if v_calls_today >= v_max_per_day then
    return jsonb_build_object('allowed', false, 'reason', 'max_daily_reached');
  end if;

  return jsonb_build_object(
    'allowed', true,
    'active_calls', v_active_calls,
    'calls_today', v_calls_today,
    'max_concurrent', v_max_concurrent,
    'max_per_day', v_max_per_day
  );
end;
$$ language plpgsql security definer;

-- ============================================================
-- 16. RPC PARA LISTAR SESSOES DO TENANT
-- ============================================================
create or replace function list_wacalls_sessions(p_tenant_id uuid)
returns table (
  id uuid,
  fork_session_id text,
  name text,
  phone_number text,
  status text,
  jid text,
  connection_id uuid,
  created_at timestamptz
) as $$
begin
  return query
  select ws.id, ws.fork_session_id, ws.name, ws.phone_number,
         ws.status, ws.jid, ws.connection_id, ws.created_at
  from wacalls_sessions ws
  where ws.tenant_id = p_tenant_id
  order by ws.created_at desc;
end;
$$ language plpgsql security definer;
