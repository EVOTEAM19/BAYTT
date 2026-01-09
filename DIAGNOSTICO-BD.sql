-- ==========================================
-- DIAGNÓSTICO: Verificar estado de la base de datos
-- Ejecutar esto PRIMERO para ver qué tablas existen
-- ==========================================

-- Verificar esquema actual
SELECT current_schema();

-- Verificar todas las tablas en el esquema public
SELECT 
  table_name,
  table_type
FROM information_schema.tables
WHERE table_schema = 'public'
ORDER BY table_name;

-- Verificar si existe la tabla movies
SELECT 
  CASE 
    WHEN EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'movies')
    THEN '✅ Tabla movies EXISTE'
    ELSE '❌ Tabla movies NO EXISTE'
  END as estado_movies;

-- Verificar si existe la tabla movie_scenes
SELECT 
  CASE 
    WHEN EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'movie_scenes')
    THEN '✅ Tabla movie_scenes EXISTE'
    ELSE '❌ Tabla movie_scenes NO EXISTE'
  END as estado_movie_scenes;

-- Verificar columnas de movies (si existe)
SELECT 
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns 
WHERE table_schema = 'public' AND table_name = 'movies'
ORDER BY ordinal_position;

-- Verificar columnas de movie_scenes (si existe)
SELECT 
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns 
WHERE table_schema = 'public' AND table_name = 'movie_scenes'
ORDER BY ordinal_position;
