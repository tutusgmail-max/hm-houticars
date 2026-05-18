-- ============================================================
-- HoutiCars Booking System - Database Schema Migration
-- This file creates tables and functions for the booking system
-- ============================================================

-- Enable UUID extension (if not already enabled)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================
-- BOOKINGS TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS bookings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  
  -- Foreign keys
  car_id UUID NOT NULL REFERENCES cars(id) ON DELETE RESTRICT,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Booking details
  start_date TIMESTAMP NOT NULL,
  end_date TIMESTAMP NOT NULL,
  pickup_location TEXT NOT NULL,
  dropoff_location TEXT NOT NULL,
  
  -- Passenger information
  passenger_name TEXT NOT NULL,
  passenger_phone TEXT NOT NULL,
  passenger_email TEXT NOT NULL,
  
  -- Booking status and pricing
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'cancelled', 'completed')),
  total_price DECIMAL(10, 2) NOT NULL,
  insurance_included BOOLEAN DEFAULT FALSE,
  special_requests TEXT,
  
  -- Reference and dates
  booking_reference VARCHAR(50) UNIQUE NOT NULL,
  confirmation_date TIMESTAMP,
  cancelled_at TIMESTAMP,
  cancellation_reason TEXT,
  
  -- Audit fields
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Create indexes for bookings
CREATE INDEX IF NOT EXISTS idx_bookings_user_id ON bookings(user_id);
CREATE INDEX IF NOT EXISTS idx_bookings_car_id ON bookings(car_id);
CREATE INDEX IF NOT EXISTS idx_bookings_status ON bookings(status);
CREATE INDEX IF NOT EXISTS idx_bookings_start_date ON bookings(start_date);
CREATE INDEX IF NOT EXISTS idx_bookings_reference ON bookings(booking_reference);

-- ============================================================
-- CONTRACTS TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS contracts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  
  -- Foreign keys
  booking_id UUID NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Contract details
  contract_id VARCHAR(100) UNIQUE NOT NULL,
  storage_path TEXT,
  format TEXT DEFAULT 'html' CHECK (format IN ('html', 'pdf')),
  contract_data JSONB,
  
  -- Audit fields
  generated_at TIMESTAMP DEFAULT NOW(),
  created_at TIMESTAMP DEFAULT NOW()
);

-- Create indexes for contracts
CREATE INDEX IF NOT EXISTS idx_contracts_booking_id ON contracts(booking_id);
CREATE INDEX IF NOT EXISTS idx_contracts_user_id ON contracts(user_id);
CREATE INDEX IF NOT EXISTS idx_contracts_contract_id ON contracts(contract_id);

-- ============================================================
-- UPDATE CARS TABLE (Add missing columns if needed)
-- ============================================================
ALTER TABLE cars ADD COLUMN IF NOT EXISTS price_per_day DECIMAL(10, 2) DEFAULT 50.00;
ALTER TABLE cars ADD COLUMN IF NOT EXISTS license_plate VARCHAR(20);
ALTER TABLE cars ADD COLUMN IF NOT EXISTS transmission VARCHAR(20) DEFAULT 'Automatic';
ALTER TABLE cars ADD COLUMN IF NOT EXISTS fuel_type VARCHAR(20) DEFAULT 'Gasoline';
ALTER TABLE cars ADD COLUMN IF NOT EXISTS mileage INTEGER DEFAULT 0;
ALTER TABLE cars ADD COLUMN IF NOT EXISTS last_booked_at TIMESTAMP;

-- ============================================================
-- UPDATE PROFILES TABLE (Add missing columns if needed)
-- ============================================================
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'active' CHECK (status IN ('active', 'suspended', 'banned'));

-- ============================================================
-- FUNCTIONS & TRIGGERS
-- ============================================================

-- Function to update bookings.updated_at timestamp
CREATE OR REPLACE FUNCTION update_bookings_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for bookings.updated_at
DROP TRIGGER IF EXISTS bookings_updated_at_trigger ON bookings;
CREATE TRIGGER bookings_updated_at_trigger
BEFORE UPDATE ON bookings
FOR EACH ROW
EXECUTE FUNCTION update_bookings_updated_at();

