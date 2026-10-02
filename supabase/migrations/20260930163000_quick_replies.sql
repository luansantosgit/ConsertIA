-- ============================================================
-- Respostas rápidas por tenant (usadas no chat com "/")
--   parts: [{type:'text',text}, {type:'media',url,caption}]
--   Sequências ("com cadência") enviam cada parte com 1,5s de delay.
-- ============================================================
create table if not exists quick_replies (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  shortcut text not null,
  title text not null,
  parts jsonb not null default '[]',
  is_default boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (tenant_id, shortcut)
);
create index if not exists idx_quickreplies_tenant on quick_replies(tenant_id);

alter table quick_replies enable row level security;
DO $$ begin
  create policy "TI quick_replies" on quick_replies
    for all to authenticated
    using (tenant_id = (nullif(auth.jwt() -> 'user_metadata' ->> 'tenant_id', ''))::uuid)
    with check (tenant_id = (nullif(auth.jwt() -> 'user_metadata' ->> 'tenant_id', ''))::uuid);
exception when duplicate_object then null; end $$;
DO $$ begin
  create policy "Superadmin quick_replies" on quick_replies
    for all to authenticated
    using (coalesce(auth.jwt() -> 'user_metadata' ->> 'role', '') = 'superadmin');
exception when duplicate_object then null; end $$;

-- Seed padrão: resposta rápida de endereço completo com os dados
-- reais já cadastrados de cada empresa
insert into quick_replies (tenant_id, shortcut, title, parts, is_default)
select
  ts.tenant_id,
  'endereco',
  'Endereço completo',
  jsonb_build_array(jsonb_build_object(
    'type', 'text',
    'text', concat_ws(
      ' | ',
      nullif(ts.company_name, ''),
      nullif(ts.address, ''),
      case when ts.phone is not null and ts.phone <> '' then concat('Tel: ', ts.phone) end,
      case when ts.whatsapp is not null and ts.whatsapp <> '' then concat('WhatsApp: ', ts.whatsapp) end
    )
  )),
  true
from tenant_settings ts
where ts.address is not null and ts.address <> ''
on conflict (tenant_id, shortcut) do nothing;

-- Bucket público para mídias das respostas rápidas (upload por tenant)
insert into storage.buckets (id, name, public)
values ('quick-replies', 'quick-replies', true)
on conflict (id) do nothing;

DO $$ begin
  create policy "Tenant quick-replies upload" on storage.objects
    for all to authenticated
    using (
      bucket_id = 'quick-replies'
      and (storage.foldername(name))[1] = coalesce(auth.jwt() -> 'user_metadata' ->> 'tenant_id', '')
    )
    with check (
      bucket_id = 'quick-replies'
      and (storage.foldername(name))[1] = coalesce(auth.jwt() -> 'user_metadata' ->> 'tenant_id', '')
    );
exception when duplicate_object then null; end $$;
