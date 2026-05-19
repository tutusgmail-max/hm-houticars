-- Fix identity document uploads: profile column, reservations.documents, storage RLS, public URLs

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS identity_documents jsonb DEFAULT '{}'::jsonb;

ALTER TABLE public.reservations
  ADD COLUMN IF NOT EXISTS documents jsonb DEFAULT '{}'::jsonb;

-- Profiles: allow users to update their own row (WITH CHECK required on some projects)
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Documents bucket: public URLs + user-scoped write
UPDATE storage.buckets
SET public = true
WHERE id = 'documents';

INSERT INTO storage.buckets (id, name, public)
VALUES ('documents', 'documents', true)
ON CONFLICT (id) DO UPDATE SET public = true;

DROP POLICY IF EXISTS "Users upload own docs" ON storage.objects;
CREATE POLICY "Users upload own docs"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'documents'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

DROP POLICY IF EXISTS "Users view own docs" ON storage.objects;
CREATE POLICY "Users view own docs"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'documents'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

DROP POLICY IF EXISTS "Documents are publicly readable" ON storage.objects;
CREATE POLICY "Documents are publicly readable"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'documents');

DROP POLICY IF EXISTS "Users update own docs" ON storage.objects;
CREATE POLICY "Users update own docs"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'documents'
    AND (storage.foldername(name))[1] = auth.uid()::text
  )
  WITH CHECK (
    bucket_id = 'documents'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

DROP POLICY IF EXISTS "Users delete own docs" ON storage.objects;
CREATE POLICY "Users delete own docs"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'documents'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

DROP POLICY IF EXISTS "Admins view all docs" ON storage.objects;
CREATE POLICY "Admins view all docs"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'documents'
    AND EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.role = 'admin'
    )
  );

NOTIFY pgrst, 'reload schema';
