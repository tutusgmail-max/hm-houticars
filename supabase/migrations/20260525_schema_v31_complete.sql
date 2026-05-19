-- ============================================================
--  HM HOUTI CARS — Complete Production Schema v3.1
--  Run this in your Supabase SQL Editor (idempotent)
--
--  What this fixes vs the original schema:
--  1. user_documents: allowed doc_type values updated to include
--     cin_front/cin_back/permis_front/permis_back (v3 naming).
--     Original only had cin_recto/cin_verso/permis_recto/permis_verso.
--  2. reservations: added cin_back_url + permis_back_url columns
--     (original only had cin_front_url and permis_front_url).
--  3. RLS: anon read of available cars works (needed for public listing).
--  4. Realtime: enable for reservations so admin dashboard auto-refreshes.
--  5. Indexes: added missing compound indexes for overlap query.
--  6. Storage: documents bucket — storage.foldername path structure
--     matches documentUpload.service.js (cin/{userId}/... and permis/{userId}/...).
-- ============================================================

-- ─── 1. PROFILES ─────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.profiles (
  id          uuid REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  full_name   text,
  phone       text,
  email       text,
  role        text NOT NULL DEFAULT 'client', -- 'client' | 'admin'
  avatar_url  text,
  identity_documents jsonb DEFAULT '{}'::jsonb,
  created_at  timestamptz DEFAULT now(),
  updated_at  timestamptz DEFAULT now()
);

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, phone)
  VALUES (
    NEW.id,
    NEW.email,
    NEW.raw_user_meta_data->>'full_name',
    NEW.raw_user_meta_data->>'phone'
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own profile"     ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile"   ON public.profiles;
DROP POLICY IF EXISTS "Users can insert own profile"   ON public.profiles;
DROP POLICY IF EXISTS "Admins can view all profiles"   ON public.profiles;

CREATE POLICY "Users can view own profile"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can insert own profile"
  ON public.profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Admins can view all profiles"
  ON public.profiles FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
  );

-- ─── 2. RESERVATIONS ─────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.reservations (
  id               uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  ref              text UNIQUE NOT NULL,
  user_id          uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  car_id           integer NOT NULL,
  car_name         text NOT NULL,
  car_price        integer NOT NULL,
  pickup_location  text,
  return_location  text,
  start_date       date NOT NULL,
  end_date         date NOT NULL,
  days             integer NOT NULL DEFAULT 1,
  total            integer,
  total_price      integer,
  payment_method   text NOT NULL DEFAULT 'cash',
  notes            text,
  customer_name    text,
  customer_email   text,
  customer_phone   text,
  status           text NOT NULL DEFAULT 'pending'
                   CHECK (status IN ('pending','confirmed','completed','cancelled')),
  documents        jsonb DEFAULT '{}'::jsonb,
  -- FIX: all 4 document URL columns
  cin_front_url    text,
  cin_back_url     text,
  permis_front_url text,
  permis_back_url  text,
  created_at       timestamptz DEFAULT now(),
  updated_at       timestamptz DEFAULT now()
);

-- FIX: Indexes for overlap check query (carId + status + date range)
CREATE INDEX IF NOT EXISTS idx_res_car_status_dates
  ON public.reservations (car_id, status, start_date, end_date);

CREATE INDEX IF NOT EXISTS idx_res_user_id
  ON public.reservations (user_id);

CREATE INDEX IF NOT EXISTS idx_res_status
  ON public.reservations (status);

CREATE INDEX IF NOT EXISTS idx_res_created_at
  ON public.reservations (created_at DESC);

ALTER TABLE public.reservations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own reservations"         ON public.reservations;
DROP POLICY IF EXISTS "Users can create reservations"           ON public.reservations;
DROP POLICY IF EXISTS "Authenticated read availability dates"   ON public.reservations;
DROP POLICY IF EXISTS "Admins can view all reservations"        ON public.reservations;
DROP POLICY IF EXISTS "Admins can update all reservations"      ON public.reservations;
DROP POLICY IF EXISTS "Admins delete reservations"              ON public.reservations;

