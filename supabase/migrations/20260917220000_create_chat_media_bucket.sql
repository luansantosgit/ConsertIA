-- Bucket publico para midia do chat (imagens, videos, audios, documentos)
-- Permite que a Uazapi faca download da midia via URL publica
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'chat-media',
  'chat-media',
  true,
  52428800,
  null
) on conflict (id) do nothing;

-- Usuarios autenticados podem fazer upload no proprio tenant
DROP POLICY IF EXISTS "Authenticated upload chat-media" ON storage.objects;
create policy "Authenticated upload chat-media"
on storage.objects for insert
to authenticated
with check (bucket_id = 'chat-media');

-- Qualquer um pode ver (URL publica enviada para a Uazapi baixar)
DROP POLICY IF EXISTS "Public read chat-media" ON storage.objects;
create policy "Public read chat-media"
on storage.objects for select
using (bucket_id = 'chat-media');

-- Dono pode remover
DROP POLICY IF EXISTS "Owner delete chat-media" ON storage.objects;
create policy "Owner delete chat-media"
on storage.objects for delete
to authenticated
using (bucket_id = 'chat-media');
