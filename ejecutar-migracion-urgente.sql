-- ==========================================
-- MIGRACIÓN URGENTE: Sistema de Imágenes de Referencia
-- Ejecutar esto en Supabase SQL Editor
-- ==========================================

-- 1. Añadir columnas a movies (si no existen)
ALTER TABLE movies ADD COLUMN IF NOT EXISTS video_url TEXT;
ALTER TABLE movies ADD COLUMN IF NOT EXISTS poster_url TEXT;
ALTER TABLE movies ADD COLUMN IF NOT EXISTS thumbnail_url TEXT;

-- 2. Añadir columnas a movie_scenes (si no existen)
ALTER TABLE movie_scenes ADD COLUMN IF NOT EXISTS reference_image_url TEXT;
ALTER TABLE movie_scenes ADD COLUMN IF NOT EXISTS reference_image_source TEXT;
ALTER TABLE movie_scenes ADD COLUMN IF NOT EXISTS end_frame_url TEXT;
ALTER TABLE movie_scenes ADD COLUMN IF NOT EXISTS location_image_id UUID;

-- 3. Crear tabla location_images
CREATE TABLE IF NOT EXISTS location_images (
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
  created_by_movie_id UUID REFERENCES movies(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(location_slug, time_of_day, weather)
);

-- 4. Crear índices para búsqueda rápida
CREATE INDEX IF NOT EXISTS idx_location_images_slug ON location_images(location_slug);
CREATE INDEX IF NOT EXISTS idx_location_images_name ON location_images USING GIN(to_tsvector('spanish', location_name));
CREATE INDEX IF NOT EXISTS idx_location_images_time ON location_images(time_of_day);
CREATE INDEX IF NOT EXISTS idx_location_images_weather ON location_images(weather);
CREATE INDEX IF NOT EXISTS idx_location_images_movie ON location_images(created_by_movie_id);

-- 5. Crear índice para movie_scenes (location_image_id)
CREATE INDEX IF NOT EXISTS idx_movie_scenes_location_image ON movie_scenes(location_image_id);
CREATE INDEX IF NOT EXISTS idx_movie_scenes_reference_source ON movie_scenes(reference_image_source);

-- 6. Función para buscar imagen de lugar
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

-- 7. Comentarios para documentación
COMMENT ON TABLE location_images IS 'Biblioteca de imágenes de referencia de lugares para mantener continuidad visual entre escenas';
COMMENT ON COLUMN location_images.location_slug IS 'Slug normalizado del nombre del lugar para búsquedas';
COMMENT ON COLUMN location_images.time_of_day IS 'Hora del día: day, night, sunset, sunrise, golden_hour';
COMMENT ON COLUMN location_images.weather IS 'Condición climática: clear, cloudy, rainy, foggy';
COMMENT ON COLUMN movie_scenes.reference_image_source IS 'Origen de la imagen: library (de biblioteca), generated (generada nueva), previous_frame (frame anterior)';

-- ✅ MIGRACIÓN COMPLETA
-- El schema cache de Supabase se refrescará automáticamente
