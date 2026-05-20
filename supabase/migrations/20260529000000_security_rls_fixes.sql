-- Security & RLS fixes (v31+)
--
-- Goals:
-- 1) Fix "new row violates row-level security policy for table user_documents"
--    by ensuring authenticated users can INSERT/UPDATE/SELECT their own rows.
-- 2) Allow admins (profiles.role='admin') to review documents (SELECT) and, if needed,
--    manage them (INSERT/UPDATE/DELETE) for support operations.
-- 3) Prevent privilege escalation: regular users must NOT be able to update profiles.role.
--
-- IMPORTANT: Apply this migration to your Supabase project (CLI: `supabase db push`
-- or SQL Editor). These changes run on the database, not in the frontend bundle.

-- ─────────────────────────────────────────────────────────────────────────────
-- 1) PROFILES: prevent users from self-promoting to admin
-- ─────────────────────────────────────────────────────────────────────────────

-- Default role for new profiles
ALTER TABLE IF EXISTS public.profiles
  ALTER COLUMN role SET DEFAULT 'client';

-- RLS hardening (no privilege escalation):
-- Ensure normal users cannot change their role via UPDATE/INSERT.
-- We do NOT rely on REVOKE(column) here because the frontend inserts/upserts
-- role='client' during signup; revoking would break that flow.
ALTER TABLE IF EXISTS public.profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own profile"     ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile"   ON public.profiles;
DROP POLICY IF EXISTS "Users can insert own profile"   ON public.profiles;
DROP POLICY IF EXISTS "Admins can view all profiles"   ON public.profiles;

-- Users can view their profile
CREATE POLICY "Users can view own profile"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

-- Users can insert their profile but ONLY as client
CREATE POLICY "Users can insert own profile"
  ON public.profiles FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id AND coalesce(role, 'client') = 'client');

-- Users can update their profile but cannot change `role`
-- (role in NEW row must equal the current role in DB)
CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (
    auth.uid() = id AND
    role = (SELECT p.role FROM public.profiles p WHERE p.id = auth.uid())
  );

-- Admins can view all profiles (for admin dashboard)
CREATE POLICY "Admins can view all profiles"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
  );

-- NOTE: To grant admin access, set it from the SQL editor/service role:
--   UPDATE public.profiles SET role = 'admin' WHERE email = 'admin@example.com';

-- ─────────────────────────────────────────────────────────────────────────────
-- 2) user_documents RLS: CRUD own docs + admin management
-- ─────────────────────────────────────────────────────────────────────────────

ALTER TABLE IF EXISTS public.user_documents ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users select own documents" ON public.user_documents;
DROP POLICY IF EXISTS "Users insert own documents" ON public.user_documents;
DROP POLICY IF EXISTS "Users update own documents" ON public.user_documents;
DROP POLICY IF EXISTS "Users delete own documents" ON public.user_documents;
DROP POLICY IF EXISTS "Admins view all user docs"  ON public.user_documents;
DROP POLICY IF EXISTS "Admins manage all user docs" ON public.user_documents;

-- Authenticated user can read only their rows
CREATE POLICY "Users select own documents"
  ON public.user_documents FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Authenticated user can insert only for themselves
CREATE POLICY "Users insert own documents"
  ON public.user_documents FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Authenticated user can update only their rows, and must keep ownership
CREATE POLICY "Users update own documents"
  ON public.user_documents FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Authenticated user can delete only their rows
CREATE POLICY "Users delete own documents"
  ON public.user_documents FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Admin can manage any row (support / verification workflow)
CREATE POLICY "Admins manage all user docs"
  ON public.user_documents
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
  );

-- Make sure the authenticated role has the required table privileges (RLS alone is not enough).
GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_documents TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.profiles TO authenticated;

-- ─────────────────────────────────────────────────────────────────────────────
-- 3) Storage RLS for bucket "documents"
-- ─────────────────────────────────────────────────────────────────────────────

-- For our storage path structure: cin/{userId}/... and permis/{userId}/...
-- userId is the SECOND path segment (array index 2 in Postgres 1-indexed arrays).

DROP POLICY IF EXISTS "Users upload own docs"   ON storage.objects;
DROP POLICY IF EXISTS "Users view own docs"     ON storage.objects;
DROP POLICY IF EXISTS "Users update own docs"   ON storage.objects;
DROP POLICY IF EXISTS "Users delete own docs"   ON storage.objects;
DROP POLICY IF EXISTS "Admins view all docs"    ON storage.objects;
DROP POLICY IF EXISTS "Admins manage all docs"  ON storage.objects;

CREATE POLICY "Users upload own docs"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'documents' AND
    auth.uid()::text = (string_to_array(name, '/'))[2]
  );

CREATE POLICY "Users view own docs"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'documents' AND
    auth.uid()::text = (string_to_array(name, '/'))[2]
  );

CREATE POLICY "Users update own docs"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'documents' AND
    auth.uid()::text = (string_to_array(name, '/'))[2]
  )
  WITH CHECK (
    bucket_id = 'documents' AND
    auth.uid()::text = (string_to_array(name, '/'))[2]
  );

CREATE POLICY "Users delete own docs"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'documents' AND
    auth.uid()::text = (string_to_array(name, '/'))[2]
  );

CREATE POLICY "Admins manage all docs"
  ON storage.objects
  TO authenticated
  USING (
    bucket_id = 'documents' AND
    EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
  )
  WITH CHECK (
    bucket_id = 'documents' AND
    EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
  );
