-- ============================================
-- FIX TABLA MOVIES - AÑADIR COLUMNAS FALTANTES
-- ============================================

-- Añadir columna slug si no existe
ALTER TABLE movies
ADD COLUMN IF NOT EXISTS slug TEXT;

-- Crear índice único para slug (solo si no existe)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes 
    WHERE indexname = 'idx_movies_slug'
  ) THEN
    CREATE UNIQUE INDEX idx_movies_slug ON movies(slug);
  END IF;
END $$;

-- Actualizar películas existentes sin slug
UPDATE movies
SET slug = LOWER(REGEXP_REPLACE(title, '[^a-zA-Z0-9]+', '-', 'g')) || '-' || SUBSTRING(id::text, 1, 8)
WHERE slug IS NULL OR slug = '';

-- Asegurar que ending_type tenga un valor por defecto
ALTER TABLE movies
ALTER COLUMN ending_type SET DEFAULT 'ai';

-- Asegurar que rental_price tenga un valor por defecto
ALTER TABLE movies
ALTER COLUMN rental_price SET DEFAULT 0;

-- Asegurar que views_count tenga un valor por defecto
ALTER TABLE movies
ALTER COLUMN views_count SET DEFAULT 0;

-- Asegurar que rentals_count tenga un valor por defecto
ALTER TABLE movies
ALTER COLUMN rentals_count SET DEFAULT 0;

-- Asegurar que average_rating tenga un valor por defecto
ALTER TABLE movies
ALTER COLUMN average_rating SET DEFAULT 0;

-- Asegurar que progress tenga un valor por defecto
ALTER TABLE movies
ALTER COLUMN progress SET DEFAULT 0;

-- Asegurar que is_published tenga un valor por defecto
ALTER TABLE movies
ALTER COLUMN is_published SET DEFAULT false;

-- Comentarios
COMMENT ON COLUMN movies.slug IS 'Slug único para la URL de la película';

