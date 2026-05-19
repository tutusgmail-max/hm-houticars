-- HM Houti Cars — align reservations with BookingModal.jsx + fix RLS + schema cache
-- Run in Supabase Dashboard → SQL Editor

-- Core v3 columns (safe IF NOT EXISTS)
ALTER TABLE public.reservations
  ADD COLUMN IF NOT EXISTS ref text,
  ADD COLUMN IF NOT EXISTS customer_email text,
  ADD COLUMN IF NOT EXISTS customer_name text,
  ADD COLUMN IF NOT EXISTS customer_phone text,
  ADD COLUMN IF NOT EXISTS pickup_location text,
  ADD COLUMN IF NOT EXISTS return_location text,
  ADD COLUMN IF NOT EXISTS documents jsonb DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS notes text,
  ADD COLUMN IF NOT EXISTS total integer,
  ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();

-- Legacy column sync (projects that use reference / total_price)
ALTER TABLE public.reservations
  ADD COLUMN IF NOT EXISTS reference text,
  ADD COLUMN IF NOT EXISTS total_price numeric;

UPDATE public.reservations
SET ref = reference
WHERE ref IS NULL AND reference IS NOT NULL;

UPDATE public.reservations
SET reference = ref
WHERE reference IS NULL AND ref IS NOT NULL;

UPDATE public.reservations
SET total = total_price::integer
WHERE total IS NULL AND total_price IS NOT NULL;

UPDATE public.reservations
SET total_price = total
WHERE total_price IS NULL AND total IS NOT NULL;

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS avatar_url text;

DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;
CREATE POLICY "Users can insert own profile"
  ON public.profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "Authenticated read availability dates" ON public.reservations;
CREATE POLICY "Authenticated read availability dates"
  ON public.reservations FOR SELECT
  TO authenticated
  USING (status IN ('pending', 'confirmed'));

NOTIFY pgrst, 'reload schema';
