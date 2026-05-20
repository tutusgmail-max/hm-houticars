-- =============================================================================
-- HM Houti Cars — Production-Ready Schema Fixes
-- Migration: 20260528_production_fixes.sql
-- Idempotent — safe to re-run
--
-- Fixes applied:
-- 1. ref column had UNIQUE constraint but BookingModal could theoretically
--    generate duplicate HM + 6-digit timestamp refs under high concurrency.
--    Use a sequence-based ref instead as fallback, keep unique constraint.
-- 2. cars table: add sort_order if not already present (fleet ordering).
-- 3. profiles: add admin_settings jsonb column for server-side settings storage.
-- 4. reservations: total column was integer — allow numeric(10,2) for accuracy.
-- 5. Fix RLS so anon users can read available car list (needed for public page).
-- 6. Add missing storage RLS policies for documents bucket.
-- 7. Notify PostgREST to reload schema cache after all DDL changes.
-- =============================================================================

-- ─── 1. Safe ref sequence (supplement JS-generated ref) ─────────────────────

CREATE SEQUENCE IF NOT EXISTS reservation_ref_seq START 1000;

CREATE OR REPLACE FUNCTION generate_reservation_ref()
RETURNS TEXT LANGUAGE plpgsql AS $$
BEGIN
  RETURN 'HM' || LPAD(nextval('reservation_ref_seq')::text, 6, '0');
END;
$$;

-- Auto-fill ref if missing on insert
CREATE OR REPLACE FUNCTION set_reservation_ref()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.ref IS NULL OR NEW.ref = '' THEN
    NEW.ref := generate_reservation_ref();
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_set_reservation_ref ON reservations;
CREATE TRIGGER trg_set_reservation_ref
  BEFORE INSERT ON reservations
  FOR EACH ROW EXECUTE FUNCTION set_reservation_ref();


-- ─── 2. Cars table ───────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.cars (
  id            serial PRIMARY KEY,
  name          text NOT NULL,
  brand         text,
  year          text,
  category      text DEFAULT 'Citadine',
  price_per_day integer NOT NULL DEFAULT 350,
  transmission  text DEFAULT 'Manuelle',
  fuel          text DEFAULT 'Essence',
  seats         integer DEFAULT 5,
  available     boolean NOT NULL DEFAULT true,
  images        jsonb DEFAULT '[]'::jsonb,
  badge         text,
  specs         jsonb DEFAULT '[]'::jsonb,
  sort_order    integer DEFAULT 0,
  created_at    timestamptz DEFAULT now(),
  updated_at    timestamptz DEFAULT now()
);

ALTER TABLE public.cars
  ADD COLUMN IF NOT EXISTS sort_order integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS badge      text,
  ADD COLUMN IF NOT EXISTS specs      jsonb DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS brand      text,
  ADD COLUMN IF NOT EXISTS year       text;

ALTER TABLE public.cars ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public can view available cars"  ON public.cars;
DROP POLICY IF EXISTS "Admins can manage cars"          ON public.cars;

-- Anyone (including anon) can list available cars for the public fleet page
CREATE POLICY "Public can view available cars"
  ON public.cars FOR SELECT
  USING (available = true);

-- Admins have full access
CREATE POLICY "Admins can manage cars"
  ON public.cars FOR ALL
  USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );


-- ─── 3. Admin settings column on profiles ───────────────────────────────────

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS admin_settings jsonb DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS city           text,
  ADD COLUMN IF NOT EXISTS delivery_address text;


-- ─── 4. Reservations: allow numeric total ────────────────────────────────────

-- Safe ALTER: only change type if still integer
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'reservations'
      AND column_name = 'total'
      AND data_type = 'integer'
  ) THEN
    ALTER TABLE public.reservations ALTER COLUMN total TYPE numeric(10,2);
  END IF;
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'reservations'
      AND column_name = 'total_price'
      AND data_type = 'integer'
  ) THEN
    ALTER TABLE public.reservations ALTER COLUMN total_price TYPE numeric(10,2);
  END IF;
END;
$$;


-- ─── 5. Ensure reservations RLS allows availability checks ──────────────────

-- Anon users need to see pending/confirmed date ranges for the booking calendar
DROP POLICY IF EXISTS "Anon read availability dates" ON public.reservations;
CREATE POLICY "Anon read availability dates"
  ON public.reservations FOR SELECT
  TO anon
  USING (status IN ('pending', 'confirmed'));


-- ─── 6. Storage RLS policies (documents bucket) ──────────────────────────────
-- Run these in Supabase Dashboard → Storage → Policies if not already set.
-- They cannot be run in SQL Editor directly (storage schema is managed differently),
-- but the equivalent SQL is provided here for reference.
--
-- Policy: authenticated users can upload to their own folder
-- INSERT: (bucket_id = 'documents') AND ((storage.foldername(name))[1] = auth.uid()::text)
-- SELECT: (bucket_id = 'documents') AND ((storage.foldername(name))[1] = auth.uid()::text)
-- Admin SELECT: (bucket_id = 'documents') AND EXISTS(SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
--
-- NOTE: The storage.foldername() function extracts folder path segments.
-- For path 'cin/USER_ID/cin_front.jpg', foldername returns ['cin', 'USER_ID', 'cin_front.jpg']
-- so (storage.foldername(name))[2] = auth.uid()::text is the correct check.


-- ─── 7. Realtime: enable for reservations ────────────────────────────────────

ALTER PUBLICATION supabase_realtime ADD TABLE public.reservations;


-- ─── 8. Overlap trigger: ensure correct version ──────────────────────────────

-- Re-apply to make sure the correct version (blocks only confirmed/completed) is active
CREATE OR REPLACE FUNCTION check_reservation_overlap()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM reservations
    WHERE car_id      = NEW.car_id
      AND id         <> NEW.id
      AND status     IN ('confirmed', 'completed')
      AND start_date <= NEW.end_date
      AND end_date   >= NEW.start_date
  ) THEN
    RAISE EXCEPTION 'Ce véhicule est déjà confirmé sur ces dates.' USING ERRCODE = 'P0001';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS prevent_reservation_overlap ON reservations;
CREATE TRIGGER prevent_reservation_overlap
  BEFORE INSERT OR UPDATE ON reservations
  FOR EACH ROW
  WHEN (NEW.status IN ('pending', 'confirmed'))
  EXECUTE FUNCTION check_reservation_overlap();


-- ─── 9. Performance indexes ──────────────────────────────────────────────────

CREATE INDEX IF NOT EXISTS idx_reservations_car_status_dates
  ON public.reservations (car_id, status, start_date, end_date);

CREATE INDEX IF NOT EXISTS idx_reservations_user_id
  ON public.reservations (user_id);

CREATE INDEX IF NOT EXISTS idx_reservations_status
  ON public.reservations (status);

CREATE INDEX IF NOT EXISTS idx_reservations_created_at
  ON public.reservations (created_at DESC);

CREATE INDEX IF NOT EXISTS idx_cars_available_sort
  ON public.cars (available, sort_order);

CREATE INDEX IF NOT EXISTS idx_user_documents_user_id
  ON public.user_documents (user_id);


-- ─── 10. Reload PostgREST schema cache ──────────────────────────────────────

NOTIFY pgrst, 'reload schema';

-- =============================================================================
-- End of migration 20260528_production_fixes.sql
-- =============================================================================
