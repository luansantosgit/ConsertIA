-- Tema global da plataforma (superadmin) persistido no banco.
-- Antes vivia apenas no localStorage do navegador, quebrando o branding
-- em outras origens (ex: deploy do Vercel).

create table if not exists global_settings (
  id uuid primary key default gen_random_uuid(),
  theme jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

insert into global_settings (id) values ('00000000-0000-0000-0000-000000000001')
on conflict (id) do nothing;

alter table global_settings enable row level security;

-- Leitura pública (anon incluso): o tema global só contém cores/nome/logos,
-- sem segredos — necessário para o branding pré-login.
DO $$ begin
  create policy "GS public read" on global_settings
    for select to anon, authenticated
    using (true);
exception when duplicate_object then null; end $$;

-- Escrita apenas superadmin (padrão JWT user_metadata do projeto).
DO $$ begin
  create policy "GS superadmin write" on global_settings
    for all to authenticated
    using (coalesce(auth.jwt() -> 'user_metadata' ->> 'role', '') = 'superadmin')
    with check (coalesce(auth.jwt() -> 'user_metadata' ->> 'role', '') = 'superadmin');
exception when duplicate_object then null; end $$;
