-- CIN front + permis only — Storage bucket "documents" + user_documents table
-- Run in Supabase SQL Editor (SQL only, no JavaScript)

-- Bucket (private recommended; your INSERT policy works on bucket_id = 'documents')
INSERT INTO storage.buckets (id, name, public)
VALUES ('documents', 'documents', false)
ON CONFLICT (id) DO NOTHING;

-- Table: one row per user per document type
CREATE TABLE IF NOT EXISTS public.user_documents (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  doc_type      text NOT NULL,
  storage_path  text NOT NULL,
  uploaded_at   timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, doc_type)
);

-- Allow only the two required types (drop old 4-type constraint if present)
ALTER TABLE public.user_documents DROP CONSTRAINT IF EXISTS user_documents_doc_type_check;
ALTER TABLE public.user_documents
  ADD CONSTRAINT user_documents_doc_type_check
  CHECK (doc_type IN ('cin_recto', 'permis'));

CREATE INDEX IF NOT EXISTS idx_user_documents_user_id ON public.user_documents(user_id);

ALTER TABLE public.user_documents ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users select own documents" ON public.user_documents;
CREATE POLICY "Users select own documents"
  ON public.user_documents FOR SELECT TO authenticated
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Users insert own documents" ON public.user_documents;
CREATE POLICY "Users insert own documents"
  ON public.user_documents FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "Users update own documents" ON public.user_documents;
CREATE POLICY "Users update own documents"
  ON public.user_documents FOR UPDATE TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Storage: read own files (required for createSignedUrl previews)
DROP POLICY IF EXISTS "Allow authenticated read own documents" ON storage.objects;
CREATE POLICY "Allow authenticated read own documents"
  ON storage.objects FOR SELECT TO authenticated
  USING (
    bucket_id = 'documents'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- Your existing INSERT policy is sufficient for uploads:
-- create policy "Allow authenticated uploads" on storage.objects for insert ...

NOTIFY pgrst, 'reload schema';
