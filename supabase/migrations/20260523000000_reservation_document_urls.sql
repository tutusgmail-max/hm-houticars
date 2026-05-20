-- Reservation document URL columns (CIN + permis, recto/verso)
-- Run in Supabase SQL Editor

ALTER TABLE public.reservations
  ADD COLUMN IF NOT EXISTS cin_front_url text,
  ADD COLUMN IF NOT EXISTS cin_back_url text,
  ADD COLUMN IF NOT EXISTS permis_front_url text,
  ADD COLUMN IF NOT EXISTS permis_back_url text;

COMMENT ON COLUMN public.reservations.cin_front_url IS 'Public or signed URL — CIN recto';
COMMENT ON COLUMN public.reservations.cin_back_url IS 'Public or signed URL — CIN verso';
COMMENT ON COLUMN public.reservations.permis_front_url IS 'Public or signed URL — permis recto';
COMMENT ON COLUMN public.reservations.permis_back_url IS 'Public or signed URL — permis verso';

-- user_documents: allow 4 doc types
ALTER TABLE public.user_documents DROP CONSTRAINT IF EXISTS user_documents_doc_type_check;
ALTER TABLE public.user_documents
  ADD CONSTRAINT user_documents_doc_type_check
  CHECK (doc_type IN (
    'cin_front', 'cin_back', 'permis_front', 'permis_back',
    'cin_recto', 'cin_verso', 'permis', 'permis_recto', 'permis_verso'
  ));

NOTIFY pgrst, 'reload schema';
