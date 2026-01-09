-- ==========================================
-- MIGRACIÓN COMPLETA: Sistema de Imágenes de Referencia
-- Crea movie_scenes si no existe + añade columnas necesarias
-- Ejecutar esto en Supabase SQL Editor
-- ==========================================

-- PASO 1: Crear tabla movie_scenes si no existe (versión mínima sin dependencias problemáticas)
CREATE TABLE IF NOT EXISTS public.movie_scenes (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  movie_id UUID NOT NULL,
  
  -- Información de escena
  scene_number INTEGER NOT NULL,
  scene_id TEXT,
  
  -- Contenido generado
  video_url TEXT,
  video_duration_seconds INTEGER,
  
  -- Prompts usados
  video_prompt TEXT,
  full_scene_description TEXT,
  
  -- Estado
  status TEXT DEFAULT 'pending',
  error_message TEXT,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Constraint: una escena única por película
  UNIQUE(movie_id, scene_number)
);

-- Añadir foreign key a movies (solo si movies existe)
DO $$
BEGIN
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'movies') THEN
    -- Eliminar constraint si existe antes de recrearla
    ALTER TABLE public.movie_scenes DROP CONSTRAINT IF EXISTS movie_scenes_movie_id_fkey;
    ALTER TABLE public.movie_scenes 
    ADD CONSTRAINT movie_scenes_movie_id_fkey 
    FOREIGN KEY (movie_id) 
    REFERENCES public.movies(id) 
    ON DELETE CASCADE;
  END IF;
END $$;

-- Crear índices básicos
CREATE INDEX IF NOT EXISTS idx_movie_scenes_movie ON public.movie_scenes(movie_id);
CREATE INDEX IF NOT EXISTS idx_movie_scenes_status ON public.movie_scenes(status);

-- PASO 2: Añadir columnas a movies (si la tabla existe)
DO $$
BEGIN
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'movies') THEN
    ALTER TABLE public.movies ADD COLUMN IF NOT EXISTS video_url TEXT;
    ALTER TABLE public.movies ADD COLUMN IF NOT EXISTS poster_url TEXT;
    ALTER TABLE public.movies ADD COLUMN IF NOT EXISTS thumbnail_url TEXT;
    RAISE NOTICE '✅ Columnas añadidas a movies';
  ELSE
    RAISE WARNING '⚠️ Tabla movies no existe. Asegúrate de crearla primero.';
  END IF;
END $$;

-- PASO 3: Añadir nuevas columnas a movie_scenes (ya existe o se acaba de crear)
ALTER TABLE public.movie_scenes ADD COLUMN IF NOT EXISTS reference_image_url TEXT;
ALTER TABLE public.movie_scenes ADD COLUMN IF NOT EXISTS reference_image_source TEXT;
ALTER TABLE public.movie_scenes ADD COLUMN IF NOT EXISTS end_frame_url TEXT;
ALTER TABLE public.movie_scenes ADD COLUMN IF NOT EXISTS location_image_id UUID;

-- Añadir columnas opcionales adicionales si no existen
ALTER TABLE public.movie_scenes ADD COLUMN IF NOT EXISTS location_id UUID;
ALTER TABLE public.movie_scenes ADD COLUMN IF NOT EXISTS location_snapshot JSONB;
ALTER TABLE public.movie_scenes ADD COLUMN IF NOT EXISTS is_continuation BOOLEAN DEFAULT false;
ALTER TABLE public.movie_scenes ADD COLUMN IF NOT EXISTS continues_from_scene INTEGER;
ALTER TABLE public.movie_scenes ADD COLUMN IF NOT EXISTS reference_frames JSONB DEFAULT '{}';

-- PASO 4: Crear tabla location_images
CREATE TABLE IF NOT EXISTS public.location_images (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  location_name TEXT NOT NULL,
  location_slug TEXT NOT NULL,
  time_of_day TEXT DEFAULT 'day',
  weather TEXT DEFAULT 'clear',
  image_url TEXT NOT NULL,
  thumbnail_url TEXT,
  generation_prompt TEXT,
  width INTEGER DEFAULT 1280,
  height INTEGER DEFAULT 768,
  times_used INTEGER DEFAULT 0,
  last_used_at TIMESTAMPTZ,
  created_by_movie_id UUID,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(location_slug, time_of_day, weather)
);

-- Añadir foreign key constraint para location_images.created_by_movie_id
DO $$
BEGIN
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'movies') THEN
    ALTER TABLE public.location_images DROP CONSTRAINT IF EXISTS location_images_created_by_movie_id_fkey;
    ALTER TABLE public.location_images 
    ADD CONSTRAINT location_images_created_by_movie_id_fkey 
    FOREIGN KEY (created_by_movie_id) 
    REFERENCES public.movies(id) 
    ON DELETE SET NULL;
  END IF;
END $$;

-- PASO 5: Crear índices
CREATE INDEX IF NOT EXISTS idx_location_images_slug ON public.location_images(location_slug);
CREATE INDEX IF NOT EXISTS idx_location_images_name ON public.location_images USING GIN(to_tsvector('spanish', location_name));
CREATE INDEX IF NOT EXISTS idx_location_images_time ON public.location_images(time_of_day);
CREATE INDEX IF NOT EXISTS idx_location_images_weather ON public.location_images(weather);
CREATE INDEX IF NOT EXISTS idx_location_images_movie ON public.location_images(created_by_movie_id);