-- Function to validate booking availability
CREATE OR REPLACE FUNCTION check_car_availability(
  p_car_id UUID,
  p_start_date TIMESTAMP,
  p_end_date TIMESTAMP,
  p_exclude_booking_id UUID DEFAULT NULL
)
RETURNS BOOLEAN AS $$
DECLARE
  conflict_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO conflict_count
  FROM bookings
  WHERE car_id = p_car_id
    AND status = 'confirmed'
    AND (id != p_exclude_booking_id OR p_exclude_booking_id IS NULL)
    AND (
      (start_date <= p_end_date AND end_date >= p_start_date)
    );
  
  RETURN conflict_count = 0;
END;
$$ LANGUAGE plpgsql;

-- Function to calculate total booking cost
CREATE OR REPLACE FUNCTION calculate_booking_cost(
  p_daily_rate DECIMAL,
  p_start_date TIMESTAMP,
  p_end_date TIMESTAMP,
  p_include_insurance BOOLEAN DEFAULT FALSE
)
RETURNS JSONB AS $$
DECLARE
  duration_days INTEGER;
  subtotal DECIMAL;
  insurance_cost DECIMAL;
  tax_amount DECIMAL;
  total_cost DECIMAL;
BEGIN
  duration_days := CEIL(EXTRACT(DAY FROM (p_end_date - p_start_date))::NUMERIC);
  
  IF duration_days <= 0 THEN
    duration_days := 1;
  END IF;
  
  subtotal := p_daily_rate * duration_days;
  insurance_cost := CASE WHEN p_include_insurance THEN subtotal * 0.05 ELSE 0 END;
  tax_amount := (subtotal + insurance_cost) * 0.10;
  total_cost := subtotal + insurance_cost + tax_amount;
  
  RETURN jsonb_build_object(
    'dailyRate', p_daily_rate,
    'durationDays', duration_days,
    'subtotal', ROUND(subtotal::NUMERIC, 2),
    'insurance', ROUND(insurance_cost::NUMERIC, 2),
    'taxes', ROUND(tax_amount::NUMERIC, 2),
    'total', ROUND(total_cost::NUMERIC, 2),
    'currency', 'USD'
  );
END;
$$ LANGUAGE plpgsql;

-- ============================================================
-- ROW-LEVEL SECURITY (RLS) POLICIES
-- ============================================================

-- Enable RLS on bookings table
ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;

-- Users can view their own bookings
CREATE POLICY "Users can view their own bookings" ON bookings
  FOR SELECT USING (auth.uid() = user_id);

-- Admin can view all bookings (optional - adjust based on your auth setup)
CREATE POLICY "Admins can view all bookings" ON bookings
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
        AND profiles.role = 'admin'
    )
  );

-- Enable RLS on contracts table
ALTER TABLE contracts ENABLE ROW LEVEL SECURITY;

-- Users can view their own contracts
CREATE POLICY "Users can view their own contracts" ON contracts
  FOR SELECT USING (auth.uid() = user_id);

-- ============================================================
-- SAMPLE DATA (Optional - Remove for production)
-- ============================================================
-- Uncomment to add sample cars if needed:

/*
INSERT INTO cars (name, model_year, transmission, fuel_type, price_per_day, license_plate)
VALUES
  ('Toyota Camry 2024', 2024, 'Automatic', 'Gasoline', 65.00, 'HC-001'),
  ('Honda CR-V 2024', 2024, 'Automatic', 'Hybrid', 75.00, 'HC-002'),
  ('Tesla Model 3 2024', 2024, 'Automatic', 'Electric', 95.00, 'HC-003')
ON CONFLICT DO NOTHING;
*/

-- ============================================================
-- GRANTS & PERMISSIONS
-- ============================================================

-- Grant permissions to authenticated users
GRANT SELECT ON bookings TO authenticated;
GRANT SELECT ON contracts TO authenticated;
GRANT SELECT ON cars TO authenticated;
GRANT SELECT ON profiles TO authenticated;

-- Grant service role full access (for Edge Functions)
GRANT ALL PRIVILEGES ON bookings TO postgres;
GRANT ALL PRIVILEGES ON contracts TO postgres;
GRANT ALL PRIVILEGES ON cars TO postgres;
GRANT ALL PRIVILEGES ON profiles TO postgres;

-- ============================================================
-- MIGRATION COMPLETE
-- ============================================================
-- Run this migration in Supabase Dashboard > SQL Editor
-- Or use: supabase migration new booking_system && supabase db push
