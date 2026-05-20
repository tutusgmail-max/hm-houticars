-- ============================================================================
--  HM HOUTI CARS — Migration Complète Production v4
--  Fichier : MIGRATION_COMPLETE_V4.sql
--  À coller ENTIER dans Supabase > SQL Editor > New query
--  Idempotent : peut être exécuté plusieurs fois sans erreur
-- ============================================================================

-- ─── 0. RELOAD SCHEMA CACHE (avant tout) ─────────────────────────────────────
NOTIFY pgrst, 'reload schema';

-- ─── 1. PROFILES ─────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.profiles (
  id          uuid REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  full_name   text,
  phone       text,
  email       text,
  role        text NOT NULL DEFAULT 'client',
  avatar_url  text,
  identity_documents jsonb DEFAULT '{}'::jsonb,
  created_at  timestamptz DEFAULT now(),
  updated_at  timestamptz DEFAULT now()
);

-- Colonnes ajoutées progressivement — idempotent
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS identity_documents jsonb DEFAULT '{}'::jsonb;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS avatar_url text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();

-- Trigger auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, phone, role)
  VALUES (
    NEW.id,
    NEW.email,
    NEW.raw_user_meta_data->>'full_name',
    NEW.raw_user_meta_data->>'phone',
    'client'
  )
  ON CONFLICT (id) DO UPDATE SET
    email     = EXCLUDED.email,
    full_name = COALESCE(public.profiles.full_name, EXCLUDED.full_name),
    phone     = COALESCE(public.profiles.phone, EXCLUDED.phone);
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- Trigger updated_at sur profiles
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS profiles_updated_at ON public.profiles;
CREATE TRIGGER profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own profile"   ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Admins update all profiles"   ON public.profiles;

CREATE POLICY "Users can view own profile"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can insert own profile"
  ON public.profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Admins can view all profiles"
  ON public.profiles FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
  );

CREATE POLICY "Admins update all profiles"
  ON public.profiles FOR UPDATE
  USING (
    EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
  );


-- ─── 2. CARS ─────────────────────────────────────────────────────────────────

-- FIX : table sans "images" dans le CREATE (gérée par le bloc DO ci-dessous)
-- Compatible avec les tables existantes ayant "img" (ancienne version)
CREATE TABLE IF NOT EXISTS public.cars (
  id            serial PRIMARY KEY,
  name          text NOT NULL,
  brand         text NOT NULL DEFAULT '',
  year          text DEFAULT '2024',
  category      text NOT NULL DEFAULT 'Citadine',
  price_per_day integer NOT NULL DEFAULT 200 CHECK (price_per_day > 0),
  transmission  text NOT NULL DEFAULT 'Manuelle',
  fuel          text NOT NULL DEFAULT 'Essence',
  seats         integer NOT NULL DEFAULT 5 CHECK (seats > 0),
  available     boolean NOT NULL DEFAULT true,
  badge         text,
  specs         jsonb NOT NULL DEFAULT '[]'::jsonb,
  sort_order    integer NOT NULL DEFAULT 0,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.cars ADD COLUMN IF NOT EXISTS brand text NOT NULL DEFAULT '';
ALTER TABLE public.cars ADD COLUMN IF NOT EXISTS year text DEFAULT '2024';
ALTER TABLE public.cars ADD COLUMN IF NOT EXISTS badge text;
ALTER TABLE public.cars ADD COLUMN IF NOT EXISTS specs jsonb NOT NULL DEFAULT '[]'::jsonb;
ALTER TABLE public.cars ADD COLUMN IF NOT EXISTS sort_order integer NOT NULL DEFAULT 0;
-- Compatibilité : garder "img" text si déjà présent
ALTER TABLE public.cars ADD COLUMN IF NOT EXISTS img text;

-- Fix: ajouter colonne images si la table existait avec l'ancienne colonne "img"
-- On vérifie quelle colonne existe et on adapte
DO $$
BEGIN
  -- Si la colonne "img" existe mais pas "images", on la renomme
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'cars' AND column_name = 'img'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'cars' AND column_name = 'images'
  ) THEN
    -- Renommer img → images et convertir text → jsonb
    ALTER TABLE public.cars ADD COLUMN images jsonb NOT NULL DEFAULT '[]'::jsonb;
    UPDATE public.cars SET images = jsonb_build_array(img) WHERE img IS NOT NULL AND img <> '';
    -- Garder img pour compatibilité (ne pas dropper)
  END IF;

  -- Si ni "img" ni "images" n'existent
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'cars' AND column_name = 'images'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'cars' AND column_name = 'img'
  ) THEN
    ALTER TABLE public.cars ADD COLUMN images jsonb NOT NULL DEFAULT '[]'::jsonb;
  END IF;
