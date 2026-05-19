-- =============================================================================
-- HM Houti Cars — Booking System v3.1 Fixes
-- Migration: 20260519_booking_system_v31_fixes.sql
-- Idempotente : réexécutable sans erreur (clean install & update)
-- =============================================================================

-- ─── 1. Ensure reservations table has all needed columns ─────────────────────

ALTER TABLE reservations
  ADD COLUMN IF NOT EXISTS ref               text,
  ADD COLUMN IF NOT EXISTS total             numeric(10,2),
  ADD COLUMN IF NOT EXISTS pickup_location   text,
  ADD COLUMN IF NOT EXISTS return_location   text,
  ADD COLUMN IF NOT EXISTS documents         jsonb DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS cin_front_url     text,
  ADD COLUMN IF NOT EXISTS cin_back_url      text,
  ADD COLUMN IF NOT EXISTS permis_front_url  text,
  ADD COLUMN IF NOT EXISTS permis_back_url   text,
  ADD COLUMN IF NOT EXISTS customer_email    text,
  ADD COLUMN IF NOT EXISTS updated_at        timestamptz DEFAULT now();

-- Sync reference column aliases
ALTER TABLE reservations
  ADD COLUMN IF NOT EXISTS "reference" text;

-- Back-fill reference from ref
UPDATE reservations SET "reference" = ref       WHERE "reference" IS NULL AND ref IS NOT NULL;
UPDATE reservations SET ref = "reference"       WHERE ref IS NULL         AND "reference" IS NOT NULL;

-- Back-fill total from total_price
UPDATE reservations SET total       = total_price WHERE total       IS NULL AND total_price IS NOT NULL;
UPDATE reservations SET total_price = total       WHERE total_price IS NULL AND total       IS NOT NULL;


-- ─── 2. updated_at trigger ────────────────────────────────────────────────────

-- Function : CREATE OR REPLACE est déjà idempotent
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- Trigger : DROP IF EXISTS + CREATE
DROP TRIGGER IF EXISTS set_reservations_updated_at ON reservations;
CREATE TRIGGER set_reservations_updated_at
  BEFORE UPDATE ON reservations
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();


-- ─── 3. user_documents table (if missing) ────────────────────────────────────

CREATE TABLE IF NOT EXISTS user_documents (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  doc_type     text NOT NULL CHECK (doc_type IN ('cin_front','cin_back','permis_front','permis_back')),
  storage_path text NOT NULL,
  uploaded_at  timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, doc_type)
);


-- ─── 4. RLS — reservations ────────────────────────────────────────────────────

ALTER TABLE reservations ENABLE ROW LEVEL SECURITY;

-- Supprimer TOUTES les variantes de noms connues (anciens + nouveaux)
DROP POLICY IF EXISTS "Users can view own reservations"   ON reservations;
DROP POLICY IF EXISTS "Users can insert own reservations" ON reservations;
DROP POLICY IF EXISTS "Admins can view all reservations"  ON reservations;
DROP POLICY IF EXISTS "Admins can update reservations"    ON reservations;
DROP POLICY IF EXISTS "Users read own"                    ON reservations;
DROP POLICY IF EXISTS "Users insert own"                  ON reservations;
DROP POLICY IF EXISTS "Admin full access"                 ON reservations;
DROP POLICY IF EXISTS "Users read own reservations"       ON reservations;
DROP POLICY IF EXISTS "Users insert own reservations"     ON reservations;
DROP POLICY IF EXISTS "Admin full access on reservations" ON reservations;

-- User : lecture de ses propres réservations
CREATE POLICY "Users read own reservations"
  ON reservations FOR SELECT
  USING (auth.uid() = user_id);

-- User : insertion (statut initial = pending uniquement)
CREATE POLICY "Users insert own reservations"
  ON reservations FOR INSERT
  WITH CHECK (
    auth.uid() = user_id
    AND status = 'pending'
  );

-- Admin : accès complet
CREATE POLICY "Admin full access on reservations"
  ON reservations FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id   = auth.uid()
        AND profiles.role = 'admin'
    )
  );


