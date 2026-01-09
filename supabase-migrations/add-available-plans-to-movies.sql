-- ============================================
-- MIGRACIÓN: Añadir columna available_plans a movies
-- ============================================
-- Ejecuta este script en el SQL Editor de Supabase

-- Añadir columna available_plans a la tabla movies
-- Si es null, la película está disponible para todos los planes
-- Si es un array de UUIDs, solo está disponible para esos planes específicos
ALTER TABLE movies
ADD COLUMN IF NOT EXISTS available_plans TEXT[];

-- Añadir comentario para documentar
COMMENT ON COLUMN movies.available_plans IS 'Array de plan IDs. null = disponible para todos los planes, array = solo esos planes';

-- Crear índice para búsquedas más rápidas
CREATE INDEX IF NOT EXISTS idx_movies_available_plans ON movies USING GIN (available_plans);

-- Si prefieres usar UUID[] en lugar de TEXT[], puedes usar esto:
-- ALTER TABLE movies
-- ADD COLUMN IF NOT EXISTS available_plans UUID[];

