-- CRITICAL SECURITY FIX — enable RLS where policies already exist but RLS was off.
-- Safe: policies are already defined; this only activates them.
-- Does NOT disable RLS anywhere. Does NOT expose service_role.

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reservations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;

-- user_documents + cars should already be enabled; re-assert
ALTER TABLE public.user_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cars ENABLE ROW LEVEL SECURITY;

NOTIFY pgrst, 'reload schema';
