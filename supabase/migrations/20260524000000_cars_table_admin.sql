-- Cars fleet table + admin RLS + seed (5 vehicles)
-- Run in Supabase SQL Editor

CREATE TABLE IF NOT EXISTS public.cars (
  id            serial PRIMARY KEY,
  name          text NOT NULL,
  brand         text NOT NULL DEFAULT '',
  year          text DEFAULT '2024',
  category      text NOT NULL DEFAULT 'Citadine',
  price_per_day integer NOT NULL CHECK (price_per_day > 0),
  transmission  text NOT NULL DEFAULT 'Manuelle',
  fuel          text NOT NULL DEFAULT 'Essence',
  seats         integer NOT NULL DEFAULT 5 CHECK (seats > 0),
  available     boolean NOT NULL DEFAULT true,
  images        jsonb NOT NULL DEFAULT '[]'::jsonb,
  badge         text,
  specs         jsonb NOT NULL DEFAULT '[]'::jsonb,
  sort_order    integer NOT NULL DEFAULT 0,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_cars_available ON public.cars(available);
CREATE INDEX IF NOT EXISTS idx_cars_sort ON public.cars(sort_order);

ALTER TABLE public.cars ENABLE ROW LEVEL SECURITY;

-- Anyone can read available cars (public site)
DROP POLICY IF EXISTS "Public read available cars" ON public.cars;
CREATE POLICY "Public read available cars"
  ON public.cars FOR SELECT
  USING (available = true);

-- Admins read all cars (including unavailable)
DROP POLICY IF EXISTS "Admins read all cars" ON public.cars;
CREATE POLICY "Admins read all cars"
  ON public.cars FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.role = 'admin'
    )
  );

DROP POLICY IF EXISTS "Admins insert cars" ON public.cars;
CREATE POLICY "Admins insert cars"
  ON public.cars FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.role = 'admin'
    )
  );

DROP POLICY IF EXISTS "Admins update cars" ON public.cars;
CREATE POLICY "Admins update cars"
  ON public.cars FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.role = 'admin'
    )
  );

DROP POLICY IF EXISTS "Admins delete cars" ON public.cars;
CREATE POLICY "Admins delete cars"
  ON public.cars FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.role = 'admin'
    )
  );

-- Admins: full reservation management
DROP POLICY IF EXISTS "Admins delete reservations" ON public.reservations;
CREATE POLICY "Admins delete reservations"
  ON public.reservations FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.role = 'admin'
    )
  );

-- Storage: admin upload car images (bucket: image)
DROP POLICY IF EXISTS "Admins upload car images" ON storage.objects;
CREATE POLICY "Admins upload car images"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'image'
    AND EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.role = 'admin'
    )
  );

DROP POLICY IF EXISTS "Admins update car images" ON storage.objects;
CREATE POLICY "Admins update car images"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'image'
    AND EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.role = 'admin'
    )
  );

-- Seed fleet (only if empty)
INSERT INTO public.cars (id, name, brand, year, category, price_per_day, transmission, fuel, seats, available, images, badge, specs, sort_order)
SELECT * FROM (VALUES
  (1, 'Dacia Sandero', 'Dacia', '2024', 'Citadine', 180, 'Manuelle', 'Essence', 5, true,
   '["https://upload.wikimedia.org/wikipedia/commons/thumb/4/4a/2020_Dacia_Sandero_Stepway_%28facelift%2C_Romania%29_front_8_March_2020_%28cropped%29.jpg/800px-2020_Dacia_Sandero_Stepway_%28facelift%2C_Romania%29_front_8_March_2020_%28cropped%29.jpg"]'::jsonb,
   'Populaire', '["A/C","USB","Bluetooth"]'::jsonb, 1),
  (2, 'Renault Clio 5', 'Renault', '2024', 'Citadine', 220, 'Manuelle', 'Essence', 5, true,
   '["https://ertdqfavrkomikszagtc.supabase.co/storage/v1/object/public/image/houti%20cars/clio%205.jpg"]'::jsonb,
   NULL, '["A/C","Apple CarPlay"]'::jsonb, 2),
  (4, 'Dacia Logan', 'Dacia', '2023', 'Berline', 200, 'Manuelle', 'Diesel', 5, true,
   '["https://ertdqfavrkomikszagtc.supabase.co/storage/v1/object/public/image/houti%20cars/dacia%20logan.jpg"]'::jsonb,
   NULL, '["A/C","USB"]'::jsonb, 3),
  (5, 'Volkswagen T-Roc', 'Volkswagen', '2024', 'SUV', 280, 'Automatique', 'Essence', 5, true,
   '["https://ertdqfavrkomikszagtc.supabase.co/storage/v1/object/public/image/houti%20cars/troc.jpg"]'::jsonb,
   'Premium', '["A/C","GPS","Bluetooth"]'::jsonb, 4),
  (9, 'Opel Corsa', 'Opel', '2024', 'Citadine', 210, 'Manuelle', 'Essence', 5, true,
   '["https://ertdqfavrkomikszagtc.supabase.co/storage/v1/object/public/image/houti%20cars/opelcorsa.jpg"]'::jsonb,
   NULL, '["A/C","USB"]'::jsonb, 5)
) AS v(id, name, brand, year, category, price_per_day, transmission, fuel, seats, available, images, badge, specs, sort_order)
WHERE NOT EXISTS (SELECT 1 FROM public.cars LIMIT 1);

SELECT setval(pg_get_serial_sequence('public.cars', 'id'), COALESCE((SELECT MAX(id) FROM public.cars), 1));

NOTIFY pgrst, 'reload schema';
