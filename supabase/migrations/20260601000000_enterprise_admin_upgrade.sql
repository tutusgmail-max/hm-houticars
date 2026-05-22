-- ============================================================
-- HM HOUTI CARS — Enterprise Admin Upgrade v1
-- Adds: audit_logs, waitlist, reservation source tracking,
--       admin_role column, guest profiles auto-generation
-- ============================================================

ALTER TABLE public.reservations
  ADD COLUMN IF NOT EXISTS source text DEFAULT 'website' CHECK (source IN ('website','admin','import')),
  ADD COLUMN IF NOT EXISTS created_by_admin_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS admin_notes text,
  ADD COLUMN IF NOT EXISTS is_guest boolean DEFAULT false;

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS admin_role text DEFAULT NULL
    CHECK (admin_role IN ('super_admin','manager','staff','readonly') OR admin_role IS NULL);

CREATE TABLE IF NOT EXISTS public.audit_logs (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id      uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  admin_email   text,
  action        text NOT NULL,
  entity_type   text NOT NULL,
  entity_id     text,
  old_data      jsonb,
  new_data      jsonb,
  meta          jsonb,
  ip_address    text,
  created_at    timestamptz DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_audit_logs_admin ON public.audit_logs(admin_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_entity ON public.audit_logs(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created ON public.audit_logs(created_at DESC);

CREATE TABLE IF NOT EXISTS public.waitlist (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  car_id        integer REFERENCES public.cars(id) ON DELETE CASCADE,
  user_id       uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  guest_name    text,
  guest_email   text,
  guest_phone   text,
  start_date    date NOT NULL,
  end_date      date NOT NULL,
  notes         text,
  status        text DEFAULT 'waiting' CHECK (status IN ('waiting','notified','converted','expired')),
  created_at    timestamptz DEFAULT now() NOT NULL,
  notified_at   timestamptz
);

ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins read audit_logs" ON public.audit_logs;
CREATE POLICY "Admins read audit_logs"
  ON public.audit_logs FOR SELECT
  TO authenticated
  USING (public.is_admin());

DROP POLICY IF EXISTS "Admins insert audit_logs" ON public.audit_logs;
CREATE POLICY "Admins insert audit_logs"
  ON public.audit_logs FOR INSERT
  TO authenticated
  WITH CHECK (public.is_admin());

ALTER TABLE public.waitlist ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins manage waitlist" ON public.waitlist;
CREATE POLICY "Admins manage waitlist"
  ON public.waitlist FOR ALL
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "Admins can insert reservations" ON public.reservations;
CREATE POLICY "Admins can insert reservations"
  ON public.reservations FOR INSERT
  TO authenticated
  WITH CHECK (public.is_admin());

CREATE INDEX IF NOT EXISTS idx_reservations_source ON public.reservations(source);
CREATE INDEX IF NOT EXISTS idx_reservations_created_by_admin ON public.reservations(created_by_admin_id);

NOTIFY pgrst, 'reload schema';
