-- Ensure every Dacia Sandero row uses the public storage image
UPDATE public.cars
SET images = '["https://ertdqfavrkomikszagtc.supabase.co/storage/v1/object/public/voiture/houti%20cars/dacia%20sandero.jpg"]'::jsonb
WHERE id = 1 OR lower(name) LIKE '%sandero%';
