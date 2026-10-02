-- ============================================================
-- Configuração do wizard público (/comece-agora):
-- vídeo de demonstração exibido no step 1 (cria expectativa no lead)
-- ============================================================

-- 1. Conteúdo do wizard na global_settings (leitura pública já existe
--    via policy "GS public read" — só URLs, sem segredos)
alter table global_settings add column if not exists wizard jsonb not null default '{}'::jsonb;

-- 2. Bucket público para a mídia do wizard
insert into storage.buckets (id, name, public)
values ('wizard-assets', 'wizard-assets', true)
on conflict (id) do nothing;

-- Upload/gerência apenas pelo superadmin
DO $$ begin
  create policy "Superadmin wizard assets write" on storage.objects
    for all to authenticated
    using (
      bucket_id = 'wizard-assets'
      and coalesce(auth.jwt() -> 'user_metadata' ->> 'role', '') = 'superadmin'
    )
    with check (
      bucket_id = 'wizard-assets'
      and coalesce(auth.jwt() -> 'user_metadata' ->> 'role', '') = 'superadmin'
    );
exception when duplicate_object then null; end $$;
