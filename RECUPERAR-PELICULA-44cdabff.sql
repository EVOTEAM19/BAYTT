-- ==========================================
-- RECUPERAR PELÍCULA 44cdabff-9877-4c4d-9a81-3aa0c6fbb3e1
-- Ejecuta esto después de verificar las columnas
-- ==========================================

-- PASO 1: Actualizar la película con los datos generados
UPDATE movies SET 
  video_url = 'https://storage.baytt.com/movies/44cdabff-9877-4c4d-9a81-3aa0c6fbb3e1/final.mp4',
  poster_url = 'https://v3b.fal.media/files/b/0a89b386/hUzeUSOrFhimA4ydqNalM.jpg',
  thumbnail_url = 'https://v3b.fal.media/files/b/0a89b386/hUzeUSOrFhimA4ydqNalM.jpg',
  status = 'completed',
  progress = 100,
  updated_at = NOW()
WHERE id = '44cdabff-9877-4c4d-9a81-3aa0c6fbb3e1'
RETURNING id, title, status, progress, video_url IS NOT NULL as tiene_video, poster_url IS NOT NULL as tiene_poster;

-- PASO 2: Actualizar escena 1
UPDATE movie_scenes SET 
  video_url = 'https://dnznrvs05pmza.cloudfront.net/31aae1b0-2573-45e6-a11e-34270bdb63d4.mp4?_jwt=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJrZXlIYXNoIjoiOGZjMzA0ZWNiNzQ1NTBhOSIsImJ1Y2tldCI6InJ1bndheS10YXNrLWFydGlmYWN0cyIsInN0YWdlIjoicHJvZCIsImV4cCI6MTc2ODA4OTYwMH0.aS1vep0Age9EKha2NK07ixgulkyBKNWbPcvsBeIrxTU',
  status = 'completed',
  updated_at = NOW()
WHERE movie_id = '44cdabff-9877-4c4d-9a81-3aa0c6fbb3e1' 
  AND scene_number = 1
RETURNING id, scene_number, status, video_url IS NOT NULL as tiene_video;

-- PASO 3: Actualizar escena 2
UPDATE movie_scenes SET 
  video_url = 'https://dnznrvs05pmza.cloudfront.net/c8a72225-e9b7-4713-b081-badb2b6f93f1.mp4?_jwt=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJrZXlIYXNoIjoiZWI2ZmYzYTMxNjE5ZjkzMiIsImJ1Y2tldCI6InJ1bndheS10YXNrLWFydGlmYWN0cyIsInN0YWdlIjoicHJvZCIsImV4cCI6MTc2ODA4OTYwMH0.DZ49xZXdHz0_nxmk2BqGBQJaaQff3WWfjmzm224i5Cg',
  status = 'completed',
  updated_at = NOW()
WHERE movie_id = '44cdabff-9877-4c4d-9a81-3aa0c6fbb3e1' 
  AND scene_number = 2
RETURNING id, scene_number, status, video_url IS NOT NULL as tiene_video;

-- PASO 4: Verificar resultado final
SELECT 
  'Movie' as tipo,
  id,
  title,
  status,
  progress,
  video_url IS NOT NULL as tiene_video_url,
  poster_url IS NOT NULL as tiene_poster_url,
  thumbnail_url IS NOT NULL as tiene_thumbnail_url
FROM movies
WHERE id = '44cdabff-9877-4c4d-9a81-3aa0c6fbb3e1'

UNION ALL

SELECT 
  'Scene ' || scene_number::text as tipo,
  id::text,
  NULL as title,
  status,
  NULL as progress,
  video_url IS NOT NULL as tiene_video_url,
  NULL as tiene_poster_url,
  NULL as tiene_thumbnail_url
FROM movie_scenes
WHERE movie_id = '44cdabff-9877-4c4d-9a81-3aa0c6fbb3e1'
ORDER BY tipo;
