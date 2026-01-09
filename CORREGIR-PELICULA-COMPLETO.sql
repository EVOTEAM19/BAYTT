-- ==========================================
-- CORREGIR PELÍCULA COMPLETO
-- Ejecuta esto para verificar y corregir todo
-- ==========================================

-- PASO 1: Verificar estado actual ANTES de corregir
SELECT '=== ESTADO ANTES ===' as info;

SELECT 
  id,
  title,
  status,
  progress,
  video_url IS NOT NULL as has_video_url,
  poster_url IS NOT NULL as has_poster_url,
  thumbnail_url IS NOT NULL as has_thumbnail_url
FROM movies
WHERE id = '9c3fbb35-f8bf-41f3-b37b-98d894049b53';

SELECT 
  scene_number,
  status,
  video_url IS NOT NULL as has_video_url,
  LENGTH(video_url) as video_url_length,
  LEFT(video_url, 80) as video_url_preview
FROM movie_scenes
WHERE movie_id = '9c3fbb35-f8bf-41f3-b37b-98d894049b53'
ORDER BY scene_number;

-- PASO 2: Actualizar película (asegurando que tenga video_url en todos los campos necesarios)
UPDATE movies SET
  video_url = COALESCE(video_url, 'https://dnznrvs05pmza.cloudfront.net/cd5269bd-8bc6-4cea-aeaa-c04b5a2b9c2a.mp4?_jwt=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJrZXlIYXNoIjoiMGEwMDY3YTIyYTk1NDMxYSIsImJ1Y2tldCI6InJ1bndheS10YXNrLWFydGlmYWN0cyIsInN0YWdlIjoicHJvZCIsImV4cCI6MTc2ODA4OTYwMH0.xiXI6qpKOhCzJfNKaG9kdaD41M8iWx6g-WWcPtzJ2XQ'),
  video_url_720p = COALESCE(video_url_720p, video_url, 'https://dnznrvs05pmza.cloudfront.net/cd5269bd-8bc6-4cea-aeaa-c04b5a2b9c2a.mp4?_jwt=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJrZXlIYXNoIjoiMGEwMDY3YTIyYTk1NDMxYSIsImJ1Y2tldCI6InJ1bndheS10YXNrLWFydGlmYWN0cyIsInN0YWdlIjoicHJvZCIsImV4cCI6MTc2ODA4OTYwMH0.xiXI6qpKOhCzJfNKaG9kdaD41M8iWx6g-WWcPtzJ2XQ'),
  poster_url = COALESCE(poster_url, 'https://v3b.fal.media/files/b/0a89b24f/Hb7oZtezGYp1OXegYbEm5.jpg'),
  thumbnail_url = COALESCE(thumbnail_url, poster_url, 'https://v3b.fal.media/files/b/0a89b24f/Hb7oZtezGYp1OXegYbEm5.jpg'),
  status = 'completed',
  progress = 100,
  updated_at = NOW()
WHERE id = '9c3fbb35-f8bf-41f3-b37b-98d894049b53';

-- PASO 3: Actualizar escena 1 (asegurando que tenga video_url y status='completed')
UPDATE movie_scenes SET
  video_url = COALESCE(NULLIF(video_url, ''), 'https://dnznrvs05pmza.cloudfront.net/cd5269bd-8bc6-4cea-aeaa-c04b5a2b9c2a.mp4?_jwt=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJrZXlIYXNoIjoiMGEwMDY3YTIyYTk1NDMxYSIsImJ1Y2tldCI6InJ1bndheS10YXNrLWFydGlmYWN0cyIsInN0YWdlIjoicHJvZCIsImV4cCI6MTc2ODA4OTYwMH0.xiXI6qpKOhCzJfNKaG9kdaD41M8iWx6g-WWcPtzJ2XQ'),
  status = 'completed',
  updated_at = NOW()
WHERE movie_id = '9c3fbb35-f8bf-41f3-b37b-98d894049b53' AND scene_number = 1;

-- PASO 4: Actualizar escena 2
UPDATE movie_scenes SET
  video_url = COALESCE(NULLIF(video_url, ''), 'https://dnznrvs05pmza.cloudfront.net/4ad53f4f-158b-40f4-b6c4-14672ba5cdfb.mp4?_jwt=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJrZXlIYXNoIjoiOWUyNWQ3ODE5ODliNGUxYyIsImJ1Y2tldCI6InJ1bndheS10YXNrLWFydGlmYWN0cyIsInN0YWdlIjoicHJvZCIsImV4cCI6MTc2ODA4OTYwMH0.tSUieAXB8xexzmRiKXnrssJK0rNwnMUrP3kY-152nl0'),
  status = 'completed',
  updated_at = NOW()
WHERE movie_id = '9c3fbb35-f8bf-41f3-b37b-98d894049b53' AND scene_number = 2;

-- PASO 5: Verificar estado DESPUÉS de corregir
SELECT '=== ESTADO DESPUÉS ===' as info;

SELECT 
  id,
  title,
  status,
  progress,
  video_url IS NOT NULL as has_video_url,
  poster_url IS NOT NULL as has_poster_url,
  thumbnail_url IS NOT NULL as has_thumbnail_url,
  LEFT(video_url, 80) as video_url_preview,
  LEFT(poster_url, 80) as poster_url_preview
FROM movies
WHERE id = '9c3fbb35-f8bf-41f3-b37b-98d894049b53';

SELECT 
  scene_number,
  status,
  video_url IS NOT NULL as has_video_url,
  LENGTH(video_url) as video_url_length,
  LEFT(video_url, 80) as video_url_preview
FROM movie_scenes
WHERE movie_id = '9c3fbb35-f8bf-41f3-b37b-98d894049b53'
ORDER BY scene_number;

-- ✅ CORRECCIÓN COMPLETA
