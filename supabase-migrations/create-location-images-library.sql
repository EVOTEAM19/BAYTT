-- ==========================================
-- MIGRACIÓN: Sistema de Imágenes de Referencia
-- ==========================================

-- 1. Añadir columnas a movies (si no existen)
ALTER TABLE movies ADD COLUMN IF NOT EXISTS video_url TEXT;
ALTER TABLE movies ADD COLUMN IF NOT EXISTS poster_url TEXT;
ALTER TABLE movies ADD COLUMN IF NOT EXISTS thumbnail_url TEXT;

-- 2. Añadir columnas a movie_scenes (si no existen)
-- Nota: location_image_id se añade después de crear la tabla location_images
ALTER TABLE movie_scenes ADD COLUMN IF NOT EXISTS reference_image_url TEXT;
ALTER TABLE movie_scenes ADD COLUMN IF NOT EXISTS reference_image_source TEXT;
ALTER TABLE movie_scenes ADD COLUMN IF NOT EXISTS end_frame_url TEXT;

-- 3. Crear tabla location_images para almacenar imágenes de lugares con variantes (hora, clima)
CREATE TABLE IF NOT EXISTS location_images (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  
  -- Identificación del lugar
  location_name TEXT NOT NULL,
  location_slug TEXT NOT NULL,
  
  -- Variantes (mismo lugar, diferentes condiciones)
  time_of_day TEXT DEFAULT 'day', -- 'day', 'night', 'sunset', 'sunrise', 'golden_hour'
  weather TEXT DEFAULT 'clear',    -- 'clear', 'cloudy', 'rainy', 'foggy'
  
  -- Imagen generada
  image_url TEXT NOT NULL,
  thumbnail_url TEXT,
  
  -- Prompt usado para generar (para regenerar si es necesario)
  generation_prompt TEXT,
  
  -- Metadatos
  width INTEGER DEFAULT 1280,
  height INTEGER DEFAULT 768,
  
  -- Estadísticas de uso
  times_used INTEGER DEFAULT 0,
  last_used_at TIMESTAMPTZ,
  
  -- Película que lo creó originalmente (opcional)
  created_by_movie_id UUID REFERENCES movies(id) ON DELETE SET NULL,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Índice único: un lugar + hora + clima = una imagen
  UNIQUE(location_slug, time_of_day, weather)
);

-- 4. Crear índices para búsqueda rápida
CREATE INDEX IF NOT EXISTS idx_location_images_slug ON location_images(location_slug);
CREATE INDEX IF NOT EXISTS idx_location_images_name ON location_images USING GIN(to_tsvector('spanish', location_name));
CREATE INDEX IF NOT EXISTS idx_location_images_time ON location_images(time_of_day);
CREATE INDEX IF NOT EXISTS idx_location_images_weather ON location_images(weather);
CREATE INDEX IF NOT EXISTS idx_location_images_movie ON location_images(created_by_movie_id);

-- 5. Añadir foreign key para location_image_id en movie_scenes (después de crear location_images)
ALTER TABLE movie_scenes ADD COLUMN IF NOT EXISTS location_image_id UUID;

-- Añadir constraint de foreign key si no existe
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'movie_scenes_location_image_id_fkey'
  ) THEN
    ALTER TABLE movie_scenes 
    ADD CONSTRAINT movie_scenes_location_image_id_fkey 
    FOREIGN KEY (location_image_id) 
    REFERENCES location_images(id) 
    ON DELETE SET NULL;
  END IF;
END $$;

-- 6. Crear índices para movie_scenes (nuevas columnas)
CREATE INDEX IF NOT EXISTS idx_movie_scenes_location_image ON movie_scenes(location_image_id);
CREATE INDEX IF NOT EXISTS idx_movie_scenes_reference_source ON movie_scenes(reference_image_source);

-- 7. Función para buscar imagen de lugar (opcional, puede usarse desde TypeScript también)
CREATE OR REPLACE FUNCTION find_location_image(
  p_location_name TEXT,
  p_time_of_day TEXT DEFAULT 'day',
  p_weather TEXT DEFAULT 'clear'
)
RETURNS TABLE(id UUID, image_url TEXT, location_name TEXT) AS $$
BEGIN
  RETURN QUERY
  SELECT li.id, li.image_url, li.location_name
  FROM location_images li
  WHERE 
    (li.location_slug = lower(regexp_replace(p_location_name, '[^a-zA-Z0-9]+', '-', 'g'))
    OR li.location_name ILIKE '%' || p_location_name || '%')
    AND li.time_of_day = p_time_of_day
    AND li.weather = p_weather
  ORDER BY li.times_used DESC, li.last_used_at DESC
  LIMIT 1;
END;
$$ LANGUAGE plpgsql;

-- Función para incrementar contador de uso (opcional, puede usarse desde TypeScript también)
CREATE OR REPLACE FUNCTION increment_location_image_usage(image_id UUID)
RETURNS INTEGER AS $$
DECLARE
  new_count INTEGER;
BEGIN
  UPDATE location_images
  SET 
    times_used = times_used + 1,
    last_used_at = NOW(),
    updated_at = NOW()
  WHERE id = image_id
  RETURNING times_used INTO new_count;
  
  RETURN new_count;
END;
$$ LANGUAGE plpgsql;

-- 8. Comentarios para documentación
COMMENT ON TABLE location_images IS 'Biblioteca de imágenes de referencia de lugares para mantener continuidad visual entre escenas';
COMMENT ON COLUMN location_images.location_slug IS 'Slug normalizado del nombre del lugar para búsquedas';
COMMENT ON COLUMN location_images.time_of_day IS 'Hora del día: day, night, sunset, sunrise, golden_hour';
COMMENT ON COLUMN location_images.weather IS 'Condición climática: clear, cloudy, rainy, foggy';
COMMENT ON COLUMN movie_scenes.reference_image_source IS 'Origen de la imagen: library (de biblioteca), generated (generada nueva), previous_frame (frame anterior)';

-- ✅ MIGRACIÓN COMPLETA
