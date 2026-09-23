-- Bucket público para checklist (permite upload sem login)
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'checklist-photos',
  'checklist-photos',
  true,
  5242880,
  ARRAY['image/jpeg', 'image/png', 'image/webp']
) on conflict (id) do nothing;

-- Qualquer um pode fazer upload (para checklist público)
DROP POLICY IF EXISTS "Public upload checklist-photos" ON storage.objects;
create policy "Public upload checklist-photos"
on storage.objects for insert
to anon
with check (bucket_id = 'checklist-photos');

-- Qualquer um pode ver
DROP POLICY IF EXISTS "Public read checklist-photos" ON storage.objects;
create policy "Public read checklist-photos"
on storage.objects for select
using (bucket_id = 'checklist-photos');
