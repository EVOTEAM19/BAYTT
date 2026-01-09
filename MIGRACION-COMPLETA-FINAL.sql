-- ==========================================
-- MIGRACIÓN COMPLETA - TODO EN UNO
-- Ejecuta esto COMPLETO en Supabase SQL Editor
-- Este script crea todo desde cero y actualiza la película
-- ==========================================

-- ==========================================
-- PASO 1: CREAR TABLA MOVIES (si no existe)
-- ==========================================
CREATE TABLE IF NOT EXISTS public.movies (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL,
  title TEXT NOT NULL,
  prompt TEXT,
  user_prompt TEXT,
  status TEXT DEFAULT 'pending',
  progress INTEGER DEFAULT 0,
  duration DECIMAL(10,2),
  genre TEXT,
  error_message TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  video_url TEXT,
  poster_url TEXT,
  thumbnail_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices para movies
CREATE INDEX IF NOT EXISTS idx_movies_user_id ON public.movies(user_id);
CREATE INDEX IF NOT EXISTS idx_movies_status ON public.movies(status);
CREATE INDEX IF NOT EXISTS idx_movies_created_at ON public.movies(created_at DESC);

-- ==========================================
-- PASO 2: AÑADIR COLUMNAS FALTANTES A MOVIES (si no existen)
-- ==========================================
DO $$ 
BEGIN
  -- video_url
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_schema = 'public' 
                 AND table_name = 'movies' 
                 AND column_name = 'video_url') THEN
    ALTER TABLE public.movies ADD COLUMN video_url TEXT;
    RAISE NOTICE '✅ Added video_url to movies';
  END IF;
  
  -- poster_url
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_schema = 'public' 
                 AND table_name = 'movies' 
                 AND column_name = 'poster_url') THEN
    ALTER TABLE public.movies ADD COLUMN poster_url TEXT;
    RAISE NOTICE '✅ Added poster_url to movies';
  END IF;
  
  -- thumbnail_url
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_schema = 'public' 
                 AND table_name = 'movies' 
                 AND column_name = 'thumbnail_url') THEN
    ALTER TABLE public.movies ADD COLUMN thumbnail_url TEXT;
    RAISE NOTICE '✅ Added thumbnail_url to movies';
  END IF;
  
  -- Asegurar que status existe
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_schema = 'public' 
                 AND table_name = 'movies' 
                 AND column_name = 'status') THEN
    ALTER TABLE public.movies ADD COLUMN status TEXT DEFAULT 'pending';
    RAISE NOTICE '✅ Added status to movies';
  END IF;
  
  -- Asegurar que progress existe
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_schema = 'public' 
                 AND table_name = 'movies' 
                 AND column_name = 'progress') THEN
    ALTER TABLE public.movies ADD COLUMN progress INTEGER DEFAULT 0;
    RAISE NOTICE '✅ Added progress to movies';
  END IF;
END $$;

-- ==========================================
-- PASO 3: CREAR TABLA MOVIE_SCENES (si no existe)
-- ==========================================
CREATE TABLE IF NOT EXISTS public.movie_scenes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  movie_id UUID NOT NULL,
  scene_number INTEGER NOT NULL,
  scene_id TEXT,
  full_scene_description TEXT,
  video_prompt TEXT,
  video_url TEXT,
  clip_url TEXT,
  status TEXT DEFAULT 'pending',
  clip_status TEXT DEFAULT 'pending',
  error_message TEXT,
  reference_image_url TEXT,
  reference_image_source TEXT,
  end_frame_url TEXT,
  location_image_id UUID,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(movie_id, scene_number)
);

-- Índices para movie_scenes
CREATE INDEX IF NOT EXISTS idx_movie_scenes_movie_id ON public.movie_scenes(movie_id);
CREATE INDEX IF NOT EXISTS idx_movie_scenes_scene_number ON public.movie_scenes(movie_id, scene_number);
CREATE INDEX IF NOT EXISTS idx_movie_scenes_status ON public.movie_scenes(status);

-- Foreign key a movies (si existe la tabla)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables 
             WHERE table_schema = 'public' 
             AND table_name = 'movies') THEN
    BEGIN
      ALTER TABLE public.movie_scenes 
        ADD CONSTRAINT fk_movie_scenes_movie_id 
        FOREIGN KEY (movie_id) 
        REFERENCES public.movies(id) 
        ON DELETE CASCADE;
      RAISE NOTICE '✅ Foreign key added to movie_scenes';
    EXCEPTION
      WHEN duplicate_object THEN
        RAISE NOTICE '⏭️  Foreign key already exists';
    END;
  END IF;
