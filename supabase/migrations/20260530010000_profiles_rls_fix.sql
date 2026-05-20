-- HM Houti Cars — PRODUCTION FIX: profiles RLS recursion
--
-- Problem:
-- We hit: "infinite recursion detected in policy for relation \"profiles\""
-- This happens when a policy on public.profiles queries public.profiles (directly or indirectly).
--
-- Fix:
-- 1) Introduce a SECURITY DEFINER helper `public.is_admin()` that can check the role
--    without evaluating RLS (runs with definer privileges).
-- 2) Recreate profiles policies WITHOUT self-referencing queries.
-- 3) Add a trigger to prevent non-admin users from changing their own role.
--
-- Safe/idempotent and preserves existing data.

-- 1) Admin helper (no RLS recursion)
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.profiles
    WHERE id = auth.uid()
      AND role = 'admin'
  );
$$;

-- Ensure function owner has privileges to bypass RLS (Supabase default: postgres).
-- (If you run via CLI, it will typically be owned by postgres already.)

-- 2) Drop any existing profiles policies (some may have caused recursion)
ALTER TABLE IF EXISTS public.profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own profile"       ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile"     ON public.profiles;
DROP POLICY IF EXISTS "Users can insert own profile"     ON public.profiles;
DROP POLICY IF EXISTS "Admins can view all profiles"     ON public.profiles;
DROP POLICY IF EXISTS "Admins manage profiles"           ON public.profiles;
DROP POLICY IF EXISTS "Users manage own profile"         ON public.profiles;

-- 3) Recreate non-recursive policies
-- Users: can read only themselves
CREATE POLICY "Users can view own profile"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

-- Users: can insert only themselves (role defaults to client in schema)
CREATE POLICY "Users can insert own profile"
  ON public.profiles FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

-- Users: can update only themselves
CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Admins: can read/update any profile (dashboard)
CREATE POLICY "Admins manage profiles"
  ON public.profiles
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- 4) Prevent privilege escalation: block role changes unless admin
CREATE OR REPLACE FUNCTION public.block_profile_role_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.role IS DISTINCT FROM OLD.role THEN
    IF NOT public.is_admin() THEN
      RAISE EXCEPTION 'Not allowed to change profile role';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_block_profile_role_change ON public.profiles;
CREATE TRIGGER trg_block_profile_role_change
BEFORE UPDATE ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.block_profile_role_change();

-- Keep permissions explicit
GRANT SELECT, INSERT, UPDATE ON public.profiles TO authenticated;

NOTIFY pgrst, 'reload schema';

