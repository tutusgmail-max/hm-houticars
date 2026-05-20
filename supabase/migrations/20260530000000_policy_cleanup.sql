-- HM Houti Cars — Security policy cleanup
--
-- This migration removes legacy/insecure policies that grant access to the `public`
-- role (anonymous users) on sensitive tables/buckets.
--
-- Reason:
-- After applying earlier migrations, the database had multiple overlapping policies,
-- including some `TO public` policies such as:
-- - public.profiles: "Users manage own profile" (ALL)  ✅ should NOT be public
-- - public.user_documents: "Admin read all documents" (ALL) ✅ should NOT be public
-- - public.user_documents: "Users read own documents" (SELECT) ✅ should NOT be public
-- - public.user_documents: "Users upsert own documents" (INSERT) ✅ should NOT be public
-- - storage.objects: several "Users * own documents" policies scoped to public ✅ should NOT be public
--
-- The correct model is:
-- - authenticated users can only CRUD their own rows/files
-- - admins (profiles.role='admin') can manage all

-- ─────────────────────────────────────────────────────────────────────────────
-- 1) public.profiles
-- ─────────────────────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "Users manage own profile" ON public.profiles;

-- ─────────────────────────────────────────────────────────────────────────────
-- 2) public.user_documents
-- ─────────────────────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "Admin read all documents"  ON public.user_documents;
DROP POLICY IF EXISTS "Users read own documents"  ON public.user_documents;
DROP POLICY IF EXISTS "Users upsert own documents" ON public.user_documents;

-- ─────────────────────────────────────────────────────────────────────────────
-- 3) storage.objects (documents bucket)
-- ─────────────────────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "Users read own documents"     ON storage.objects;
DROP POLICY IF EXISTS "Users update own documents"   ON storage.objects;
DROP POLICY IF EXISTS "Users upload own documents"   ON storage.objects;

-- Keep the authenticated-only policies created in 20260529000000_security_rls_fixes.sql
-- and any other bucket-specific public policies (e.g., public car images) intact.

