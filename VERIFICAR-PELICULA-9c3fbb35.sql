-- ==========================================
-- VERIFICAR ESTADO DE LA PELÍCULA
-- Ejecuta esto para ver el estado actual
-- ==========================================

-- Verificar datos de la película
SELECT 
  id,
  title,
  status,
  progress,
  video_url,
  poster_url,
  thumbnail_url,
  video_url_720p,
  video_url_1080p,
  video_url_4k,
  created_at,
  updated_at
FROM movies
WHERE id = '9c3fbb35-f8bf-41f3-b37b-98d894049b53';

-- Verificar escenas de la película
SELECT 
  id,
  movie_id,
  scene_number,
  status,
  video_url,
  reference_image_url,
  reference_image_source,
  end_frame_url,
  created_at,
  updated_at
FROM movie_scenes
WHERE movie_id = '9c3fbb35-f8bf-41f3-b37b-98d894049b53'
ORDER BY scene_number;

-- Contar escenas por estado
SELECT 
  status,
  COUNT(*) as count
FROM movie_scenes
WHERE movie_id = '9c3fbb35-f8bf-41f3-b37b-98d894049b53'
GROUP BY status;