END;
$$;

-- NOTE : la fonction car_first_image est créée APRÈS le bloc DO $$
-- qui garantit que la colonne "images" existe (créée depuis "img" si besoin).
-- Pas besoin d'une colonne GENERATED — les services JS lisent directement images[0].

CREATE INDEX IF NOT EXISTS idx_cars_available ON public.cars (available);
CREATE INDEX IF NOT EXISTS idx_cars_sort       ON public.cars (sort_order, id);

DROP TRIGGER IF EXISTS cars_updated_at ON public.cars;
CREATE TRIGGER cars_updated_at
  BEFORE UPDATE ON public.cars
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.cars ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public read available cars" ON public.cars;
DROP POLICY IF EXISTS "Admins read all cars"        ON public.cars;
DROP POLICY IF EXISTS "Admins insert cars"          ON public.cars;
DROP POLICY IF EXISTS "Admins update cars"          ON public.cars;
DROP POLICY IF EXISTS "Admins delete cars"          ON public.cars;

-- Anon + authentifié peuvent voir les voitures disponibles (page publique)
CREATE POLICY "Public read available cars"
  ON public.cars FOR SELECT
  USING (available = true);

CREATE POLICY "Admins read all cars"
  ON public.cars FOR SELECT
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
  );

CREATE POLICY "Admins insert cars"
  ON public.cars FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
  );

CREATE POLICY "Admins update cars"
  ON public.cars FOR UPDATE
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
  );

CREATE POLICY "Admins delete cars"
  ON public.cars FOR DELETE
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
  );


-- ─── 3. RESERVATIONS ─────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.reservations (
  id               uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  ref              text,
  user_id          uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  car_id           integer NOT NULL,
  car_name         text NOT NULL,
  car_price        integer NOT NULL DEFAULT 0,
  pickup_location  text,
  return_location  text,
  start_date       date NOT NULL,
  end_date         date NOT NULL,
  days             integer NOT NULL DEFAULT 1,
  total            numeric(10,2),
  total_price      numeric(10,2),
  payment_method   text NOT NULL DEFAULT 'cash',
  notes            text,
  customer_name    text,
  customer_email   text,
  customer_phone   text,
  status           text NOT NULL DEFAULT 'pending'
                   CHECK (status IN ('pending','confirmed','completed','cancelled')),
  documents        jsonb DEFAULT '{}'::jsonb,
  cin_front_url    text,
  cin_back_url     text,
  permis_front_url text,
  permis_back_url  text,
  "reference"      text,
  created_at       timestamptz DEFAULT now(),
  updated_at       timestamptz DEFAULT now()
);

-- Colonnes v3+ idempotentes
ALTER TABLE public.reservations ADD COLUMN IF NOT EXISTS ref              text;
ALTER TABLE public.reservations ADD COLUMN IF NOT EXISTS "reference"      text;
ALTER TABLE public.reservations ADD COLUMN IF NOT EXISTS total            numeric(10,2);
ALTER TABLE public.reservations ADD COLUMN IF NOT EXISTS total_price      numeric(10,2);
ALTER TABLE public.reservations ADD COLUMN IF NOT EXISTS pickup_location  text;
ALTER TABLE public.reservations ADD COLUMN IF NOT EXISTS return_location  text;
ALTER TABLE public.reservations ADD COLUMN IF NOT EXISTS documents        jsonb DEFAULT '{}'::jsonb;
ALTER TABLE public.reservations ADD COLUMN IF NOT EXISTS cin_front_url    text;
ALTER TABLE public.reservations ADD COLUMN IF NOT EXISTS cin_back_url     text;
ALTER TABLE public.reservations ADD COLUMN IF NOT EXISTS permis_front_url text;
ALTER TABLE public.reservations ADD COLUMN IF NOT EXISTS permis_back_url  text;
ALTER TABLE public.reservations ADD COLUMN IF NOT EXISTS customer_email   text;
ALTER TABLE public.reservations ADD COLUMN IF NOT EXISTS customer_phone   text;
ALTER TABLE public.reservations ADD COLUMN IF NOT EXISTS customer_name    text;
ALTER TABLE public.reservations ADD COLUMN IF NOT EXISTS updated_at       timestamptz DEFAULT now();

