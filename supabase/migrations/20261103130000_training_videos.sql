-- ============================================================
-- Treinamento (issue #100): portal de vídeos estilo Netflix
-- Conteúdo GLOBAL da plataforma (sem tenant_id), à la `plans`:
-- superadmin sobe os vídeos, todos os usuários assistem.
-- ============================================================

create table if not exists public.training_videos (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text not null default '',
  topic text not null default 'Geral',
  source text not null default 'storage' check (source in ('storage', 'youtube')),
  url text not null,
  thumbnail_url text,
  sort_order integer not null default 0,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists idx_training_videos_active on public.training_videos(active, sort_order);
create index if not exists idx_training_videos_topic on public.training_videos(topic);

alter table public.training_videos enable row level security;

-- Leitura: qualquer usuário autenticado (qualquer tenant, qualquer cargo)
DROP POLICY IF EXISTS "Authenticated read training_videos" ON public.training_videos;
create policy "Authenticated read training_videos"
on public.training_videos for select
to authenticated
using (true);

-- Escrita: só superadmin (claim vive em auth.jwt() -> 'user_metadata' ->> 'role')
DROP POLICY IF EXISTS "Superadmin full access training_videos" ON public.training_videos;
create policy "Superadmin full access training_videos"
on public.training_videos for all
using (coalesce(auth.jwt() -> 'user_metadata' ->> 'role', '') = 'superadmin')
with check (coalesce(auth.jwt() -> 'user_metadata' ->> 'role', '') = 'superadmin');

-- ============================================================
-- Bucket de storage: vídeos em `videos/`, thumbnails em `thumbs/`
-- ============================================================
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'training-videos',
  'training-videos',
  true,
  1073741824,
  ARRAY[
    'video/mp4', 'video/webm', 'video/quicktime', 'video/x-m4v',
    'image/jpeg', 'image/png', 'image/webp'
  ]
) on conflict (id) do update
  set file_size_limit = 1073741824,
      allowed_mime_types = ARRAY[
        'video/mp4', 'video/webm', 'video/quicktime', 'video/x-m4v',
        'image/jpeg', 'image/png', 'image/webp'
      ],
      public = true;

-- Upload/atualização/remoção de arquivos: só superadmin
DROP POLICY IF EXISTS "Superadmin write training-videos" ON storage.objects;
create policy "Superadmin write training-videos"
on storage.objects for all
to authenticated
using (
  bucket_id = 'training-videos'
  and coalesce(auth.jwt() -> 'user_metadata' ->> 'role', '') = 'superadmin'
)
with check (
  bucket_id = 'training-videos'
  and coalesce(auth.jwt() -> 'user_metadata' ->> 'role', '') = 'superadmin'
);

-- Leitura dos arquivos (bucket público já serve assets, mas a API de
-- select também passa por policy)
DROP POLICY IF EXISTS "Public read training-videos" ON storage.objects;
create policy "Public read training-videos"
on storage.objects for select
using (bucket_id = 'training-videos');