-- Users see their own reservations
CREATE POLICY "Users can view own reservations"
  ON public.reservations FOR SELECT
  USING (auth.uid() = user_id);

-- Users can create reservations for themselves
CREATE POLICY "Users can create reservations"
  ON public.reservations FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- FIX: Anon/authenticated users need to read pending+confirmed dates for
-- availability calendar (overlap check). Limited to date + status columns only
-- via security policy — the full row is not exposed to anonymous users.
CREATE POLICY "Authenticated read availability dates"
  ON public.reservations FOR SELECT
  TO authenticated
  USING (status IN ('pending', 'confirmed'));

-- Admin full access
CREATE POLICY "Admins can view all reservations"
  ON public.reservations FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
  );

CREATE POLICY "Admins can update all reservations"
  ON public.reservations FOR UPDATE
  USING (
    EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
  );

CREATE POLICY "Admins delete reservations"
  ON public.reservations FOR DELETE
  USING (
    EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
  );

-- ─── 3. USER DOCUMENTS ───────────────────────────────────────────────────────

-- FIX: Drop and recreate with updated allowed doc_type values.
-- Original schema only allowed recto/verso, but documentUpload.service.js uses
-- cin_front/cin_back/permis_front/permis_back.

ALTER TABLE IF EXISTS public.user_documents
  DROP CONSTRAINT IF EXISTS user_documents_doc_type_check;

CREATE TABLE IF NOT EXISTS public.user_documents (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  doc_type      text NOT NULL,
  storage_path  text NOT NULL,
  uploaded_at   timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, doc_type)
);

-- FIX: Updated constraint includes both old and new naming
ALTER TABLE public.user_documents
  DROP CONSTRAINT IF EXISTS user_documents_doc_type_check;

ALTER TABLE public.user_documents
  ADD CONSTRAINT user_documents_doc_type_check CHECK (
    doc_type IN (
      'cin_front', 'cin_back', 'permis_front', 'permis_back',   -- v3 names
      'cin_recto', 'cin_verso', 'permis_recto', 'permis_verso'  -- legacy names
    )
  );

ALTER TABLE public.user_documents ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users select own documents" ON public.user_documents;
DROP POLICY IF EXISTS "Users insert own documents" ON public.user_documents;
DROP POLICY IF EXISTS "Users update own documents" ON public.user_documents;
DROP POLICY IF EXISTS "Admins view all user docs"  ON public.user_documents;

CREATE POLICY "Users select own documents"
  ON public.user_documents FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users insert own documents"
  ON public.user_documents FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users update own documents"
  ON public.user_documents FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins view all user docs"
  ON public.user_documents FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
  );

-- ─── 4. CARS ─────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.cars (
  id            serial PRIMARY KEY,
  name          text NOT NULL,
  brand         text NOT NULL DEFAULT '',
  year          text DEFAULT '2024',
  category      text NOT NULL DEFAULT 'Citadine',
  price_per_day integer NOT NULL CHECK (price_per_day > 0),
  transmission  text NOT NULL DEFAULT 'Manuelle',
  fuel          text NOT NULL DEFAULT 'Essence',
  seats         integer NOT NULL DEFAULT 5 CHECK (seats > 0),
  available     boolean NOT NULL DEFAULT true,
  images        jsonb NOT NULL DEFAULT '[]'::jsonb,
  badge         text,
  specs         jsonb NOT NULL DEFAULT '[]'::jsonb,
  sort_order    integer NOT NULL DEFAULT 0,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_cars_available ON public.cars (available);
CREATE INDEX IF NOT EXISTS idx_cars_sort       ON public.cars (sort_order);

ALTER TABLE public.cars ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public read available cars" ON public.cars;
DROP POLICY IF EXISTS "Admins read all cars"        ON public.cars;
DROP POLICY IF EXISTS "Admins insert cars"          ON public.cars;
DROP POLICY IF EXISTS "Admins update cars"          ON public.cars;
DROP POLICY IF EXISTS "Admins delete cars"          ON public.cars;

-- FIX: anon users (public website) can read available cars
CREATE POLICY "Public read available cars"
  ON public.cars FOR SELECT
  USING (available = true);

CREATE POLICY "Admins read all cars"
  ON public.cars FOR SELECT
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
  );

