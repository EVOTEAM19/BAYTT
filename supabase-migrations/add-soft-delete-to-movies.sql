-- ============================================
-- Añadir campos de soft delete a movies
-- ============================================

ALTER TABLE movies
ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN DEFAULT false;

ALTER TABLE movies
ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;

-- Crear índice para búsquedas rápidas de películas no eliminadas
CREATE INDEX IF NOT EXISTS idx_movies_not_deleted ON movies(is_deleted) 
WHERE is_deleted = false OR is_deleted IS NULL;

-- Comentarios
COMMENT ON COLUMN movies.is_deleted IS 'Soft delete: true si la película está eliminada';
COMMENT ON COLUMN movies.deleted_at IS 'Fecha y hora de eliminación (soft delete)';

