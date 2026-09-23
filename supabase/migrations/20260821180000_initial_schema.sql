-- ============================================================
-- ConsertIA — Migration Completa
-- CRM + IA para Assistencia Tecnica (Multi-tenant)
-- ============================================================

create extension if not exists "pgcrypto";

-- ============================================================
-- 1. TENANTS
-- ============================================================
create table if not exists tenants (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text unique not null,
  active boolean not null default true,
  plan_id text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ============================================================
-- 2. USERS
-- ============================================================
create table if not exists users (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid references tenants(id) on delete cascade,
  email text unique not null,
  name text not null,
  role text not null default 'attendant'
    check (role in ('superadmin','admin','manager','technician','attendant')),
  active boolean not null default true,
  avatar_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists idx_users_tenant on users(tenant_id);
create index if not exists idx_users_email on users(email);

-- ============================================================
-- 3. PLANS
-- ============================================================
create table if not exists plans (
  id text primary key,
  name text not null,
  price numeric(10,2) not null default 0,
  max_users int not null default 3,
  max_os int not null default 100,
  features jsonb not null default '[]',
  featured boolean not null default false,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

insert into plans (id, name, price, max_users, max_os, features, featured) values
('starter', 'Starter', 149, 3, 100, '["Ate 3 usuarios","Ate 100 OS/mes","Dashboard basico","Clientes ilimitados","Suporte por e-mail"]', false),
('profissional', 'Profissional', 499, 10, 500, '["Ate 10 usuarios","Ate 500 OS/mes","Dashboard avancado","Relatorios completos","IA para diagnostico","Suporte prioritario"]', true),
('empresarial', 'Empresarial', 999, 9999, 9999, '["Usuarios ilimitados","OS ilimitadas","Multiplas filiais","API de integracao","IA avancada","Gerente de conta dedicado","SLA 99.9%"]', false)
on conflict (id) do nothing;

-- ============================================================
-- 4. TENANT THEMES
-- ============================================================
create table if not exists tenant_themes (
  tenant_id uuid primary key references tenants(id) on delete cascade,
  primary_color text not null default '#4f46e5',
  primary_dark text not null default '#4338ca',
  logo_url text,
  logo_text text not null default 'ConsertIA',
  favicon_url text,
  sidebar_dark boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ============================================================
-- 5. CUSTOMERS
-- ============================================================
create table if not exists customers (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  name text not null,
  email text,
  phone text,
  mobile text,
  cpf_cnpj text,
  address text,
  city text,
  state text,
  zip_code text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists idx_customers_tenant on customers(tenant_id);
create index if not exists idx_customers_name on customers(tenant_id, name);

-- ============================================================
-- 6. EQUIPMENT
-- ============================================================
create table if not exists equipment (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  customer_id uuid not null references customers(id) on delete cascade,
  type text not null,
  brand text not null,
  model text not null,
  serial_number text,
  color text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists idx_equipment_tenant on equipment(tenant_id);
create index if not exists idx_equipment_customer on equipment(customer_id);

-- ============================================================
-- 7. SERVICE ORDERS
-- ============================================================
DO $$ begin
  create type service_order_status as enum ('pending','diagnosis','awaiting_approval','approved','awaiting_part','in_progress','completed','ready','cancelled');
exception when duplicate_object then null; end $$;

DO $$ begin
  create type service_order_priority as enum ('low','medium','high','urgent');
exception when duplicate_object then null; end $$;

create table if not exists service_orders (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  customer_id uuid not null references customers(id) on delete cascade,
  equipment_id uuid references equipment(id),
  status service_order_status not null default 'pending',
  subject text not null,
  description text,
  diagnosis text,
  budget_amount numeric(10,2),
  approved_at timestamptz,
  started_at timestamptz,
  completed_at timestamptz,
  technician_id uuid references users(id),
  priority service_order_priority not null default 'medium',
  checklist_photos jsonb default '[]',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists idx_os_tenant on service_orders(tenant_id);
create index if not exists idx_os_tenant_status on service_orders(tenant_id, status);
create index if not exists idx_os_customer on service_orders(customer_id);

-- ============================================================
-- 8. PRODUCTS
-- ============================================================
create table if not exists products (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  name text not null,
  sku text not null,
  price numeric(10,2) not null default 0,
  cost numeric(10,2) default 0,
  stock_quantity int not null default 0,
  min_stock_quantity int default 2,
  category text not null default 'Outros',
  location text,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists idx_products_tenant on products(tenant_id);

-- ============================================================
-- 9. STOCK MOVEMENTS
-- ============================================================
create table if not exists stock_movements (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  product_id uuid not null references products(id) on delete cascade,
  type text not null check (type in ('in','out')),
  quantity int not null,
  ref text,
  os_id uuid references service_orders(id),
  created_at timestamptz not null default now()
);
create index if not exists idx_stock_mov_product on stock_movements(product_id);

-- ============================================================
-- 10. LEADS
-- ============================================================
DO $$ begin
  create type lead_status as enum ('new','contacted','qualified','converted','lost');
exception when duplicate_object then null; end $$;

DO $$ begin
  create type lead_source as enum ('whatsapp','phone','walk_in','website','referral');
exception when duplicate_object then null; end $$;

create table if not exists leads (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  name text not null,
  phone text,
  email text,
  source lead_source not null default 'walk_in',
  status lead_status not null default 'new',
  notes text,
  customer_id uuid references customers(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists idx_leads_tenant on leads(tenant_id);

-- ============================================================
-- 11. CONVERSATIONS
-- ============================================================
create table if not exists conversations (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  contact_phone text not null,
  contact_name text,
  customer_id uuid references customers(id),
  last_message_at timestamptz,
  unread_count int not null default 0,
  assigned_to uuid references users(id),
  status text not null default 'open' check (status in ('open','closed')),
  device_info text,
  notes text,
  ai_suggestion text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists idx_conv_tenant on conversations(tenant_id);

-- ============================================================
-- 12. MESSAGES
-- ============================================================
DO $$ begin
  create type message_direction as enum ('inbound','outbound');
exception when duplicate_object then null; end $$;

create table if not exists messages (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  conversation_id uuid not null references conversations(id) on delete cascade,
  sender_id uuid references users(id),
  contact_phone text not null,
  content text not null,
  direction message_direction not null,
  read boolean not null default false,
  os_card jsonb,
  created_at timestamptz not null default now()
);
create index if not exists idx_messages_conv on messages(conversation_id);

-- ============================================================
-- 13. TRANSACTIONS
-- ============================================================
DO $$ begin
  create type tx_type as enum ('income','expense');
exception when duplicate_object then null; end $$;

DO $$ begin
  create type tx_status as enum ('paid','pending','overdue');
exception when duplicate_object then null; end $$;

create table if not exists transactions (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  type tx_type not null,
  description text not null,
  amount numeric(10,2) not null,
  category text not null default 'Servico',
  ref text,
  status tx_status not null default 'paid',
  date date not null default current_date,
  created_at timestamptz not null default now()
);
create index if not exists idx_tx_tenant on transactions(tenant_id);

-- ============================================================
-- 14. CALENDAR EVENTS
-- ============================================================
DO $$ begin
  create type event_type as enum ('os','meeting','delivery');
exception when duplicate_object then null; end $$;

create table if not exists calendar_events (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  title text not null,
  customer text,
  technician text,
  date date not null,
  start_time time not null,
  end_time time not null,
  type event_type not null default 'os',
  color text,
  os_id uuid references service_orders(id),
  created_at timestamptz not null default now()
);
create index if not exists idx_events_tenant_date on calendar_events(tenant_id, date);

-- ============================================================
-- 15. AI CONFIGS
-- ============================================================
create table if not exists ai_configs (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  agent_name text not null default 'ConsertBot',
  agent_desc text,
  tone text not null default 'amigavel',
  prompts jsonb not null default '[]',
  toggles jsonb not null default '{}',
  blocked_words text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index if not exists idx_ai_configs_tenant on ai_configs(tenant_id);

-- ============================================================
-- 16. AI LOGS
-- ============================================================
create table if not exists ai_logs (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  user_name text,
  result text,
  rating text check (rating in ('positive','negative')),
  summary text,
  created_at timestamptz not null default now()
);

-- ============================================================
-- 17. TENANT SETTINGS
-- ============================================================
create table if not exists tenant_settings (
  tenant_id uuid primary key references tenants(id) on delete cascade,
  company_name text,
  cnpj text,
  phone text,
  whatsapp text,
  address text,
  language text not null default 'pt-BR',
  timezone text not null default 'America/Sao_Paulo',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ============================================================
-- TRIGGERS (auto updated_at)
-- ============================================================
create or replace function update_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

DO $$ begin
  create trigger trg_tenants_updated before update on tenants for each row execute function update_updated_at();
exception when duplicate_object then null; end $$;
DO $$ begin
  create trigger trg_users_updated before update on users for each row execute function update_updated_at();
exception when duplicate_object then null; end $$;
DO $$ begin
  create trigger trg_customers_updated before update on customers for each row execute function update_updated_at();
exception when duplicate_object then null; end $$;
DO $$ begin
  create trigger trg_equipment_updated before update on equipment for each row execute function update_updated_at();
exception when duplicate_object then null; end $$;
DO $$ begin
  create trigger trg_service_orders_updated before update on service_orders for each row execute function update_updated_at();
exception when duplicate_object then null; end $$;
DO $$ begin
  create trigger trg_products_updated before update on products for each row execute function update_updated_at();
exception when duplicate_object then null; end $$;
DO $$ begin
  create trigger trg_leads_updated before update on leads for each row execute function update_updated_at();
exception when duplicate_object then null; end $$;
DO $$ begin
  create trigger trg_conversations_updated before update on conversations for each row execute function update_updated_at();
exception when duplicate_object then null; end $$;
DO $$ begin
  create trigger trg_ai_configs_updated before update on ai_configs for each row execute function update_updated_at();
exception when duplicate_object then null; end $$;
DO $$ begin
  create trigger trg_tenant_settings_updated before update on tenant_settings for each row execute function update_updated_at();
exception when duplicate_object then null; end $$;
DO $$ begin
  create trigger trg_tenant_themes_updated before update on tenant_themes for each row execute function update_updated_at();
exception when duplicate_object then null; end $$;

-- ============================================================
-- RLS (Row Level Security)
-- ============================================================
alter table tenants enable row level security;
alter table users enable row level security;
alter table customers enable row level security;
alter table equipment enable row level security;
alter table service_orders enable row level security;
alter table products enable row level security;
alter table stock_movements enable row level security;
alter table leads enable row level security;
alter table conversations enable row level security;
alter table messages enable row level security;
alter table transactions enable row level security;
alter table calendar_events enable row level security;
alter table ai_configs enable row level security;
alter table ai_logs enable row level security;
alter table tenant_settings enable row level security;
alter table tenant_themes enable row level security;
alter table plans enable row level security;

-- Superadmin policies
DO $$ begin
  create policy "Superadmin full access tenants" on tenants for all using (auth.jwt() ->> 'role' = 'superadmin');
exception when duplicate_object then null; end $$;
DO $$ begin
  create policy "Superadmin full access users" on users for all using (auth.jwt() ->> 'role' = 'superadmin');
exception when duplicate_object then null; end $$;
DO $$ begin
  create policy "Superadmin full access plans" on plans for all using (auth.jwt() ->> 'role' = 'superadmin');
exception when duplicate_object then null; end $$;

-- Tenant isolation policies
DO $$ begin create policy "TI customers" on customers for all using (tenant_id::text = auth.jwt() ->> 'tenant_id'); exception when duplicate_object then null; end $$;
DO $$ begin create policy "TI equipment" on equipment for all using (tenant_id::text = auth.jwt() ->> 'tenant_id'); exception when duplicate_object then null; end $$;
DO $$ begin create policy "TI service_orders" on service_orders for all using (tenant_id::text = auth.jwt() ->> 'tenant_id'); exception when duplicate_object then null; end $$;
DO $$ begin create policy "TI products" on products for all using (tenant_id::text = auth.jwt() ->> 'tenant_id'); exception when duplicate_object then null; end $$;
DO $$ begin create policy "TI stock_movements" on stock_movements for all using (tenant_id::text = auth.jwt() ->> 'tenant_id'); exception when duplicate_object then null; end $$;
DO $$ begin create policy "TI leads" on leads for all using (tenant_id::text = auth.jwt() ->> 'tenant_id'); exception when duplicate_object then null; end $$;
DO $$ begin create policy "TI conversations" on conversations for all using (tenant_id::text = auth.jwt() ->> 'tenant_id'); exception when duplicate_object then null; end $$;
DO $$ begin create policy "TI messages" on messages for all using (tenant_id::text = auth.jwt() ->> 'tenant_id'); exception when duplicate_object then null; end $$;
DO $$ begin create policy "TI transactions" on transactions for all using (tenant_id::text = auth.jwt() ->> 'tenant_id'); exception when duplicate_object then null; end $$;
DO $$ begin create policy "TI calendar_events" on calendar_events for all using (tenant_id::text = auth.jwt() ->> 'tenant_id'); exception when duplicate_object then null; end $$;
DO $$ begin create policy "TI ai_configs" on ai_configs for all using (tenant_id::text = auth.jwt() ->> 'tenant_id'); exception when duplicate_object then null; end $$;
DO $$ begin create policy "TI ai_logs" on ai_logs for all using (tenant_id::text = auth.jwt() ->> 'tenant_id'); exception when duplicate_object then null; end $$;
DO $$ begin create policy "TI tenant_settings" on tenant_settings for all using (tenant_id::text = auth.jwt() ->> 'tenant_id'); exception when duplicate_object then null; end $$;
DO $$ begin create policy "TI tenant_themes" on tenant_themes for all using (tenant_id::text = auth.jwt() ->> 'tenant_id'); exception when duplicate_object then null; end $$;
DO $$ begin create policy "TI users" on users for all using (tenant_id::text = auth.jwt() ->> 'tenant_id'); exception when duplicate_object then null; end $$;

-- ============================================================
-- SEED DATA
-- ============================================================
insert into tenants (id, name, slug, plan_id) values
('a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'TechAssist Ltda', 'techassist', 'profissional'),
('b2c3d4e5-f6a7-8901-bcde-f12345678901', 'FixTech Reparos', 'fixtech', 'starter')
on conflict (id) do nothing;

insert into tenant_themes (tenant_id, primary_color, primary_dark, logo_text) values
('a1b2c3d4-e5f6-7890-abcd-ef1234567890', '#4f46e5', '#4338ca', 'TechAssist'),
('b2c3d4e5-f6a7-8901-bcde-f12345678901', '#7c3aed', '#6d28d9', 'FixTech')
on conflict (tenant_id) do nothing;

insert into tenant_settings (tenant_id, company_name, cnpj, phone, whatsapp, address) values
('a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'TechAssist Ltda', '12.345.678/0001-90', '(11) 3456-7890', '(11) 99999-0000', 'Av. Paulista, 1234'),
('b2c3d4e5-f6a7-8901-bcde-f12345678901', 'FixTech Reparos', '98.765.432/0001-10', '(21) 3456-7890', '(21) 98888-0000', 'Rua do Catete, 456')
on conflict (tenant_id) do nothing;

insert into customers (id, tenant_id, name, email, phone, cpf_cnpj, address, city, state, zip_code) values
('11111111-1111-1111-1111-111111111111', 'a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'Joao Silva', 'joao@email.com', '(11) 99999-1111', '123.456.789-00', 'Rua Augusta, 1000', 'Sao Paulo', 'SP', '01310-100'),
('22222222-2222-2222-2222-222222222222', 'a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'Maria Santos', 'maria@email.com', '(21) 99888-2222', '987.654.321-00', 'Rua do Catete, 200', 'Rio de Janeiro', 'RJ', '22220-000'),
('33333333-3333-3333-3333-333333333333', 'a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'Pedro Costa', 'pedro@email.com', '(31) 98888-3333', '456.789.123-00', 'Av. Brasil, 500', 'Belo Horizonte', 'MG', '30000-000'),
('44444444-4444-4444-4444-444444444444', 'a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'Ana Lima', 'ana@email.com', '(85) 97777-4444', '321.654.987-00', 'Rua Principal, 300', 'Fortaleza', 'CE', '60000-000'),
('55555555-5555-5555-5555-555555555555', 'a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'Lucas Ferreira', 'lucas@email.com', '(41) 97666-5555', '654.321.987-00', 'Rua XV de Novembro, 800', 'Curitiba', 'PR', '80000-000')
on conflict (id) do nothing;

insert into equipment (id, tenant_id, customer_id, type, brand, model, serial_number) values
('33333333-3333-3333-3333-333333333301', 'a1b2c3d4-e5f6-7890-abcd-ef1234567890', '11111111-1111-1111-1111-111111111111', 'Smartphone', 'Apple', 'iPhone 14 Pro', 'SN001'),
('33333333-3333-3333-3333-333333333302', 'a1b2c3d4-e5f6-7890-abcd-ef1234567890', '22222222-2222-2222-2222-222222222222', 'Smartphone', 'Samsung', 'Galaxy S21', 'SN002'),
('33333333-3333-3333-3333-333333333303', 'a1b2c3d4-e5f6-7890-abcd-ef1234567890', '33333333-3333-3333-3333-333333333333', 'Notebook', 'Dell', 'Inspiron 15', 'SN003'),
('33333333-3333-3333-3333-333333333304', 'a1b2c3d4-e5f6-7890-abcd-ef1234567890', '44444444-4444-4444-4444-444444444444', 'Tablet', 'Apple', 'iPad Air 5th Gen', 'SN004'),
('33333333-3333-3333-3333-333333333305', 'a1b2c3d4-e5f6-7890-abcd-ef1234567890', '55555555-5555-5555-5555-555555555555', 'Console', 'Sony', 'PS5', 'SN005')
on conflict (id) do nothing;

insert into products (id, tenant_id, name, sku, price, cost, stock_quantity, min_stock_quantity, category, location) values
('11111111-1111-1111-1111-111111111101', 'a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'Display iPhone 14 Pro', 'DIP14P-001', 280, 180, 5, 2, 'Displays', 'Prateleira A1'),
('11111111-1111-1111-1111-111111111102', 'a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'Bateria Samsung S21', 'BAT-SS21-002', 90, 45, 1, 3, 'Baterias', 'Prateleira B2'),
('11111111-1111-1111-1111-111111111103', 'a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'Conector USB-C', 'CON-USBC-003', 40, 15, 12, 5, 'Conectores', 'Gaveta C3'),
('11111111-1111-1111-1111-111111111104', 'a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'HD SSD 256GB', 'HDD-SSD256-004', 250, 160, 3, 2, 'Armazenamento', 'Prateleira D1'),
('11111111-1111-1111-1111-111111111105', 'a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'Bateria iPhone 13', 'BAT-IP13-005', 120, 70, 0, 2, 'Baterias', 'Prateleira B1')
on conflict (id) do nothing;

insert into conversations (id, tenant_id, contact_phone, contact_name, customer_id, last_message_at, unread_count, status, device_info, notes, ai_suggestion) values
('22222222-2222-2222-2222-222222222201', 'a1b2c3d4-e5f6-7890-abcd-ef1234567890', '+5511999991111', 'Joao Silva', '11111111-1111-1111-1111-111111111111', now() - interval '5 minutes', 3, 'open', 'iPhone 14 Pro', 'Cliente preferencial', 'Resposta urgente recomendada'),
('22222222-2222-2222-2222-222222222202', 'a1b2c3d4-e5f6-7890-abcd-ef1234567890', '+5521998882222', 'Maria Santos', '22222222-2222-2222-2222-222222222222', now() - interval '1 hour', 1, 'open', 'Samsung S21', 'Caiu na agua', 'OS em diagnostico'),
('22222222-2222-2222-2222-222222222203', 'a1b2c3d4-e5f6-7890-abcd-ef1234567890', '+5531988883333', 'Pedro Costa', '33333333-3333-3333-3333-333333333333', now() - interval '1 day', 0, 'open', 'Notebook Dell', 'Backup solicitado', null),
('22222222-2222-2222-2222-222222222204', 'a1b2c3d4-e5f6-7890-abcd-ef1234567890', '+5585977774444', 'Ana Lima', '44444444-4444-4444-4444-444444444444', now() - interval '2 days', 0, 'closed', 'iPad Air 5th Gen', 'Garantia 90 dias', null)
on conflict (id) do nothing;

insert into transactions (tenant_id, type, description, amount, category, ref, status, date) values
('a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'income', 'OS-0124 Troca Display iPhone', 350, 'Servico', 'OS-0124', 'paid', current_date),
('a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'income', 'OS-0123 Reparo Samsung S21', 280, 'Servico', 'OS-0123', 'pending', current_date - 1),
('a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'expense', 'Compra Display iPhone 14 Pro (x3)', 540, 'Estoque', null, 'paid', current_date - 3),
('a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'expense', 'Aluguel loja Agosto/2026', 2200, 'Despesas Fixas', null, 'paid', current_date - 20)
on conflict do nothing;

insert into calendar_events (tenant_id, title, customer, technician, date, start_time, end_time, type, color) values
('a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'Diagnostico iPhone 14 Pro', 'Joao Silva', 'Carlos T.', current_date, '09:00', '10:00', 'os', '#4f46e5'),
('a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'Entrega Samsung S21', 'Maria Santos', 'Pedro M.', current_date, '11:00', '11:30', 'delivery', '#10b981'),
('a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'Reuniao de equipe', null, 'Todos', current_date, '12:00', '13:00', 'meeting', '#f59e0b')
on conflict do nothing;

-- Disabilitar RLS temporariamente para o superadmin poder acessar tudo durante dev
-- Descomente a linha abaixo se precisar de acesso total sem auth:
-- alter table tenants disable row level security;