END $$;

-- ==========================================
-- PASO 4: AÑADIR COLUMNAS FALTANTES A MOVIE_SCENES (si no existen)
-- ==========================================
DO $$ 
BEGIN
  -- video_url
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_schema = 'public' 
                 AND table_name = 'movie_scenes' 
                 AND column_name = 'video_url') THEN
    ALTER TABLE public.movie_scenes ADD COLUMN video_url TEXT;
    RAISE NOTICE '✅ Added video_url to movie_scenes';
  END IF;
  
  -- status
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_schema = 'public' 
                 AND table_name = 'movie_scenes' 
                 AND column_name = 'status') THEN
    ALTER TABLE public.movie_scenes ADD COLUMN status TEXT DEFAULT 'pending';
    RAISE NOTICE '✅ Added status to movie_scenes';
  END IF;
  
  -- reference_image_url
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_schema = 'public' 
                 AND table_name = 'movie_scenes' 
                 AND column_name = 'reference_image_url') THEN
    ALTER TABLE public.movie_scenes ADD COLUMN reference_image_url TEXT;
    RAISE NOTICE '✅ Added reference_image_url to movie_scenes';
  END IF;
  
  -- reference_image_source
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_schema = 'public' 
                 AND table_name = 'movie_scenes' 
                 AND column_name = 'reference_image_source') THEN
    ALTER TABLE public.movie_scenes ADD COLUMN reference_image_source TEXT;
    RAISE NOTICE '✅ Added reference_image_source to movie_scenes';
  END IF;
  
  -- end_frame_url
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_schema = 'public' 
                 AND table_name = 'movie_scenes' 
                 AND column_name = 'end_frame_url') THEN
    ALTER TABLE public.movie_scenes ADD COLUMN end_frame_url TEXT;
    RAISE NOTICE '✅ Added end_frame_url to movie_scenes';
  END IF;
  
  -- location_image_id
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_schema = 'public' 
                 AND table_name = 'movie_scenes' 
                 AND column_name = 'location_image_id') THEN
    ALTER TABLE public.movie_scenes ADD COLUMN location_image_id UUID;
    RAISE NOTICE '✅ Added location_image_id to movie_scenes';
  END IF;
  
  -- updated_at
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_schema = 'public' 
                 AND table_name = 'movie_scenes' 
                 AND column_name = 'updated_at') THEN
    ALTER TABLE public.movie_scenes ADD COLUMN updated_at TIMESTAMPTZ DEFAULT NOW();
    RAISE NOTICE '✅ Added updated_at to movie_scenes';
  END IF;
  
  -- clip_url (opcional, para compatibilidad)
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_schema = 'public' 
                 AND table_name = 'movie_scenes' 
                 AND column_name = 'clip_url') THEN
    ALTER TABLE public.movie_scenes ADD COLUMN clip_url TEXT;
    RAISE NOTICE '✅ Added clip_url to movie_scenes';
  END IF;
  
  -- clip_status (opcional, para compatibilidad)
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_schema = 'public' 
                 AND table_name = 'movie_scenes' 
                 AND column_name = 'clip_status') THEN
    ALTER TABLE public.movie_scenes ADD COLUMN clip_status TEXT DEFAULT 'pending';
    RAISE NOTICE '✅ Added clip_status to movie_scenes';
  END IF;
END $$;

-- ==========================================
-- PASO 5: CREAR TABLA LOCATION_IMAGES (si no existe)
-- ==========================================
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
CREATE INDEX IF NOT EXISTS idx_location_images_created_at ON public.location_images(created_at DESC);

-- ==========================================
-- PASO 6: REFRESCAR SCHEMA CACHE DE SUPABASE
-- ==========================================
-- Esto fuerza a Supabase a refrescar su cache del schema
NOTIFY pgrst, 'reload schema';

-- ==========================================
-- PASO 7: ACTUALIZAR PELÍCULA 44cdabff-9877-4c4d-9a81-3aa0c6fbb3e1
-- ==========================================
UPDATE public.movies SET 
  video_url = 'https://storage.baytt.com/movies/44cdabff-9877-4c4d-9a81-3aa0c6fbb3e1/final.mp4',
  poster_url = 'https://v3b.fal.media/files/b/0a89b386/hUzeUSOrFhimA4ydqNalM.jpg',
  thumbnail_url = 'https://v3b.fal.media/files/b/0a89b386/hUzeUSOrFhimA4ydqNalM.jpg',
  status = 'completed',
  progress = 100,
  updated_at = NOW()
