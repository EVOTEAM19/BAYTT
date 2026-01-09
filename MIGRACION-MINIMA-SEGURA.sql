-- ==========================================
-- MIGRACIÓN MÍNIMA Y SEGURA
-- Solo crea lo esencial sin dependencias de otras tablas
-- Ejecutar esto primero si movies no existe aún
-- ==========================================

-- PASO 1: Crear tabla movie_scenes básica (sin foreign keys problemáticos)
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
  
  -- Nuevas columnas para sistema de imágenes de referencia
  reference_image_url TEXT,
  reference_image_source TEXT,
  end_frame_url TEXT,
  location_image_id UUID,
  
  -- Columnas adicionales opcionales
  location_id UUID,
  location_snapshot JSONB,
  is_continuation BOOLEAN DEFAULT false,
  continues_from_scene INTEGER,
  reference_frames JSONB DEFAULT '{}',
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Constraint: una escena única por película
  UNIQUE(movie_id, scene_number)
);

-- Índices básicos
CREATE INDEX IF NOT EXISTS idx_movie_scenes_movie ON public.movie_scenes(movie_id);
CREATE INDEX IF NOT EXISTS idx_movie_scenes_status ON public.movie_scenes(status);
CREATE INDEX IF NOT EXISTS idx_movie_scenes_location_image ON public.movie_scenes(location_image_id);
CREATE INDEX IF NOT EXISTS idx_movie_scenes_reference_source ON public.movie_scenes(reference_image_source);

-- PASO 2: Crear tabla location_images
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

-- Índices para location_images
CREATE INDEX IF NOT EXISTS idx_location_images_slug ON public.location_images(location_slug);
CREATE INDEX IF NOT EXISTS idx_location_images_name ON public.location_images USING GIN(to_tsvector('spanish', location_name));
CREATE INDEX IF NOT EXISTS idx_location_images_time ON public.location_images(time_of_day);
CREATE INDEX IF NOT EXISTS idx_location_images_weather ON public.location_images(weather);
CREATE INDEX IF NOT EXISTS idx_location_images_movie ON public.location_images(created_by_movie_id);

-- PASO 3: Añadir columnas a movies (solo si existe)
DO $$
BEGIN
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'movies') THEN
    ALTER TABLE public.movies ADD COLUMN IF NOT EXISTS video_url TEXT;
    ALTER TABLE public.movies ADD COLUMN IF NOT EXISTS poster_url TEXT;
    ALTER TABLE public.movies ADD COLUMN IF NOT EXISTS thumbnail_url TEXT;
    RAISE NOTICE '✅ Columnas añadidas a movies';
  ELSE
    RAISE NOTICE '⚠️ Tabla movies no existe. Las columnas se añadirán cuando se cree la tabla.';
  END IF;
END $$;

-- PASO 4: Añadir foreign keys (solo si las tablas referenciadas existen)
DO $$
BEGIN
  -- Foreign key movie_scenes.movie_id -> movies.id
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'movies') THEN
    ALTER TABLE public.movie_scenes DROP CONSTRAINT IF EXISTS movie_scenes_movie_id_fkey;
    ALTER TABLE public.movie_scenes 
    ADD CONSTRAINT movie_scenes_movie_id_fkey 
    FOREIGN KEY (movie_id) 
    REFERENCES public.movies(id) 
    ON DELETE CASCADE;
    RAISE NOTICE '✅ Foreign key movie_scenes.movie_id añadido';
  END IF;

  -- Foreign key location_images.created_by_movie_id -> movies.id
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'movies') THEN
    ALTER TABLE public.location_images DROP CONSTRAINT IF EXISTS location_images_created_by_movie_id_fkey;
    ALTER TABLE public.location_images 
    ADD CONSTRAINT location_images_created_by_movie_id_fkey 
    FOREIGN KEY (created_by_movie_id) 
    REFERENCES public.movies(id) 
    ON DELETE SET NULL;
    RAISE NOTICE '✅ Foreign key location_images.created_by_movie_id añadido';
  END IF;

  -- Foreign key movie_scenes.location_image_id -> location_images.id
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'location_images') THEN
    ALTER TABLE public.movie_scenes DROP CONSTRAINT IF EXISTS movie_scenes_location_image_id_fkey;
    ALTER TABLE public.movie_scenes 
    ADD CONSTRAINT movie_scenes_location_image_id_fkey 
    FOREIGN KEY (location_image_id) 
    REFERENCES public.location_images(id) 
    ON DELETE SET NULL;
    RAISE NOTICE '✅ Foreign key movie_scenes.location_image_id añadido';
  END IF;
END $$;

-- PASO 5: Trigger para updated_at
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

-- PASO 6: Habilitar RLS (sin crear políticas todavía si movies no existe)
ALTER TABLE public.movie_scenes ENABLE ROW LEVEL SECURITY;

-- ✅ MIGRACIÓN MÍNIMA COMPLETA
-- NOTA: Las políticas RLS se crearán después cuando movies exista
SELECT '✅ Migración mínima completada. Ejecuta MIGRACION-RLS.sql después de crear movies.' as resultado;
