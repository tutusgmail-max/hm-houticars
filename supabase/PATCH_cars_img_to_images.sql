-- ============================================================
--  PATCH RAPIDE — Table cars : img → images
--  Si vous avez déjà exécuté la migration principale et eu
--  l'erreur "column images does not exist", collez JUSTE CE
--  fichier dans SQL Editor et réexécutez la migration complète.
-- ============================================================

-- Étape 1 : ajouter colonne "images" si elle n'existe pas
DO $$
BEGIN
  -- Cas : table a "img" (text) mais pas "images" (jsonb)
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'cars' AND column_name = 'img'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'cars' AND column_name = 'images'
  ) THEN
    RAISE NOTICE 'Migration cars: ajout colonne images depuis img';
    ALTER TABLE public.cars ADD COLUMN images jsonb NOT NULL DEFAULT '[]'::jsonb;
    -- Copier img (text URL) → images (jsonb array)
    UPDATE public.cars
    SET images = jsonb_build_array(img)
    WHERE img IS NOT NULL AND img <> '' AND trim(img) <> '';
    RAISE NOTICE 'Migration cars: % lignes migrées', (SELECT COUNT(*) FROM public.cars WHERE jsonb_array_length(images) > 0);
  END IF;

  -- Cas : ni "img" ni "images" → créer images vide
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'cars' AND column_name = 'images'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'cars' AND column_name = 'img'
  ) THEN
    RAISE NOTICE 'Migration cars: ajout colonne images (nouvelle)';
    ALTER TABLE public.cars ADD COLUMN images jsonb NOT NULL DEFAULT '[]'::jsonb;
  END IF;

  -- Cas : "images" existe déjà → rien à faire
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'cars' AND column_name = 'images'
  ) THEN
    RAISE NOTICE 'Migration cars: colonne images déjà présente, rien à faire';
  END IF;
END;
$$;

-- Étape 2 : s'assurer que "img" existe aussi (compat ancienne appli)
ALTER TABLE public.cars ADD COLUMN IF NOT EXISTS img text;

-- Étape 3 : sync img ↔ images (si images rempli mais img vide)
UPDATE public.cars
SET img = images ->> 0
WHERE img IS NULL AND images IS NOT NULL AND jsonb_array_length(images) > 0;

-- Vérification
SELECT
  id, name,
  img,
  images,
  jsonb_array_length(COALESCE(images, '[]'::jsonb)) AS nb_images
FROM public.cars
ORDER BY id;