-- ─── 5. RLS — user_documents ─────────────────────────────────────────────────

ALTER TABLE user_documents ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users read own documents"   ON user_documents;
DROP POLICY IF EXISTS "Users insert own documents" ON user_documents;
DROP POLICY IF EXISTS "Users upsert own documents" ON user_documents;
DROP POLICY IF EXISTS "Users update own documents" ON user_documents;
DROP POLICY IF EXISTS "Admin read all documents"   ON user_documents;

CREATE POLICY "Users read own documents"
  ON user_documents FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users upsert own documents"
  ON user_documents FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users update own documents"
  ON user_documents FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Admin read all documents"
  ON user_documents FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id   = auth.uid()
        AND profiles.role = 'admin'
    )
  );


-- ─── 6. Storage buckets ───────────────────────────────────────────────────────

-- documents bucket : upsert idempotent via ON CONFLICT
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'documents',
  'documents',
  false,
  5242880,
  ARRAY['image/jpeg','image/png','application/pdf']
)
ON CONFLICT (id) DO UPDATE SET
  file_size_limit    = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- Storage policies : DROP toutes variantes connues avant CREATE
DROP POLICY IF EXISTS "Users upload own documents"  ON storage.objects;
DROP POLICY IF EXISTS "Users read own documents"    ON storage.objects;
DROP POLICY IF EXISTS "Users update own documents"  ON storage.objects;
DROP POLICY IF EXISTS "Admins access all documents" ON storage.objects;

CREATE POLICY "Users upload own documents"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'documents'
    AND auth.uid() IS NOT NULL
    AND (storage.foldername(name))[2] = auth.uid()::text
  );

CREATE POLICY "Users read own documents"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'documents'
    AND (
      (storage.foldername(name))[2] = auth.uid()::text
      OR EXISTS (
        SELECT 1 FROM profiles
        WHERE profiles.id   = auth.uid()
          AND profiles.role = 'admin'
      )
    )
  );

CREATE POLICY "Users update own documents"
  ON storage.objects FOR UPDATE
  USING (
    bucket_id = 'documents'
    AND (storage.foldername(name))[2] = auth.uid()::text
  );


-- ─── 7. Prevent overlapping reservations ─────────────────────────────────────

-- Function : CREATE OR REPLACE est déjà idempotent
CREATE OR REPLACE FUNCTION check_reservation_overlap()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM reservations
    WHERE car_id     = NEW.car_id
      AND id        <> NEW.id
      AND status    IN ('pending', 'confirmed')
      AND start_date <= NEW.end_date
      AND end_date   >= NEW.start_date
  ) THEN
    RAISE EXCEPTION 'Ce véhicule est déjà réservé sur ces dates.' USING ERRCODE = 'P0001';
  END IF;
  RETURN NEW;
END;
$$;

-- Trigger : DROP IF EXISTS + CREATE
DROP TRIGGER IF EXISTS prevent_reservation_overlap ON reservations;
CREATE TRIGGER prevent_reservation_overlap
  BEFORE INSERT OR UPDATE ON reservations
  FOR EACH ROW
  WHEN (NEW.status IN ('pending', 'confirmed'))
  EXECUTE FUNCTION check_reservation_overlap();


-- ─── 8. Indexes for availability queries ──────────────────────────────────────

-- CREATE INDEX IF NOT EXISTS est nativement idempotent
CREATE INDEX IF NOT EXISTS idx_reservations_car_dates
  ON reservations (car_id, start_date, end_date)
  WHERE status IN ('pending', 'confirmed');

CREATE INDEX IF NOT EXISTS idx_reservations_user_id
  ON reservations (user_id);

CREATE INDEX IF NOT EXISTS idx_user_documents_user_doc
  ON user_documents (user_id, doc_type);


-- ─── 9. Realtime publication ──────────────────────────────────────────────────

-- Idempotent : DO block évite l'erreur "table already member of publication"
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_publication_tables
    WHERE pubname   = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename  = 'reservations'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE reservations;
  END IF;
END;
$$;

-- =============================================================================
-- End of migration — fully idempotent, safe for clean install & re-run
-- =============================================================================