WHERE id = '44cdabff-9877-4c4d-9a81-3aa0c6fbb3e1';

-- ==========================================
-- PASO 8: ACTUALIZAR ESCENAS DE LA PELÍCULA
-- ==========================================

-- Escena 1
UPDATE public.movie_scenes SET 
  video_url = 'https://dnznrvs05pmza.cloudfront.net/31aae1b0-2573-45e6-a11e-34270bdb63d4.mp4?_jwt=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJrZXlIYXNoIjoiOGZjMzA0ZWNiNzQ1NTBhOSIsImJ1Y2tldCI6InJ1bndheS10YXNrLWFydGlmYWN0cyIsInN0YWdlIjoicHJvZCIsImV4cCI6MTc2ODA4OTYwMH0.aS1vep0Age9EKha2NK07ixgulkyBKNWbPcvsBeIrxTU',
  status = 'completed',
  updated_at = NOW()
WHERE movie_id = '44cdabff-9877-4c4d-9a81-3aa0c6fbb3e1' 
  AND scene_number = 1;

-- Escena 2
UPDATE public.movie_scenes SET 
  video_url = 'https://dnznrvs05pmza.cloudfront.net/c8a72225-e9b7-4713-b081-badb2b6f93f1.mp4?_jwt=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJrZXlIYXNoIjoiZWI2ZmYzYTMxNjE5ZjkzMiIsImJ1Y2tldCI6InJ1bndheS10YXNrLWFydGlmYWN0cyIsInN0YWdlIjoicHJvZCIsImV4cCI6MTc2ODA4OTYwMH0.DZ49xZXdHz0_nxmk2BqGBQJaaQff3WWfjmzm224i5Cg',
  status = 'completed',
  updated_at = NOW()
WHERE movie_id = '44cdabff-9877-4c4d-9a81-3aa0c6fbb3e1' 
  AND scene_number = 2;

-- ==========================================
-- PASO 9: VERIFICACIÓN FINAL
-- ==========================================

-- Verificar película (query separada para evitar problemas de tipos)
SELECT 
  '✅ MOVIE' as tipo,
  id,
  title,
  status,
  progress,
  video_url IS NOT NULL as tiene_video_url,
  poster_url IS NOT NULL as tiene_poster_url,
  thumbnail_url IS NOT NULL as tiene_thumbnail_url,
  LEFT(COALESCE(video_url, 'NULL'), 80) as video_url_preview,
  LEFT(COALESCE(poster_url, 'NULL'), 80) as poster_url_preview
FROM public.movies
WHERE id = '44cdabff-9877-4c4d-9a81-3aa0c6fbb3e1';

-- Verificar escenas (query separada)
SELECT 
  '✅ SCENE ' || scene_number::text as tipo,
  id,
  scene_number,
  status,
  video_url IS NOT NULL as tiene_video_url,
  reference_image_url IS NOT NULL as tiene_reference_image,
  end_frame_url IS NOT NULL as tiene_end_frame,
  LEFT(COALESCE(video_url, 'NULL'), 80) as video_url_preview
FROM public.movie_scenes
WHERE movie_id = '44cdabff-9877-4c4d-9a81-3aa0c6fbb3e1'
ORDER BY scene_number;

-- Verificar columnas creadas
SELECT 
  'movies' as tabla,
  column_name,
  data_type
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name = 'movies'
  AND column_name IN ('video_url', 'poster_url', 'thumbnail_url', 'status', 'progress')
ORDER BY column_name;

SELECT 
  'movie_scenes' as tabla,
  column_name,
  data_type
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name = 'movie_scenes'
  AND column_name IN ('video_url', 'status', 'reference_image_url', 'reference_image_source', 'end_frame_url', 'location_image_id')
ORDER BY column_name;

SELECT 
  'location_images' as tabla,
  column_name,
  data_type
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name = 'location_images'
ORDER BY column_name;

-- ==========================================
-- FIN DEL SCRIPT
-- ==========================================
-- Después de ejecutar, espera 10-30 segundos para que Supabase refresque el schema cache
-- Luego recarga la página de la película en el frontend
