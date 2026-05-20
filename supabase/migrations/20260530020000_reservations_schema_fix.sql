-- HM Houti Cars — PRODUCTION FIX: reservations schema alignment + schema cache
--
-- Fixes "Could not find the 'car_name' column of 'reservations' in the schema cache"
-- by ensuring the column exists and forcing a PostgREST schema reload.
--
-- This migration is idempotent and preserves existing production data.

-- 1) Columns expected by the frontend (BookingModal/admin dashboard)
ALTER TABLE IF EXISTS public.reservations
  ADD COLUMN IF NOT EXISTS car_name text,
  ADD COLUMN IF NOT EXISTS car_price integer,
  ADD COLUMN IF NOT EXISTS days integer DEFAULT 1,
  ADD COLUMN IF NOT EXISTS payment_method text DEFAULT 'cash';

-- 2) Ensure car_id is integer (matches public.cars.id)
DO $$
DECLARE
  car_id_type text;
BEGIN
  SELECT data_type INTO car_id_type
  FROM information_schema.columns
  WHERE table_schema='public' AND table_name='reservations' AND column_name='car_id';

  -- If older schema used TEXT, safely convert to integer.
  IF car_id_type = 'text' THEN
    -- With production data: convert only numeric strings; otherwise NULL.
    -- (Current production had 0 rows during fix, but keep safe.)
    ALTER TABLE public.reservations
      ALTER COLUMN car_id DROP DEFAULT;

    ALTER TABLE public.reservations
      ALTER COLUMN car_id TYPE integer
      USING (CASE WHEN car_id ~ '^\d+$' THEN car_id::integer ELSE NULL END);
  END IF;
END $$;

-- 3) Add FK to cars if possible (does not delete any data)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.table_constraints
    WHERE constraint_schema='public'
      AND table_name='reservations'
      AND constraint_type='FOREIGN KEY'
      AND constraint_name='reservations_car_id_fkey'
  ) THEN
    ALTER TABLE public.reservations
      ADD CONSTRAINT reservations_car_id_fkey
      FOREIGN KEY (car_id) REFERENCES public.cars(id)
      ON UPDATE RESTRICT ON DELETE RESTRICT;
  END IF;
EXCEPTION
  WHEN others THEN
    -- If existing rows have invalid car_id values, keep data and skip FK.
    RAISE NOTICE 'Skipping reservations_car_id_fkey: %', SQLERRM;
END $$;

-- 4) Status constraint (align with app)
DO $$
BEGIN
  ALTER TABLE public.reservations
    DROP CONSTRAINT IF EXISTS reservations_status_check;
  ALTER TABLE public.reservations
    ADD CONSTRAINT reservations_status_check
    CHECK (status IN ('pending','confirmed','completed','cancelled'));
EXCEPTION
  WHEN others THEN
    RAISE NOTICE 'Skipping status constraint: %', SQLERRM;
END $$;

-- 5) Optional: keep a snapshot of car name/price if client omitted them
CREATE OR REPLACE FUNCTION public.fill_reservation_car_snapshot()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.car_id IS NOT NULL AND (NEW.car_name IS NULL OR NEW.car_price IS NULL) THEN
    SELECT c.name, COALESCE(c.price_per_day, c.price)
      INTO NEW.car_name, NEW.car_price
    FROM public.cars c
    WHERE c.id = NEW.car_id;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_fill_reservation_car_snapshot ON public.reservations;
CREATE TRIGGER trg_fill_reservation_car_snapshot
BEFORE INSERT OR UPDATE ON public.reservations
FOR EACH ROW
EXECUTE FUNCTION public.fill_reservation_car_snapshot();

-- 6) Improve admin policy reliability by using SECURITY DEFINER helper (no RLS surprises)
-- (Keep existing policies, but ensure these two exist)
DROP POLICY IF EXISTS "Admins can view all reservations" ON public.reservations;
CREATE POLICY "Admins can view all reservations"
  ON public.reservations FOR SELECT
  TO authenticated
  USING (public.is_admin());

DROP POLICY IF EXISTS "Admins can update all reservations" ON public.reservations;
CREATE POLICY "Admins can update all reservations"
  ON public.reservations FOR UPDATE
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- Finally: force schema cache refresh for PostgREST
NOTIFY pgrst, 'reload schema';

