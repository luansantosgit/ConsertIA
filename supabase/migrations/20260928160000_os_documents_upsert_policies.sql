-- Upsert do PDF da OS reusa o mesmo path por OS: exige policies de UPDATE/DELETE no bucket
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'os_documents_auth_update') THEN
    CREATE POLICY os_documents_auth_update ON storage.objects
      FOR UPDATE
      TO authenticated
      USING (bucket_id = 'os-documents')
      WITH CHECK (bucket_id = 'os-documents');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'os_documents_auth_delete') THEN
    CREATE POLICY os_documents_auth_delete ON storage.objects
      FOR DELETE
      TO authenticated
      USING (bucket_id = 'os-documents');
  END IF;
END $$;
