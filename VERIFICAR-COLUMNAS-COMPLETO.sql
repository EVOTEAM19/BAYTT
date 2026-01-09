-- ==========================================
-- VERIFICACIÓN COMPLETA DE COLUMNAS
-- Ejecuta esto para verificar que TODO está correcto
-- ==========================================

-- 1. Verificar columnas de movies
SELECT 
  'movies' as tabla,
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name = 'movies'
  AND column_name IN ('video_url', 'poster_url', 'thumbnail_url', 'status', 'progress')
ORDER BY column_name;

-- 2. Verificar columnas de movie_scenes
SELECT 
  'movie_scenes' as tabla,
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name = 'movie_scenes'
  AND column_name IN ('video_url', 'status', 'reference_image_url', 'reference_image_source', 'end_frame_url', 'location_image_id', 'scene_number')
ORDER BY column_name;

-- 3. Verificar que location_images existe y tiene todas las columnas
SELECT 
  'location_images' as tabla,
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name = 'location_images'
ORDER BY column_name;

-- 4. Verificar la película actual (44cdabff-9877-4c4d-9a81-3aa0c6fbb3e1)
SELECT 
  id,
  title,
  status,
  progress,
  video_url IS NOT NULL as tiene_video_url,
  poster_url IS NOT NULL as tiene_poster_url,
  thumbnail_url IS NOT NULL as tiene_thumbnail_url,
  LEFT(COALESCE(video_url, 'NULL'), 80) as video_url_preview,
  LEFT(COALESCE(poster_url, 'NULL'), 80) as poster_url_preview
FROM movies
WHERE id = '44cdabff-9877-4c4d-9a81-3aa0c6fbb3e1';

-- 5. Verificar las escenas de la película actual
SELECT 
  scene_number,
  status,
  video_url IS NOT NULL as tiene_video_url,
  reference_image_url IS NOT NULL as tiene_reference_image,
  end_frame_url IS NOT NULL as tiene_end_frame,
  LEFT(COALESCE(video_url, 'NULL'), 80) as video_url_preview,
  LEFT(COALESCE(reference_image_url, 'NULL'), 80) as reference_image_preview
FROM movie_scenes
WHERE movie_id = '44cdabff-9877-4c4d-9a81-3aa0c6fbb3e1'
ORDER BY scene_number;
