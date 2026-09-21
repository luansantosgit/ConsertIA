-- ============================================================
-- AI AGENT FOUNDATION (Fase 0 do plano-agente-ia.md)
-- 1. Alinha ai_configs/ai_logs com o tipo TS (divergencia historica)
-- 2. Novas tabelas: ai_agent_settings, ai_quote_settings,
--    ai_pre_quote_templates, ai_diagnosis_settings, ai_device_coverage
-- 3. Provider central + cotas: platform_ai_config, tenant_ai_entitlements,
--    plans.ai_token_limit, ai_token_usage
-- 4. Extensões: conversations.ai_state, messages.sender_type,
--    connections.ai_enabled, products (part matching)
-- ============================================================

-- ------------------------------------------------------------
-- 1. ALINHAR ai_configs COM O FRONT (provider/model/system_prompt/active)
-- ------------------------------------------------------------
alter table ai_configs add column if not exists provider text default 'openrouter';
alter table ai_configs add column if not exists model text default 'openai/gpt-4o-mini';
alter table ai_configs add column if not exists api_key text;
alter table ai_configs add column if not exists max_tokens int default 1500;
alter table ai_configs add column if not exists temperature numeric(3,2) default 0.7;
alter table ai_configs add column if not exists system_prompt text;
alter table ai_configs add column if not exists active boolean not null default true;

-- ------------------------------------------------------------
-- 2. ALINHAR ai_logs COM O FRONT (tokens/custo/tempo/tools)
-- ------------------------------------------------------------
alter table ai_logs add column if not exists conversation_id uuid references conversations(id) on delete set null;
alter table ai_logs add column if not exists message_id uuid references messages(id) on delete set null;
alter table ai_logs add column if not exists provider text;
alter table ai_logs add column if not exists model text;
alter table ai_logs add column if not exists input_tokens bigint not null default 0;
alter table ai_logs add column if not exists output_tokens bigint not null default 0;
alter table ai_logs add column if not exists cost numeric(10,6) not null default 0;
alter table ai_logs add column if not exists response_time_ms int;
alter table ai_logs add column if not exists success boolean not null default true;
alter table ai_logs add column if not exists error_message text;
alter table ai_logs add column if not exists tools_used jsonb not null default '[]';
create index if not exists idx_ai_logs_tenant_conversation on ai_logs(tenant_id, conversation_id);

-- ------------------------------------------------------------
-- 3. AI AGENT SETTINGS (1/tenant) — roteiro do agente
-- ------------------------------------------------------------
create table if not exists ai_agent_settings (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  agent_name text not null default 'Assistente',
  greeting_enabled boolean not null default true,
  typing_simulation boolean not null default true,
  active boolean not null default false,
  post_handoff_behavior text not null default 'continue'
    check (post_handoff_behavior in ('continue','pause')),
  handoff_message text not null default 'Um instante, nossos atendentes vão te chamar em breve!',
  transfer_message text not null default 'Um dos especialistas da nossa equipe vai te atender em breve!',
  uncovered_transfer boolean not null default true,
  auto_os_enabled boolean not null default true,
  auto_schedule_enabled boolean not null default true,
  openrouter_model text not null default 'openai/gpt-4o-mini',
  own_api_key text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(tenant_id)
);

-- ------------------------------------------------------------
-- 4. AI QUOTE SETTINGS (1/tenant) — orçamentos + mão de obra
-- ------------------------------------------------------------
create table if not exists ai_quote_settings (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  labor_enabled boolean not null default false,
  labor_mode text not null default 'included'
    check (labor_mode in ('separate','included')),
  labor_type text not null default 'fixed'
    check (labor_type in ('fixed','percent')),
  labor_value numeric(10,2) not null default 0,
  quote_template text not null default 'Olá, {cliente}! Segue o orçamento para o reparo do seu {aparelho}:

🔧 Serviço: {servico}
💰 Valor: {valor_total}

Posso já agendar a manutenção para você. Para qual data você quer?',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(tenant_id)
);

