-- Dacia Sandero: Supabase storage image (production bucket)
INSERT INTO public.cars (
  id, name, brand, year, category, price_per_day, transmission, fuel, seats, available, images, description
) VALUES (
  1,
  'Dacia Sandero',
  'Dacia',
  '2024',
  'Citadine',
  350,
  'Manuelle',
  'Diesel',
  5,
  true,
  '["https://cmoioidgxealxfirkssc.supabase.co/storage/v1/object/public/image/houti%20cars/dacia%20sandero.jpg"]'::jsonb,
  'Citadine économique, idéale pour la ville.'
)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  brand = EXCLUDED.brand,
  year = EXCLUDED.year,
  category = EXCLUDED.category,
  price_per_day = EXCLUDED.price_per_day,
  transmission = EXCLUDED.transmission,
  fuel = EXCLUDED.fuel,
  seats = EXCLUDED.seats,
  available = EXCLUDED.available,
  images = EXCLUDED.images,
  description = EXCLUDED.description;
