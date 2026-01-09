-- ============================================
-- AÑADIR COLUMNA SLUG A LA TABLA MOVIES
-- ============================================

-- Añadir columna slug si no existe
ALTER TABLE movies
ADD COLUMN IF NOT EXISTS slug TEXT;

-- Crear índice único para slug
CREATE UNIQUE INDEX IF NOT EXISTS idx_movies_slug ON movies(slug);

-- Comentario
COMMENT ON COLUMN movies.slug IS 'Slug único para la URL de la película';

-- Actualizar películas existentes sin slug (generar slug desde title)
UPDATE movies
SET slug = LOWER(REGEXP_REPLACE(title, '[^a-zA-Z0-9]+', '-', 'g')) || '-' || SUBSTRING(id::text, 1, 8)
WHERE slug IS NULL;

