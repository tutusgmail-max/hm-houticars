-- Migration: add customer_name column to reservations
-- Date: 2026-05-18

ALTER TABLE reservations
ADD COLUMN customer_name text;