-- ------------------------------------------------------------
-- 5. AI PRE-QUOTE TEMPLATES — templates diferenciais (antes do orçamento)
-- ------------------------------------------------------------
create table if not exists ai_pre_quote_templates (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  title text not null,
  type text not null default 'text' check (type in ('text','media')),
  content text not null default '',
  media_url text,
  sort_order int not null default 0,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists idx_ai_pre_quote_templates_tenant on ai_pre_quote_templates(tenant_id, active, sort_order);

-- ------------------------------------------------------------
-- 6. AI DIAGNOSIS SETTINGS (1/tenant) — tela vs vidro
-- ------------------------------------------------------------
create table if not exists ai_diagnosis_settings (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  repair_mode text not null default 'screen_only'
    check (repair_mode in ('screen_only','screen_and_glass')),
  glass_rules text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(tenant_id)
);

-- ------------------------------------------------------------
-- 7. AI DEVICE COVERAGE — aparelhos atendidos (tipo + marcas)
-- ------------------------------------------------------------
create table if not exists ai_device_coverage (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  device_type text not null,
  brands jsonb not null default '[]',
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(tenant_id, device_type)
);

-- ------------------------------------------------------------
-- 8. PROVIDER CENTRAL + COTAS (Superadmin)
-- ------------------------------------------------------------
create table if not exists platform_ai_config (
  id uuid primary key default gen_random_uuid(),
  openrouter_token text,
  distribution_mode text not null default 'selected'
    check (distribution_mode in ('all','selected')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists tenant_ai_entitlements (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  use_platform_token boolean not null default true,
  token_limit_override bigint,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(tenant_id)
);

alter table plans add column if not exists ai_token_limit bigint not null default 0;

create table if not exists ai_token_usage (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  period text not null,
  tokens_in bigint not null default 0,
  tokens_out bigint not null default 0,
  cost numeric(10,4) not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(tenant_id, period)
);

-- ------------------------------------------------------------
-- 9. EXTENSÕES: conversas, mensagens, canal, produtos
-- ------------------------------------------------------------
alter table conversations add column if not exists ai_state text not null default 'attending'
  check (ai_state in ('attending','handed_off','paused','off'));
create index if not exists idx_conv_tenant_ai_state on conversations(tenant_id, ai_state);

alter table messages add column if not exists sender_type text
  check (sender_type in ('customer','ai','attendant'));
update messages set sender_type = 'customer' where direction = 'inbound' and sender_type is null;
update messages set sender_type = 'attendant' where direction = 'outbound' and sender_type is null;

alter table connections add column if not exists ai_enabled boolean not null default false;

alter table products add column if not exists part_type text;
alter table products add column if not exists device_brand text;
alter table products add column if not exists device_model text;
create index if not exists idx_products_tenant_part on products(tenant_id, part_type);

-- ------------------------------------------------------------
-- 10. TRIGGERS updated_at para tabelas novas
-- ------------------------------------------------------------
DO $$ begin create trigger trg_ai_agent_settings_updated before update on ai_agent_settings for each row execute function update_updated_at(); exception when duplicate_object then null; end $$;
DO $$ begin create trigger trg_ai_quote_settings_updated before update on ai_quote_settings for each row execute function update_updated_at(); exception when duplicate_object then null; end $$;
DO $$ begin create trigger trg_ai_pre_quote_templates_updated before update on ai_pre_quote_templates for each row execute function update_updated_at(); exception when duplicate_object then null; end $$;
DO $$ begin create trigger trg_ai_diagnosis_settings_updated before update on ai_diagnosis_settings for each row execute function update_updated_at(); exception when duplicate_object then null; end $$;
DO $$ begin create trigger trg_ai_device_coverage_updated before update on ai_device_coverage for each row execute function update_updated_at(); exception when duplicate_object then null; end $$;
DO $$ begin create trigger trg_platform_ai_config_updated before update on platform_ai_config for each row execute function update_updated_at(); exception when duplicate_object then null; end $$;
DO $$ begin create trigger trg_tenant_ai_entitlements_updated before update on tenant_ai_entitlements for each row execute function update_updated_at(); exception when duplicate_object then null; end $$;
DO $$ begin create trigger trg_ai_token_usage_updated before update on ai_token_usage for each row execute function update_updated_at(); exception when duplicate_object then null; end $$;

-- ------------------------------------------------------------
-- 11. RLS para tabelas novas
-- ------------------------------------------------------------
alter table ai_agent_settings enable row level security;
alter table ai_quote_settings enable row level security;
alter table ai_pre_quote_templates enable row level security;
alter table ai_diagnosis_settings enable row level security;
alter table ai_device_coverage enable row level security;
alter table platform_ai_config enable row level security;
alter table tenant_ai_entitlements enable row level security;
alter table ai_token_usage enable row level security;

-- Superadmin full access
DO $$ begin create policy "Superadmin full access ai_agent_settings" on ai_agent_settings for all using (auth.jwt() ->> 'role' = 'superadmin'); exception when duplicate_object then null; end $$;
DO $$ begin create policy "Superadmin full access ai_quote_settings" on ai_quote_settings for all using (auth.jwt() ->> 'role' = 'superadmin'); exception when duplicate_object then null; end $$;
DO $$ begin create policy "Superadmin full access ai_pre_quote_templates" on ai_pre_quote_templates for all using (auth.jwt() ->> 'role' = 'superadmin'); exception when duplicate_object then null; end $$;
DO $$ begin create policy "Superadmin full access ai_diagnosis_settings" on ai_diagnosis_settings for all using (auth.jwt() ->> 'role' = 'superadmin'); exception when duplicate_object then null; end $$;
DO $$ begin create policy "Superadmin full access ai_device_coverage" on ai_device_coverage for all using (auth.jwt() ->> 'role' = 'superadmin'); exception when duplicate_object then null; end $$;
DO $$ begin create policy "Superadmin full access platform_ai_config" on platform_ai_config for all using (auth.jwt() ->> 'role' = 'superadmin'); exception when duplicate_object then null; end $$;
DO $$ begin create policy "Superadmin full access tenant_ai_entitlements" on tenant_ai_entitlements for all using (auth.jwt() ->> 'role' = 'superadmin'); exception when duplicate_object then null; end $$;
DO $$ begin create policy "Superadmin full access ai_token_usage" on ai_token_usage for all using (auth.jwt() ->> 'role' = 'superadmin'); exception when duplicate_object then null; end $$;

-- Tenant isolation (leitura+escrita das próprias configs)
DO $$ begin create policy "TI ai_agent_settings" on ai_agent_settings for all using (tenant_id::text = auth.jwt() ->> 'tenant_id'); exception when duplicate_object then null; end $$;
DO $$ begin create policy "TI ai_quote_settings" on ai_quote_settings for all using (tenant_id::text = auth.jwt() ->> 'tenant_id'); exception when duplicate_object then null; end $$;
DO $$ begin create policy "TI ai_pre_quote_templates" on ai_pre_quote_templates for all using (tenant_id::text = auth.jwt() ->> 'tenant_id'); exception when duplicate_object then null; end $$;
DO $$ begin create policy "TI ai_diagnosis_settings" on ai_diagnosis_settings for all using (tenant_id::text = auth.jwt() ->> 'tenant_id'); exception when duplicate_object then null; end $$;
DO $$ begin create policy "TI ai_device_coverage" on ai_device_coverage for all using (tenant_id::text = auth.jwt() ->> 'tenant_id'); exception when duplicate_object then null; end $$;

-- Tenant somente leitura de entitlements/consumo (escrita só superadmin/edge)
DO $$ begin create policy "TI read tenant_ai_entitlements" on tenant_ai_entitlements for select using (tenant_id::text = auth.jwt() ->> 'tenant_id'); exception when duplicate_object then null; end $$;
DO $$ begin create policy "TI read ai_token_usage" on ai_token_usage for select using (tenant_id::text = auth.jwt() ->> 'tenant_id'); exception when duplicate_object then null; end $$;