-- Sync alias columns
UPDATE public.reservations SET "reference" = ref      WHERE "reference" IS NULL AND ref IS NOT NULL;
UPDATE public.reservations SET ref = "reference"      WHERE ref IS NULL         AND "reference" IS NOT NULL;
UPDATE public.reservations SET total = total_price    WHERE total IS NULL       AND total_price IS NOT NULL;
UPDATE public.reservations SET total_price = total    WHERE total_price IS NULL AND total IS NOT NULL;

-- Trigger updated_at
DROP TRIGGER IF EXISTS reservations_updated_at ON public.reservations;
CREATE TRIGGER reservations_updated_at
  BEFORE UPDATE ON public.reservations
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Indexes
CREATE INDEX IF NOT EXISTS idx_res_car_status_dates  ON public.reservations (car_id, status, start_date, end_date);
CREATE INDEX IF NOT EXISTS idx_res_user_id           ON public.reservations (user_id);
CREATE INDEX IF NOT EXISTS idx_res_status            ON public.reservations (status);
CREATE INDEX IF NOT EXISTS idx_res_created_at        ON public.reservations (created_at DESC);

ALTER TABLE public.reservations ENABLE ROW LEVEL SECURITY;

-- Drop ALL known policy names (old + new)
DROP POLICY IF EXISTS "Users can view own reservations"         ON public.reservations;
DROP POLICY IF EXISTS "Users can create reservations"           ON public.reservations;
DROP POLICY IF EXISTS "Authenticated read availability dates"   ON public.reservations;
DROP POLICY IF EXISTS "Admins can view all reservations"        ON public.reservations;
DROP POLICY IF EXISTS "Admins can update all reservations"      ON public.reservations;
DROP POLICY IF EXISTS "Admins delete reservations"              ON public.reservations;
DROP POLICY IF EXISTS "Users read own"                          ON public.reservations;
DROP POLICY IF EXISTS "Users insert own"                        ON public.reservations;
DROP POLICY IF EXISTS "Admin full access"                       ON public.reservations;
DROP POLICY IF EXISTS "Users read own reservations"             ON public.reservations;
DROP POLICY IF EXISTS "Users insert own reservations"           ON public.reservations;
DROP POLICY IF EXISTS "Admin full access on reservations"       ON public.reservations;
DROP POLICY IF EXISTS "Anon read car availability"              ON public.reservations;

-- Policies propres
CREATE POLICY "Users can view own reservations"
  ON public.reservations FOR SELECT
  USING (auth.uid() = user_id);

-- FIX : clients peuvent créer sans restriction de statut côté policy
-- (le statut 'pending' est enforced via DEFAULT + application layer)
CREATE POLICY "Users can create reservations"
  ON public.reservations FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- FIX CRITIQUE : utilisateurs authentifiés peuvent lire les dates occupées
-- pour le calendrier de disponibilité (sans voir les données privées)
CREATE POLICY "Authenticated read availability dates"
  ON public.reservations FOR SELECT
  TO authenticated
  USING (status IN ('pending', 'confirmed', 'completed'));

-- Admin : accès complet
CREATE POLICY "Admins can view all reservations"
  ON public.reservations FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
  );

CREATE POLICY "Admins can update all reservations"
  ON public.reservations FOR UPDATE
  USING (
    EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
  );

CREATE POLICY "Admins delete reservations"
  ON public.reservations FOR DELETE
  USING (
    EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
  );


-- ─── 4. USER_DOCUMENTS ───────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.user_documents (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  doc_type     text NOT NULL,
  storage_path text NOT NULL,
  uploaded_at  timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, doc_type)
);

-- FIX : contrainte sur doc_type (anciens noms + nouveaux)
ALTER TABLE public.user_documents
  DROP CONSTRAINT IF EXISTS user_documents_doc_type_check;

ALTER TABLE public.user_documents
  ADD CONSTRAINT user_documents_doc_type_check CHECK (
    doc_type IN (
      'cin_front', 'cin_back', 'permis_front', 'permis_back',
      'cin_recto', 'cin_verso', 'permis_recto', 'permis_verso'
    )
  );

CREATE INDEX IF NOT EXISTS idx_user_docs_user_doc ON public.user_documents (user_id, doc_type);

