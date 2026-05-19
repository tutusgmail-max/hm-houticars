-- =============================================================================
-- user_documents: single table for CIN + permis (one row per doc type per user)
-- Private storage bucket — run ONLY in Supabase SQL Editor (no JavaScript/await)
-- =============================================================================

-- 1. Table
CREATE TABLE IF NOT EXISTS public.user_documents (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  doc_type      text NOT NULL CHECK (
    doc_type IN ('cin_recto', 'cin_verso', 'permis_recto', 'permis_verso')
  ),
  storage_path  text NOT NULL,
  uploaded_at   timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, doc_type)
);

CREATE INDEX IF NOT EXISTS idx_user_documents_user_id ON public.user_documents(user_id);

COMMENT ON TABLE public.user_documents IS
  'One row per identity file. storage_path = path inside private documents bucket.';

-- 2. RLS
ALTER TABLE public.user_documents ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users select own documents" ON public.user_documents;
CREATE POLICY "Users select own documents"
  ON public.user_documents FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Users insert own documents" ON public.user_documents;
CREATE POLICY "Users insert own documents"
  ON public.user_documents FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "Users update own documents" ON public.user_documents;
CREATE POLICY "Users update own documents"
  ON public.user_documents FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "Admins select all user documents" ON public.user_documents;
CREATE POLICY "Admins select all user documents"
  ON public.user_documents FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.role = 'admin'
    )
  );

-- 3. Migrate legacy JSONB from profiles (optional, safe if column empty)
INSERT INTO public.user_documents (user_id, doc_type, storage_path, uploaded_at)
SELECT
  p.id,
  e.key,
  COALESCE(e.value->>'path', ''),
  COALESCE((e.value->>'uploaded_at')::timestamptz, now())
FROM public.profiles p
CROSS JOIN LATERAL jsonb_each(p.identity_documents) AS e(key, value)
WHERE p.identity_documents IS NOT NULL
  AND e.key IN ('cin_recto', 'cin_verso', 'permis_recto', 'permis_verso')
  AND COALESCE(e.value->>'path', '') <> ''
ON CONFLICT (user_id, doc_type) DO UPDATE
  SET storage_path = EXCLUDED.storage_path,
      uploaded_at = EXCLUDED.uploaded_at;

-- 4. Private documents bucket (NOT public)
INSERT INTO storage.buckets (id, name, public)
VALUES ('documents', 'documents', false)
ON CONFLICT (id) DO UPDATE SET public = false;

-- Remove public read — files only via signed URLs + RLS
DROP POLICY IF EXISTS "Documents are publicly readable" ON storage.objects;

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
