-- Bucket público para PDFs de OS enviados automaticamente (Issue #46)
insert into storage.buckets (id, name, public)
values ('os-documents', 'os-documents', true)
on conflict (id) do nothing;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'os_documents_public_read') THEN
    CREATE POLICY os_documents_public_read ON storage.objects
      FOR SELECT
      USING (bucket_id = 'os-documents');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'os_documents_auth_upload') THEN
    CREATE POLICY os_documents_auth_upload ON storage.objects
      FOR INSERT
      TO authenticated
      WITH CHECK (bucket_id = 'os-documents');
  END IF;
END $$;