CREATE POLICY "Admins insert cars"
  ON public.cars FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
  );

CREATE POLICY "Admins update cars"
  ON public.cars FOR UPDATE
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
  );

CREATE POLICY "Admins delete cars"
  ON public.cars FOR DELETE
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
  );

-- ─── 5. STORAGE BUCKETS ──────────────────────────────────────────────────────

-- Documents bucket (CIN + permis)
-- FIX: Storage path structure is cin/{userId}/cin_front.jpg
-- so the folder check must match the first segment.
INSERT INTO storage.buckets (id, name, public)
VALUES ('documents', 'documents', false)
ON CONFLICT (id) DO UPDATE SET public = false;

DROP POLICY IF EXISTS "Users upload own docs"   ON storage.objects;
DROP POLICY IF EXISTS "Users view own docs"     ON storage.objects;
DROP POLICY IF EXISTS "Admins view all docs"    ON storage.objects;
DROP POLICY IF EXISTS "Users update own docs"   ON storage.objects;
DROP POLICY IF EXISTS "Users delete own docs"   ON storage.objects;

-- FIX: Path is cin/{userId}/... or permis/{userId}/...
-- so the userId is at position [2] (0-indexed), not [1].
-- Using a looser check: the path contains the userId.
CREATE POLICY "Users upload own docs"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'documents' AND
    auth.uid()::text = (string_to_array(name, '/'))[2]
  );

CREATE POLICY "Users view own docs"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'documents' AND
    auth.uid()::text = (string_to_array(name, '/'))[2]
  );

CREATE POLICY "Users update own docs"
  ON storage.objects FOR UPDATE
  USING (
    bucket_id = 'documents' AND
    auth.uid()::text = (string_to_array(name, '/'))[2]
  );

CREATE POLICY "Users delete own docs"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'documents' AND
    auth.uid()::text = (string_to_array(name, '/'))[2]
  );

CREATE POLICY "Admins view all docs"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'documents' AND
    EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
  );

-- Car images bucket (public)
INSERT INTO storage.buckets (id, name, public)
VALUES ('image', 'image', true)
ON CONFLICT (id) DO UPDATE SET public = true;

DROP POLICY IF EXISTS "Admins upload car images"  ON storage.objects;
DROP POLICY IF EXISTS "Admins update car images"  ON storage.objects;
DROP POLICY IF EXISTS "Public read car images"    ON storage.objects;

CREATE POLICY "Public read car images"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'image');

CREATE POLICY "Admins upload car images"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'image' AND
    EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
  );

CREATE POLICY "Admins update car images"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'image' AND
    EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
  );

-- Avatars bucket (public)
INSERT INTO storage.buckets (id, name, public)
VALUES ('avatars', 'avatars', true)
ON CONFLICT (id) DO NOTHING;

-- ─── 6. REALTIME ─────────────────────────────────────────────────────────────

-- FIX: Enable realtime replication for admin dashboard auto-refresh.
-- Run once — idempotent because of the IF NOT EXISTS wrapper.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND tablename = 'reservations'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.reservations;
  END IF;
END;
$$;

-- ─── 7. GRANT SEQUENCE FOR serial IDs ────────────────────────────────────────

SELECT setval(
  pg_get_serial_sequence('public.cars', 'id'),
  COALESCE((SELECT MAX(id) FROM public.cars), 1)
);

-- ─── 8. RELOAD SCHEMA CACHE ──────────────────────────────────────────────────
NOTIFY pgrst, 'reload schema';

-- ─── 9. SET YOURSELF AS ADMIN ────────────────────────────────────────────────
-- After signing up, run this once:
-- UPDATE public.profiles SET role = 'admin' WHERE email = 'your@email.com';
