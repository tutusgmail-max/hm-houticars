-- Migration: add documents column to reservations
-- Date: 2026-05-18

ALTER TABLE reservations
ADD COLUMN IF NOT EXISTS documents text;
