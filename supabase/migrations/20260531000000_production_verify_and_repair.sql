-- =============================================================================
-- HM HOUTI CARS — Production verify & repair (IDEMPOTENT)
-- Target project: ertdqfavrkomikszagtc (must match VITE_SUPABASE_URL in .env)
--
-- SAFE: does not drop data tables; only adds missing columns/policies/triggers.
-- DANGEROUS if misapplied: none of this disables RLS or exposes service_role.
--
-- Run in: Supabase Dashboard → SQL Editor → Run
-- Then: wait 30s or NOTIFY below reloads PostgREST cache
-- =============================================================================

-- ─── 1. profiles + auth.users trigger ───────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.profiles (
  id          uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name   text,
  phone       text,
  email       text,
  role        text NOT NULL DEFAULT 'client',
  avatar_url  text,
  identity_documents jsonb DEFAULT '{}'::jsonb,
  admin_settings jsonb DEFAULT '{}'::jsonb,
  created_at  timestamptz DEFAULT now(),
  updated_at  timestamptz DEFAULT now()
);

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, phone)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    COALESCE(NEW.raw_user_meta_data->>'phone', '')
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    full_name = COALESCE(NULLIF(EXCLUDED.full_name, ''), profiles.full_name),
    phone = COALESCE(NULLIF(EXCLUDED.phone, ''), profiles.phone);
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ─── 2. is_admin() — SECURITY DEFINER avoids RLS recursion on profiles ───────
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role = 'admin'
  );
$$;

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own profile"   ON public.profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Admins manage profiles"     ON public.profiles;

CREATE POLICY "Users can view own profile"
  ON public.profiles FOR SELECT TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile"
  ON public.profiles FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Admins manage profiles"
  ON public.profiles TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

CREATE OR REPLACE FUNCTION public.block_profile_role_change()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.role IS DISTINCT FROM OLD.role AND NOT public.is_admin() THEN
    RAISE EXCEPTION 'Not allowed to change profile role';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_block_profile_role_change ON public.profiles;
CREATE TRIGGER trg_block_profile_role_change
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.block_profile_role_change();

GRANT SELECT, INSERT, UPDATE ON public.profiles TO authenticated;

-- ─── 3. reservations core + RLS ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.reservations (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ref              text UNIQUE,
  reference        text,
  user_id          uuid,
  car_id           integer NOT NULL,
  car_name         text NOT NULL,
  car_price        integer NOT NULL DEFAULT 0,
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
  status           text NOT NULL DEFAULT 'pending',
  documents        jsonb DEFAULT '{}'::jsonb,
  cin_front_url    text,
  cin_back_url     text,
  permis_front_url text,
  permis_back_url  text,
  created_at       timestamptz DEFAULT now(),
  updated_at       timestamptz DEFAULT now()
);

ALTER TABLE public.reservations
  ADD COLUMN IF NOT EXISTS customer_email text,
  ADD COLUMN IF NOT EXISTS cin_back_url text,
  ADD COLUMN IF NOT EXISTS permis_back_url text;

ALTER TABLE public.reservations
  DROP CONSTRAINT IF EXISTS reservations_user_id_fkey;

ALTER TABLE public.reservations
  DROP CONSTRAINT IF EXISTS reservations_user_id_profiles_fkey;

ALTER TABLE public.reservations
  ADD CONSTRAINT reservations_user_id_profiles_fkey
  FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE SET NULL;

CREATE OR REPLACE FUNCTION public.set_reservation_ref()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.ref IS NULL OR NEW.ref = '' THEN
    NEW.ref := 'HM' || lpad((floor(random() * 999999))::text, 6, '0');
  END IF;
  IF NEW.reference IS NULL OR NEW.reference = '' THEN
    NEW.reference := NEW.ref;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_set_reservation_ref ON public.reservations;
CREATE TRIGGER trg_set_reservation_ref
  BEFORE INSERT ON public.reservations
  FOR EACH ROW EXECUTE FUNCTION public.set_reservation_ref();

ALTER TABLE public.reservations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own reservations"       ON public.reservations;
DROP POLICY IF EXISTS "Users can create reservations"         ON public.reservations;
DROP POLICY IF EXISTS "Authenticated read availability dates" ON public.reservations;
DROP POLICY IF EXISTS "Admins can view all reservations"      ON public.reservations;
DROP POLICY IF EXISTS "Admins can update all reservations"    ON public.reservations;
DROP POLICY IF EXISTS "Admins delete reservations"            ON public.reservations;

CREATE POLICY "Users can view own reservations"
  ON public.reservations FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create reservations"
  ON public.reservations FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Authenticated read availability dates"
  ON public.reservations FOR SELECT TO authenticated
  USING (status IN ('pending', 'confirmed'));

CREATE POLICY "Admins can view all reservations"
  ON public.reservations FOR SELECT TO authenticated
  USING (public.is_admin());

CREATE POLICY "Admins can update all reservations"
  ON public.reservations FOR UPDATE TO authenticated
  USING (public.is_admin());

CREATE POLICY "Admins delete reservations"
  ON public.reservations FOR DELETE TO authenticated
  USING (public.is_admin());

GRANT SELECT, INSERT, UPDATE, DELETE ON public.reservations TO authenticated;

-- ─── 4. Realtime (admin dashboard) ──────────────────────────────────────────
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
    IF NOT EXISTS (
      SELECT 1 FROM pg_publication_tables
      WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'reservations'
    ) THEN
      ALTER PUBLICATION supabase_realtime ADD TABLE public.reservations;
    END IF;
  END IF;
END $$;

NOTIFY pgrst, 'reload schema';
