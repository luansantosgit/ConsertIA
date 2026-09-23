-- Cria bucket de storage para fotos de OS
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'os-photos',
  'os-photos',
  true,
  5242880,
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/heic']
) on conflict (id) do nothing;

-- Política: qualquer autenticado pode fazer upload
DROP POLICY IF EXISTS "Authenticated upload os-photos" ON storage.objects;
create policy "Authenticated upload os-photos"
on storage.objects for insert
to authenticated
with check (bucket_id = 'os-photos');

-- Política: qualquer um pode ver (bucket público)
DROP POLICY IF EXISTS "Public read os-photos" ON storage.objects;
create policy "Public read os-photos"
on storage.objects for select
using (bucket_id = 'os-photos');

-- Política: dono pode deletar自己的文件
DROP POLICY IF EXISTS "Owner delete os-photos" ON storage.objects;
create policy "Owner delete os-photos"
on storage.objects for delete
using (bucket_id = 'os-photos' and auth.uid()::text = (storage.foldername(name))[1]);
