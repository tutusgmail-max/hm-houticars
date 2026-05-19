-- Permanent identity documents on user profile (CIN + permis)

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS identity_documents jsonb DEFAULT '{}'::jsonb;

COMMENT ON COLUMN public.profiles.identity_documents IS
  '{ cin_recto: { path, url, uploaded_at }, ..., complete: bool, updated_at }';

-- Allow users to replace identity files (upsert)
DROP POLICY IF EXISTS "Users update own docs" ON storage.objects;
CREATE POLICY "Users update own docs"
  ON storage.objects FOR UPDATE
  USING (
    bucket_id = 'documents' AND
    (storage.foldername(name))[1] = auth.uid()::text
  )
  WITH CHECK (
    bucket_id = 'documents' AND
    (storage.foldername(name))[1] = auth.uid()::text
  );

NOTIFY pgrst, 'reload schema';
