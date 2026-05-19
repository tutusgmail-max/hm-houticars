-- Migration: add customer_email, customer_phone, car_price to reservations
-- Date: 2026-05-18

ALTER TABLE reservations
ADD COLUMN customer_email text,
ADD COLUMN customer_phone text,
ADD COLUMN car_price numeric;