CREATE INDEX IF NOT EXISTS idx_movie_scenes_location_image ON public.movie_scenes(location_image_id);
CREATE INDEX IF NOT EXISTS idx_movie_scenes_reference_source ON public.movie_scenes(reference_image_source);
CREATE INDEX IF NOT EXISTS idx_movie_scenes_location ON public.movie_scenes(location_id);

-- PASO 6: Añadir foreign key para movie_scenes.location_image_id
DO $$
BEGIN
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'location_images') THEN
    ALTER TABLE public.movie_scenes DROP CONSTRAINT IF EXISTS movie_scenes_location_image_id_fkey;
    ALTER TABLE public.movie_scenes 
    ADD CONSTRAINT movie_scenes_location_image_id_fkey 
    FOREIGN KEY (location_image_id) 
    REFERENCES public.location_images(id) 
    ON DELETE SET NULL;
  END IF;
END $$;

-- PASO 7: Habilitar RLS en movie_scenes (si no está ya habilitado)
ALTER TABLE public.movie_scenes ENABLE ROW LEVEL SECURITY;

-- Crear políticas RLS básicas (solo si movies existe)
DO $$
BEGIN
  -- Verificar si movies existe antes de crear políticas que la referencian
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'movies') THEN
    
    IF NOT EXISTS (
      SELECT 1 FROM pg_policies 
      WHERE schemaname = 'public' 
      AND tablename = 'movie_scenes' 
      AND policyname = 'allow_read_scenes'
    ) THEN
      CREATE POLICY "allow_read_scenes" ON public.movie_scenes
        FOR SELECT TO authenticated
        USING (
          movie_id IN (SELECT id FROM public.movies WHERE user_id = auth.uid())
          OR EXISTS (
            SELECT 1 FROM public.profiles
            WHERE profiles.id = auth.uid()
            AND profiles.role IN ('admin', 'superadmin')
          )
        );
      RAISE NOTICE '✅ Política allow_read_scenes creada';
    END IF;

    IF NOT EXISTS (
      SELECT 1 FROM pg_policies 
      WHERE schemaname = 'public' 
      AND tablename = 'movie_scenes' 
      AND policyname = 'allow_insert_scenes'
    ) THEN
      CREATE POLICY "allow_insert_scenes" ON public.movie_scenes
        FOR INSERT TO authenticated
        WITH CHECK (
          movie_id IN (SELECT id FROM public.movies WHERE user_id = auth.uid())
          OR EXISTS (
            SELECT 1 FROM public.profiles
            WHERE profiles.id = auth.uid()
            AND profiles.role IN ('admin', 'superadmin')
          )
        );
      RAISE NOTICE '✅ Política allow_insert_scenes creada';
    END IF;

    IF NOT EXISTS (
      SELECT 1 FROM pg_policies 
      WHERE schemaname = 'public' 
      AND tablename = 'movie_scenes' 
      AND policyname = 'allow_update_scenes'
    ) THEN
      CREATE POLICY "allow_update_scenes" ON public.movie_scenes
        FOR UPDATE TO authenticated
        USING (
          movie_id IN (SELECT id FROM public.movies WHERE user_id = auth.uid())
          OR EXISTS (
            SELECT 1 FROM public.profiles
            WHERE profiles.id = auth.uid()
            AND profiles.role IN ('admin', 'superadmin')
          )
        );
      RAISE NOTICE '✅ Política allow_update_scenes creada';
    END IF;
  ELSE
    RAISE WARNING '⚠️ Tabla movies no existe. Políticas RLS no creadas. Créalas después de crear la tabla movies.';
  END IF;
END $$;

-- PASO 8: Crear trigger para updated_at
CREATE OR REPLACE FUNCTION public.update_movie_scenes_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_movie_scenes_updated_at ON public.movie_scenes;
CREATE TRIGGER update_movie_scenes_updated_at
  BEFORE UPDATE ON public.movie_scenes
  FOR EACH ROW
  EXECUTE FUNCTION public.update_movie_scenes_updated_at();

-- PASO 9: Comentarios para documentación
COMMENT ON TABLE public.location_images IS 'Biblioteca de imágenes de referencia de lugares para mantener continuidad visual entre escenas';
COMMENT ON COLUMN public.location_images.location_slug IS 'Slug normalizado del nombre del lugar para búsquedas';
COMMENT ON COLUMN public.location_images.time_of_day IS 'Hora del día: day, night, sunset, sunrise, golden_hour';
COMMENT ON COLUMN public.location_images.weather IS 'Condición climática: clear, cloudy, rainy, foggy';
COMMENT ON COLUMN public.movie_scenes.reference_image_source IS 'Origen de la imagen: library (de biblioteca), generated (generada nueva), previous_frame (frame anterior)';

-- ✅ MIGRACIÓN COMPLETA
SELECT '✅ Migración completada exitosamente' as resultado;
