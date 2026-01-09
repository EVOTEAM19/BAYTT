-- ==========================================
-- SCRIPT DEFINITIVO PARA CREAR COLUMNAS FALTANTES
-- Ejecuta esto en Supabase SQL Editor
-- ==========================================

-- 1. Añadir columnas a movies (si no existen)
DO $$ 
BEGIN
  -- video_url
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_schema = 'public' 
                 AND table_name = 'movies' 
                 AND column_name = 'video_url') THEN
    ALTER TABLE public.movies ADD COLUMN video_url TEXT;
    RAISE NOTICE '✅ Added video_url to movies';
  ELSE
    RAISE NOTICE '⏭️  video_url already exists in movies';
  END IF;
  
  -- poster_url
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_schema = 'public' 
                 AND table_name = 'movies' 
                 AND column_name = 'poster_url') THEN
    ALTER TABLE public.movies ADD COLUMN poster_url TEXT;
    RAISE NOTICE '✅ Added poster_url to movies';
  ELSE
    RAISE NOTICE '⏭️  poster_url already exists in movies';
  END IF;
  
  -- thumbnail_url
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_schema = 'public' 
                 AND table_name = 'movies' 
                 AND column_name = 'thumbnail_url') THEN
    ALTER TABLE public.movies ADD COLUMN thumbnail_url TEXT;
    RAISE NOTICE '✅ Added thumbnail_url to movies';
  ELSE
    RAISE NOTICE '⏭️  thumbnail_url already exists in movies';
  END IF;
END $$;

-- 2. Añadir columnas a movie_scenes (si no existen)
DO $$ 
BEGIN
  -- reference_image_url
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_schema = 'public' 
                 AND table_name = 'movie_scenes' 
                 AND column_name = 'reference_image_url') THEN
    ALTER TABLE public.movie_scenes ADD COLUMN reference_image_url TEXT;
    RAISE NOTICE '✅ Added reference_image_url to movie_scenes';
  ELSE
    RAISE NOTICE '⏭️  reference_image_url already exists in movie_scenes';
  END IF;
  
  -- reference_image_source
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_schema = 'public' 
                 AND table_name = 'movie_scenes' 
                 AND column_name = 'reference_image_source') THEN
    ALTER TABLE public.movie_scenes ADD COLUMN reference_image_source TEXT;
    RAISE NOTICE '✅ Added reference_image_source to movie_scenes';
  ELSE
    RAISE NOTICE '⏭️  reference_image_source already exists in movie_scenes';
  END IF;
  
  -- end_frame_url
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_schema = 'public' 
                 AND table_name = 'movie_scenes' 
                 AND column_name = 'end_frame_url') THEN
    ALTER TABLE public.movie_scenes ADD COLUMN end_frame_url TEXT;
    RAISE NOTICE '✅ Added end_frame_url to movie_scenes';
  ELSE
    RAISE NOTICE '⏭️  end_frame_url already exists in movie_scenes';
  END IF;
  
  -- location_image_id
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_schema = 'public' 
                 AND table_name = 'movie_scenes' 
                 AND column_name = 'location_image_id') THEN
    ALTER TABLE public.movie_scenes ADD COLUMN location_image_id UUID;
    RAISE NOTICE '✅ Added location_image_id to movie_scenes';
  ELSE
    RAISE NOTICE '⏭️  location_image_id already exists in movie_scenes';
  END IF;
  
  -- Asegurar que video_url existe (puede que ya exista)
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_schema = 'public' 
                 AND table_name = 'movie_scenes' 
                 AND column_name = 'video_url') THEN
    ALTER TABLE public.movie_scenes ADD COLUMN video_url TEXT;
    RAISE NOTICE '✅ Added video_url to movie_scenes';
  ELSE
    RAISE NOTICE '⏭️  video_url already exists in movie_scenes';
  END IF;
END $$;

-- 3. Crear tabla location_images (si no existe)
CREATE TABLE IF NOT EXISTS public.location_images (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  location_name TEXT NOT NULL,
  location_slug TEXT NOT NULL,
  time_of_day TEXT DEFAULT 'day',
  weather TEXT DEFAULT 'clear',
  image_url TEXT NOT NULL,
  generation_prompt TEXT,
  width INTEGER,
  height INTEGER,
  times_used INTEGER DEFAULT 0,
  last_used_at TIMESTAMPTZ,
  created_by_movie_id UUID,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(location_slug, time_of_day, weather)
);

-- Índices para location_images
CREATE INDEX IF NOT EXISTS idx_location_images_slug ON public.location_images(location_slug);
CREATE INDEX IF NOT EXISTS idx_location_images_name ON public.location_images USING GIN(to_tsvector('spanish', location_name));

-- 4. REFRESCAR SCHEMA CACHE DE SUPABASE
-- Esto fuerza a Supabase a refrescar su cache del schema
-- Nota: Esto puede tardar unos segundos
NOTIFY pgrst, 'reload schema';

-- 5. Verificar que las columnas se crearon correctamente
SELECT 
  'movies' as tabla,
  column_name,
  data_type
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name = 'movies'
  AND column_name IN ('video_url', 'poster_url', 'thumbnail_url')
ORDER BY column_name;

SELECT 
  'movie_scenes' as tabla,
  column_name,
  data_type
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name = 'movie_scenes'
  AND column_name IN ('video_url', 'reference_image_url', 'reference_image_source', 'end_frame_url', 'location_image_id')
ORDER BY column_name;

-- 6. Verificar que location_images existe
SELECT 
  'location_images' as tabla,
  column_name,
  data_type
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name = 'location_images'
ORDER BY column_name;
