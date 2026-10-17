-- Glossário de importação: respostas da empresa sobre termos que a IA
-- não conhecia ("11" = iPhone 11, "ORI" = original). A IA consulta o
-- glossário em toda importação — pergunta uma vez, aprende para sempre.
create table if not exists ai_import_glossary (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  term text not null,
  meaning text not null,
  created_at timestamptz not null default now(),
  unique (tenant_id, term)
);

alter table ai_import_glossary enable row level security;

-- Tenant só vê/edita o próprio glossário
drop policy if exists "tenant_read_glossary" on ai_import_glossary;
create policy "tenant_read_glossary" on ai_import_glossary
  for select using (
    tenant_id = (nullif(auth.jwt() -> 'user_metadata' ->> 'tenant_id', ''))::uuid
    or auth.jwt() ->> 'role' = 'superadmin'
  );

drop policy if exists "tenant_write_glossary" on ai_import_glossary;
create policy "tenant_write_glossary" on ai_import_glossary
  for all using (
    tenant_id = (nullif(auth.jwt() -> 'user_metadata' ->> 'tenant_id', ''))::uuid
    or auth.jwt() ->> 'role' = 'superadmin'
  ) with check (
    tenant_id = (nullif(auth.jwt() -> 'user_metadata' ->> 'tenant_id', ''))::uuid
    or auth.jwt() ->> 'role' = 'superadmin'
  );
