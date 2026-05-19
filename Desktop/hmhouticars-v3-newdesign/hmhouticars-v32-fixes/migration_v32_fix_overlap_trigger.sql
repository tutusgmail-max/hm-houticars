-- =============================================================================
-- HM Houti Cars — v3.2 Fix: Overlap trigger should only block confirmed dates
-- Migration: migration_v32_fix_overlap_trigger.sql
-- Run AFTER: 20260526_booking_system_v31_fixes.sql
-- Idempotent — safe to re-run
-- =============================================================================

-- ─── Fix: check_reservation_overlap should only block on confirmed/completed ──
-- Previous version blocked even 'pending' which prevented multiple customers
-- from requesting the same dates. Admin should confirm the first one manually.

CREATE OR REPLACE FUNCTION check_reservation_overlap()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM reservations
    WHERE car_id      = NEW.car_id
      AND id         <> NEW.id
      AND status     IN ('confirmed', 'completed')
      AND start_date <= NEW.end_date
      AND end_date   >= NEW.start_date
  ) THEN
    RAISE EXCEPTION 'Ce véhicule est déjà confirmé sur ces dates.' USING ERRCODE = 'P0001';
  END IF;
  RETURN NEW;
END;
$$;

-- Recreate trigger for both INSERT and UPDATE
DROP TRIGGER IF EXISTS prevent_reservation_overlap ON reservations;
CREATE TRIGGER prevent_reservation_overlap
  BEFORE INSERT OR UPDATE ON reservations
  FOR EACH ROW
  WHEN (NEW.status IN ('pending', 'confirmed'))
  EXECUTE FUNCTION check_reservation_overlap();

-- ─── Update index to be cleaner for the new blocking logic ────────────────────

DROP INDEX IF EXISTS idx_reservations_car_dates;
CREATE INDEX IF NOT EXISTS idx_reservations_car_dates_blocking
  ON reservations (car_id, start_date, end_date)
  WHERE status IN ('confirmed', 'completed');

CREATE INDEX IF NOT EXISTS idx_reservations_car_dates_pending
  ON reservations (car_id, start_date, end_date)
  WHERE status = 'pending';

-- =============================================================================
-- End of migration v3.2 fix
-- =============================================================================
