-- ==========================================
-- MIGRACIÓN URGENTE: Sistema de Imágenes de Referencia
-- Ejecutar esto en Supabase SQL Editor
-- ==========================================

-- Asegurar que estamos en el esquema público
SET search_path TO public;

-- 1. Verificar y añadir columnas a movies (si la tabla existe)
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

-- 2. Verificar y añadir columnas a movie_scenes (si la tabla existe)
DO $$
BEGIN
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'movie_scenes') THEN
    ALTER TABLE public.movie_scenes ADD COLUMN IF NOT EXISTS reference_image_url TEXT;
    ALTER TABLE public.movie_scenes ADD COLUMN IF NOT EXISTS reference_image_source TEXT;
    ALTER TABLE public.movie_scenes ADD COLUMN IF NOT EXISTS end_frame_url TEXT;
    ALTER TABLE public.movie_scenes ADD COLUMN IF NOT EXISTS location_image_id UUID;
    RAISE NOTICE '✅ Columnas añadidas a movie_scenes';
  ELSE
    RAISE WARNING '⚠️ Tabla movie_scenes no existe. Asegúrate de crearla primero.';
  END IF;
END $$;

-- 3. Crear tabla location_images (solo si movies existe)
DO $$
BEGIN
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'movies') THEN
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
      created_by_movie_id UUID REFERENCES public.movies(id) ON DELETE SET NULL,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW(),
      UNIQUE(location_slug, time_of_day, weather)
    );
    RAISE NOTICE '✅ Tabla location_images creada o ya existía';
  ELSE
    RAISE WARNING '⚠️ No se puede crear location_images porque movies no existe.';
  END IF;
END $$;

-- 4. Crear índices para búsqueda rápida (solo si la tabla existe)
DO $$
BEGIN
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'location_images') THEN
    CREATE INDEX IF NOT EXISTS idx_location_images_slug ON public.location_images(location_slug);
    CREATE INDEX IF NOT EXISTS idx_location_images_name ON public.location_images USING GIN(to_tsvector('spanish', location_name));
    CREATE INDEX IF NOT EXISTS idx_location_images_time ON public.location_images(time_of_day);
    CREATE INDEX IF NOT EXISTS idx_location_images_weather ON public.location_images(weather);
    CREATE INDEX IF NOT EXISTS idx_location_images_movie ON public.location_images(created_by_movie_id);
    RAISE NOTICE '✅ Índices creados para location_images';
  END IF;
END $$;

-- 5. Crear índices para movie_scenes (nuevas columnas, solo si la tabla existe)
DO $$
BEGIN
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'movie_scenes') THEN
    CREATE INDEX IF NOT EXISTS idx_movie_scenes_location_image ON public.movie_scenes(location_image_id);
    CREATE INDEX IF NOT EXISTS idx_movie_scenes_reference_source ON public.movie_scenes(reference_image_source);
    RAISE NOTICE '✅ Índices creados para movie_scenes';
  END IF;
END $$;

-- 6. Añadir foreign key constraint para location_image_id (si no existe y ambas tablas existen)
DO $$ 
BEGIN
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'movie_scenes')
     AND EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'location_images') THEN
    IF NOT EXISTS (
      SELECT 1 FROM pg_constraint 
      WHERE conname = 'movie_scenes_location_image_id_fkey'
    ) THEN
      ALTER TABLE public.movie_scenes 
      ADD CONSTRAINT movie_scenes_location_image_id_fkey 
      FOREIGN KEY (location_image_id) 
      REFERENCES public.location_images(id) 
      ON DELETE SET NULL;
      RAISE NOTICE '✅ Foreign key constraint añadido';
    ELSE
      RAISE NOTICE '✅ Foreign key constraint ya existía';
    END IF;
  END IF;
END $$;

-- 7. Función para buscar imagen de lugar (opcional, puede usarse desde TypeScript también)
CREATE OR REPLACE FUNCTION public.find_location_image(
  p_location_name TEXT,
  p_time_of_day TEXT DEFAULT 'day',
  p_weather TEXT DEFAULT 'clear'
)
RETURNS TABLE(id UUID, image_url TEXT, location_name TEXT) AS $$
BEGIN
  RETURN QUERY
  SELECT li.id, li.image_url, li.location_name
  FROM public.location_images li
  WHERE 
    (li.location_slug = lower(regexp_replace(p_location_name, '[^a-zA-Z0-9]+', '-', 'g'))
    OR li.location_name ILIKE '%' || p_location_name || '%')
    AND li.time_of_day = p_time_of_day
    AND li.weather = p_weather
  ORDER BY li.times_used DESC, li.last_used_at DESC
  LIMIT 1;
END;
$$ LANGUAGE plpgsql;

-- 8. Comentarios para documentación (solo si las tablas existen)
DO $$
BEGIN
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'location_images') THEN
    COMMENT ON TABLE public.location_images IS 'Biblioteca de imágenes de referencia de lugares para mantener continuidad visual entre escenas';
    COMMENT ON COLUMN public.location_images.location_slug IS 'Slug normalizado del nombre del lugar para búsquedas';
    COMMENT ON COLUMN public.location_images.time_of_day IS 'Hora del día: day, night, sunset, sunrise, golden_hour';
    COMMENT ON COLUMN public.location_images.weather IS 'Condición climática: clear, cloudy, rainy, foggy';
  END IF;
  
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'movie_scenes') THEN
    COMMENT ON COLUMN public.movie_scenes.reference_image_source IS 'Origen de la imagen: library (de biblioteca), generated (generada nueva), previous_frame (frame anterior)';
  END IF;
  
  RAISE NOTICE '✅ Comentarios añadidos';
END $$;

-- ✅ MIGRACIÓN COMPLETA
-- El schema cache de Supabase se refrescará automáticamente en unos segundos
