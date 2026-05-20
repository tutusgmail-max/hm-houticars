-- HM Houti Cars — Audit backend fixes (idempotent, no data loss)
-- Fixes: notifications schema + trigger + RLS, realtime publication gaps

-- ─── 1) notifications: align schema with app + trigger function ─────────────
ALTER TABLE IF EXISTS public.notifications
  ADD COLUMN IF NOT EXISTS type text NOT NULL DEFAULT 'reservation',
  ADD COLUMN IF NOT EXISTS data jsonb NOT NULL DEFAULT '{}'::jsonb;

-- Legacy column user_id is unused by the app; keep it nullable (no drop).

ALTER TABLE IF EXISTS public.notifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins manage notifications" ON public.notifications;
CREATE POLICY "Admins manage notifications"
  ON public.notifications
  FOR ALL
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

GRANT SELECT, INSERT, UPDATE, DELETE ON public.notifications TO authenticated;

CREATE INDEX IF NOT EXISTS idx_notifications_read
  ON public.notifications (read, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at
  ON public.notifications (created_at DESC);

-- Notification on new reservation (was missing on live DB)
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
      'Nouvelle réservation reçue',
      format(
        '%s — %s au %s',
        COALESCE(NEW.car_name, 'Véhicule'),
        to_char(NEW.start_date, 'DD/MM/YYYY'),
        to_char(NEW.end_date, 'DD/MM/YYYY')
      ),
      jsonb_build_object(
        'reservation_id', NEW.id,
        'car_name',       NEW.car_name,
        'customer_name',  COALESCE(NEW.customer_name, ''),
        'status',         NEW.status,
        'start_date',     NEW.start_date,
        'end_date',       NEW.end_date
      )
    );
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_admin_reservation ON public.reservations;
CREATE TRIGGER trg_notify_admin_reservation
  AFTER INSERT ON public.reservations
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_admin_new_reservation();

-- ─── 2) Realtime publication (admin instant updates) ────────────────────────
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'notifications'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'user_documents'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.user_documents;
  END IF;
END $$;

-- ─── 3) Tighten reservation INSERT policies to authenticated only ───────────
-- (Keeps admin policies; removes ambiguous duplicate public INSERT paths)
DROP POLICY IF EXISTS "Users can create reservations" ON public.reservations;
DROP POLICY IF EXISTS "Users insert own reservations" ON public.reservations;

CREATE POLICY "Users insert own reservations"
  ON public.reservations
  FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = user_id
    AND status = 'pending'
  );

-- Reload PostgREST schema cache
NOTIFY pgrst, 'reload schema';
