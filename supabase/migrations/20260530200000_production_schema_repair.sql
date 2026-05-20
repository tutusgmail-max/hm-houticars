-- HM Houti Cars — Production schema repair (cmoioidgxealxfirkssc)
-- Idempotent. Preserves data. Fixes PGRST200 profiles join + missing notifications.

-- ─── 1) Helper: is_admin() ───────────────────────────────────────────────────
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

-- ─── 2) profiles.admin_settings (app settings sync) ─────────────────────────
ALTER TABLE IF EXISTS public.profiles
  ADD COLUMN IF NOT EXISTS admin_settings jsonb DEFAULT '{}'::jsonb;

-- ─── 3) reservations → profiles FK (fixes PostgREST embed) ─────────────────
ALTER TABLE IF EXISTS public.reservations
  DROP CONSTRAINT IF EXISTS reservations_user_id_fkey;

ALTER TABLE IF EXISTS public.reservations
  DROP CONSTRAINT IF EXISTS reservations_user_id_profiles_fkey;

ALTER TABLE IF EXISTS public.reservations
  ADD CONSTRAINT reservations_user_id_profiles_fkey
  FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE SET NULL;

-- ─── 4) Auto ref on INSERT ───────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.set_reservation_ref()
RETURNS trigger
LANGUAGE plpgsql
AS $$
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

-- ─── 5) Car snapshot if missing ─────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.fill_reservation_car_snapshot()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.car_id IS NOT NULL AND (NEW.car_name IS NULL OR NEW.car_price IS NULL) THEN
    SELECT c.name, COALESCE(c.price_per_day, 0)
      INTO NEW.car_name, NEW.car_price
    FROM public.cars c WHERE c.id = NEW.car_id;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_fill_reservation_car_snapshot ON public.reservations;
CREATE TRIGGER trg_fill_reservation_car_snapshot
  BEFORE INSERT OR UPDATE ON public.reservations
  FOR EACH ROW EXECUTE FUNCTION public.fill_reservation_car_snapshot();

-- ─── 6) notifications table ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.notifications (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  type       text NOT NULL DEFAULT 'reservation',
  title      text NOT NULL,
  message    text,
  data       jsonb NOT NULL DEFAULT '{}'::jsonb,
  read       boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins manage notifications" ON public.notifications;
CREATE POLICY "Admins manage notifications"
  ON public.notifications FOR ALL TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

GRANT SELECT, INSERT, UPDATE, DELETE ON public.notifications TO authenticated;

CREATE INDEX IF NOT EXISTS idx_notifications_read ON public.notifications (read, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON public.notifications (created_at DESC);

CREATE OR REPLACE FUNCTION public.notify_admin_new_reservation()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.notifications (type, title, message, data)
    VALUES (
      'reservation',
      'Nouvelle reservation recue',
      format('%s - %s au %s', COALESCE(NEW.car_name, 'Vehicule'),
        to_char(NEW.start_date, 'DD/MM/YYYY'), to_char(NEW.end_date, 'DD/MM/YYYY')),
      jsonb_build_object(
        'reservation_id', NEW.id, 'car_name', NEW.car_name,
        'customer_name', COALESCE(NEW.customer_name, ''),
        'status', NEW.status, 'start_date', NEW.start_date, 'end_date', NEW.end_date
      )
    );
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_admin_reservation ON public.reservations;
CREATE TRIGGER trg_notify_admin_reservation
  AFTER INSERT ON public.reservations
  FOR EACH ROW EXECUTE FUNCTION public.notify_admin_new_reservation();

-- ─── 7) Admin SELECT on reservations (explicit) ─────────────────────────────
DROP POLICY IF EXISTS "Admins can view all reservations" ON public.reservations;
CREATE POLICY "Admins can view all reservations"
  ON public.reservations FOR SELECT TO authenticated
  USING (public.is_admin());

-- ─── 8) Realtime ─────────────────────────────────────────────────────────────
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'notifications') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'user_documents') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.user_documents;
  END IF;
END $$;

NOTIFY pgrst, 'reload schema';