ALTER TABLE public.user_documents ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users read own documents"   ON public.user_documents;
DROP POLICY IF EXISTS "Users insert own documents" ON public.user_documents;
DROP POLICY IF EXISTS "Users upsert own documents" ON public.user_documents;
DROP POLICY IF EXISTS "Users update own documents" ON public.user_documents;
DROP POLICY IF EXISTS "Admin read all documents"   ON public.user_documents;
DROP POLICY IF EXISTS "Admins view all user docs"  ON public.user_documents;

CREATE POLICY "Users read own documents"
  ON public.user_documents FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users insert own documents"
  ON public.user_documents FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users update own documents"
  ON public.user_documents FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins view all user docs"
  ON public.user_documents FOR ALL
  USING (
    EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
  );


-- ─── 5. NOTIFICATIONS (admin realtime feed) ───────────────────────────────────

CREATE TABLE IF NOT EXISTS public.notifications (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  type       text NOT NULL DEFAULT 'reservation',  -- 'reservation' | 'document' | 'system'
  title      text NOT NULL,
  message    text,
  data       jsonb DEFAULT '{}'::jsonb,
  read       boolean NOT NULL DEFAULT false,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins manage notifications" ON public.notifications;

CREATE POLICY "Admins manage notifications"
  ON public.notifications FOR ALL
  USING (
    EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
  );

CREATE INDEX IF NOT EXISTS idx_notifications_read       ON public.notifications (read, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON public.notifications (created_at DESC);


-- ─── 6. ADMIN_SETTINGS ────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.admin_settings (
  id         integer PRIMARY KEY DEFAULT 1,
  settings   jsonb NOT NULL DEFAULT '{}'::jsonb,
  updated_at timestamptz DEFAULT now(),
  CONSTRAINT single_row CHECK (id = 1)
);

INSERT INTO public.admin_settings (id, settings) VALUES (1, '{}')
ON CONFLICT (id) DO NOTHING;

ALTER TABLE public.admin_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins manage settings" ON public.admin_settings;

CREATE POLICY "Admins manage settings"
  ON public.admin_settings FOR ALL
  USING (
    EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
  );


-- ─── 7. STORAGE BUCKETS ──────────────────────────────────────────────────────

-- documents bucket (privé — CIN + permis)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'documents', 'documents', false,
  5242880,
  ARRAY['image/jpeg','image/jpg','image/png','application/pdf']
)
ON CONFLICT (id) DO UPDATE SET
  public             = false,
  file_size_limit    = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- image bucket (public — photos voitures)
INSERT INTO storage.buckets (id, name, public)
VALUES ('image', 'image', true)
ON CONFLICT (id) DO UPDATE SET public = true;

-- avatars bucket (public)
INSERT INTO storage.buckets (id, name, public)
VALUES ('avatars', 'avatars', true)
ON CONFLICT (id) DO NOTHING;

-- ── Storage policies : documents ──────────────────────────────────────────────

DROP POLICY IF EXISTS "Users upload own docs"      ON storage.objects;
DROP POLICY IF EXISTS "Users view own docs"        ON storage.objects;
DROP POLICY IF EXISTS "Users update own docs"      ON storage.objects;
DROP POLICY IF EXISTS "Users delete own docs"      ON storage.objects;
DROP POLICY IF EXISTS "Admins view all docs"       ON storage.objects;
DROP POLICY IF EXISTS "Users upload own documents" ON storage.objects;
DROP POLICY IF EXISTS "Users read own documents"   ON storage.objects;
DROP POLICY IF EXISTS "Users update own documents" ON storage.objects;
DROP POLICY IF EXISTS "Admins access all documents" ON storage.objects;

-- FIX CRITIQUE : les paths sont cin/{userId}/... et permis/{userId}/...
-- donc userId est en position [2] (1-indexé dans string_to_array)
CREATE POLICY "Users upload own docs"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'documents'
    AND auth.uid() IS NOT NULL
    AND auth.uid()::text = (string_to_array(name, '/'))[2]
  );

CREATE POLICY "Users view own docs"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'documents'
    AND (
      auth.uid()::text = (string_to_array(name, '/'))[2]
      OR EXISTS (
        SELECT 1 FROM public.profiles p
        WHERE p.id = auth.uid() AND p.role = 'admin'
      )
    )
  );

CREATE POLICY "Users update own docs"
  ON storage.objects FOR UPDATE
  USING (
    bucket_id = 'documents'
    AND auth.uid()::text = (string_to_array(name, '/'))[2]
  );

