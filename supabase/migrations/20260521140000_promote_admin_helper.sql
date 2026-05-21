-- Promote a user to admin (bypasses trg_block_profile_role_change for operators only).
-- Usage in SQL Editor: SELECT public.promote_user_to_admin('user-uuid-here');

CREATE OR REPLACE FUNCTION public.promote_user_to_admin(target_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  ALTER TABLE public.profiles DISABLE TRIGGER trg_block_profile_role_change;
  UPDATE public.profiles SET role = 'admin' WHERE id = target_user_id;
  ALTER TABLE public.profiles ENABLE TRIGGER trg_block_profile_role_change;
END;
$$;

REVOKE ALL ON FUNCTION public.promote_user_to_admin(uuid) FROM PUBLIC;
