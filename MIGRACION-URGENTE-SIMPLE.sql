-- ==========================================
-- MIGRACIÓN URGENTE SIMPLE: Sistema de Imágenes de Referencia
-- VERSIÓN SIMPLIFICADA - Ejecutar esto en Supabase SQL Editor
-- ==========================================

-- Esta versión asume que las tablas movies y movie_scenes ya existen
-- Si no existen, primero ejecuta DIAGNOSTICO-BD.sql para verificar

-- 1. Añadir columnas a movies
ALTER TABLE public.movies ADD COLUMN IF NOT EXISTS video_url TEXT;
ALTER TABLE public.movies ADD COLUMN IF NOT EXISTS poster_url TEXT;
ALTER TABLE public.movies ADD COLUMN IF NOT EXISTS thumbnail_url TEXT;

-- 2. Añadir columnas a movie_scenes
ALTER TABLE public.movie_scenes ADD COLUMN IF NOT EXISTS reference_image_url TEXT;
ALTER TABLE public.movie_scenes ADD COLUMN IF NOT EXISTS reference_image_source TEXT;
ALTER TABLE public.movie_scenes ADD COLUMN IF NOT EXISTS end_frame_url TEXT;
ALTER TABLE public.movie_scenes ADD COLUMN IF NOT EXISTS location_image_id UUID;

-- 3. Crear tabla location_images
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

-- 4. Añadir foreign key constraint (solo si movies existe)
DO $$
BEGIN
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'movies') THEN
    -- Primero eliminar constraint si existe y luego recrearlo
    ALTER TABLE public.location_images DROP CONSTRAINT IF EXISTS location_images_created_by_movie_id_fkey;
    ALTER TABLE public.location_images 
    ADD CONSTRAINT location_images_created_by_movie_id_fkey 
    FOREIGN KEY (created_by_movie_id) 
    REFERENCES public.movies(id) 
    ON DELETE SET NULL;
  END IF;
END $$;

-- 5. Crear índices
CREATE INDEX IF NOT EXISTS idx_location_images_slug ON public.location_images(location_slug);
CREATE INDEX IF NOT EXISTS idx_location_images_name ON public.location_images USING GIN(to_tsvector('spanish', location_name));
CREATE INDEX IF NOT EXISTS idx_location_images_time ON public.location_images(time_of_day);
CREATE INDEX IF NOT EXISTS idx_location_images_weather ON public.location_images(weather);
CREATE INDEX IF NOT EXISTS idx_location_images_movie ON public.location_images(created_by_movie_id);

CREATE INDEX IF NOT EXISTS idx_movie_scenes_location_image ON public.movie_scenes(location_image_id);
CREATE INDEX IF NOT EXISTS idx_movie_scenes_reference_source ON public.movie_scenes(reference_image_source);

-- 6. Añadir foreign key para movie_scenes.location_image_id
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

-- ✅ MIGRACIÓN COMPLETA