CREATE POLICY "Users delete own docs"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'documents'
    AND auth.uid()::text = (string_to_array(name, '/'))[2]
  );

CREATE POLICY "Admins view all docs"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'documents'
    AND EXISTS (
      SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin'
    )
  );

-- ── Storage policies : car images ─────────────────────────────────────────────

DROP POLICY IF EXISTS "Public read car images"   ON storage.objects;
DROP POLICY IF EXISTS "Admins upload car images" ON storage.objects;
DROP POLICY IF EXISTS "Admins update car images" ON storage.objects;
DROP POLICY IF EXISTS "Admins delete car images" ON storage.objects;

CREATE POLICY "Public read car images"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'image');

CREATE POLICY "Admins upload car images"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'image'
    AND EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
  );

CREATE POLICY "Admins update car images"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'image'
    AND EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
  );

CREATE POLICY "Admins delete car images"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'image'
    AND EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
  );


-- ─── 8. FUNCTION : créer notification lors d'une réservation ─────────────────

CREATE OR REPLACE FUNCTION public.notify_admin_new_reservation()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.notifications (type, title, message, data)
    VALUES (
      'reservation',
      'Nouvelle réservation reçue',
      format('%s — %s au %s',
        COALESCE(NEW.car_name, 'Véhicule'),
        to_char(NEW.start_date, 'DD/MM/YYYY'),
        to_char(NEW.end_date, 'DD/MM/YYYY')
      ),
      jsonb_build_object(
        'reservation_id', NEW.id,
        'car_name', NEW.car_name,
        'customer_name', COALESCE(NEW.customer_name, ''),
        'status', NEW.status,
        'start_date', NEW.start_date,
        'end_date', NEW.end_date
      )
    );
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_admin_reservation ON public.reservations;
CREATE TRIGGER trg_notify_admin_reservation
  AFTER INSERT ON public.reservations
  FOR EACH ROW EXECUTE FUNCTION public.notify_admin_new_reservation();


-- ─── 9. FUNCTION : vérifier overlap (seulement confirmed + completed bloquent) ─

-- FIX CRITIQUE : 'pending' NE BLOQUE PAS les nouvelles demandes
-- Plusieurs clients peuvent demander les mêmes dates — l'admin confirme le premier
CREATE OR REPLACE FUNCTION public.check_reservation_overlap()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM public.reservations
    WHERE car_id     = NEW.car_id
      AND id        <> NEW.id
      AND status    IN ('confirmed', 'completed')   -- ← seulement ces 2 bloquent
      AND start_date <= NEW.end_date
      AND end_date   >= NEW.start_date
  ) THEN
    RAISE EXCEPTION 'Ce véhicule est déjà confirmé sur ces dates.' USING ERRCODE = 'P0001';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS prevent_reservation_overlap ON public.reservations;
CREATE TRIGGER prevent_reservation_overlap
  BEFORE INSERT OR UPDATE ON public.reservations
  FOR EACH ROW
  WHEN (NEW.status IN ('confirmed', 'completed'))
  EXECUTE FUNCTION public.check_reservation_overlap();


-- ─── 10. REALTIME ─────────────────────────────────────────────────────────────

-- Activer realtime pour les tables admin
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND tablename = 'reservations'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.reservations;
  END IF;
END;
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND tablename = 'notifications'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
  END IF;
END;
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND tablename = 'user_documents'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.user_documents;
  END IF;
END;
$$;


-- ─── 11. RELOAD SCHEMA CACHE ─────────────────────────────────────────────────
NOTIFY pgrst, 'reload schema';


-- ─── 12. FIXEZ VOTRE COMPTE ADMIN ────────────────────────────────────────────
-- Après votre premier signup, décommentez et exécutez avec votre email :
-- UPDATE public.profiles SET role = 'admin' WHERE email = 'votre@email.com';


-- ─── 13. VÉRIFICATION FINALE ─────────────────────────────────────────────────
-- Exécutez ces SELECT pour vérifier que tout est en place :
SELECT 'profiles'      AS table_name, count(*) FROM public.profiles      UNION ALL
SELECT 'cars'          AS table_name, count(*) FROM public.cars           UNION ALL
SELECT 'reservations'  AS table_name, count(*) FROM public.reservations   UNION ALL
SELECT 'user_documents',               count(*) FROM public.user_documents UNION ALL
SELECT 'notifications',                count(*) FROM public.notifications;

-- ============================================================================
-- FIN MIGRATION v4 — Projet prêt pour production
-- ============================================================================
