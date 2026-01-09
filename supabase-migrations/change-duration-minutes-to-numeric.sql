-- ============================================
-- CAMBIAR duration_minutes A NUMERIC PARA SOPORTAR DECIMALES
-- ============================================
-- Esto permite duraciones menores a 1 minuto (ej: 20 segundos = 0.33 minutos)

-- Cambiar el tipo de columna de INTEGER a NUMERIC(10,2)
ALTER TABLE movies
ALTER COLUMN duration_minutes TYPE NUMERIC(10,2) USING duration_minutes::NUMERIC(10,2);

-- Comentario
COMMENT ON COLUMN movies.duration_minutes IS 'Duración de la película en minutos (permite decimales, ej: 0.33 = 20 segundos)';
