-- ============================================================
-- Add customer_email to reservations
-- ============================================================

ALTER TABLE public.reservations
  ADD COLUMN IF NOT EXISTS customer_email text;
