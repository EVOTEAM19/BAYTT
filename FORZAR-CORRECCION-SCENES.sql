-- ==========================================
-- FORZAR CORRECCIÓN DE ESCENAS
-- Este script fuerza la actualización sin importar el estado actual
-- ==========================================

-- Verificar primero qué hay en la BD
SELECT '=== VERIFICACIÓN INICIAL ===' as info;

SELECT 
  scene_number,
  id,
  status,
  video_url,
  LENGTH(COALESCE(video_url, '')) as video_url_len,
  CASE 
    WHEN video_url IS NULL THEN 'NULL'
    WHEN video_url = '' THEN 'EMPTY'
    WHEN video_url = 'null' THEN 'STRING NULL'
    WHEN video_url = 'undefined' THEN 'STRING UNDEFINED'
    ELSE 'HAS VALUE'
  END as video_url_status
FROM movie_scenes
WHERE movie_id = '9c3fbb35-f8bf-41f3-b37b-98d894049b53'
ORDER BY scene_number;

-- FORZAR actualización de ESCENA 1 (aunque no tenga video_url, le ponemos uno)
UPDATE movie_scenes SET
  video_url = 'https://dnznrvs05pmza.cloudfront.net/cd5269bd-8bc6-4cea-aeaa-c04b5a2b9c2a.mp4?_jwt=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJrZXlIYXNoIjoiMGEwMDY3YTIyYTk1NDMxYSIsImJ1Y2tldCI6InJ1bndheS10YXNrLWFydGlmYWN0cyIsInN0YWdlIjoicHJvZCIsImV4cCI6MTc2ODA4OTYwMH0.xiXI6qpKOhCzJfNKaG9kdaD41M8iWx6g-WWcPtzJ2XQ',
  status = 'completed',
  updated_at = NOW()
WHERE movie_id = '9c3fbb35-f8bf-41f3-b37b-98d894049b53' 
  AND scene_number = 1;

-- FORZAR actualización de ESCENA 2
UPDATE movie_scenes SET
  video_url = 'https://dnznrvs05pmza.cloudfront.net/4ad53f4f-158b-40f4-b6c4-14672ba5cdfb.mp4?_jwt=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJrZXlIYXNoIjoiOWUyNWQ3ODE5ODliNGUxYyIsImJ1Y2tldCI6InJ1bndheS10YXNrLWFydGlmYWN0cyIsInN0YWdlIjoicHJvZCIsImV4cCI6MTc2ODA4OTYwMH0.tSUieAXB8xexzmRiKXnrssJK0rNwnMUrP3kY-152nl0',
  status = 'completed',
  updated_at = NOW()
WHERE movie_id = '9c3fbb35-f8bf-41f3-b37b-98d894049b53' 
  AND scene_number = 2;

-- Verificar DESPUÉS de la actualización
SELECT '=== VERIFICACIÓN DESPUÉS ===' as info;

SELECT 
  scene_number,
  status,
  video_url IS NOT NULL as has_video_url,
  CASE WHEN video_url IS NULL THEN 'NULL' WHEN video_url = '' THEN 'EMPTY' ELSE LEFT(video_url, 80) END as video_url_preview
FROM movie_scenes
WHERE movie_id = '9c3fbb35-f8bf-41f3-b37b-98d894049b53'
ORDER BY scene_number;

-- Verificar también la película
SELECT 
  id,
  title,
  status,
  video_url IS NOT NULL as has_video_url,
  poster_url IS NOT NULL as has_poster_url,
  thumbnail_url IS NOT NULL as has_thumbnail_url
FROM movies
WHERE id = '9c3fbb35-f8bf-41f3-b37b-98d894049b53';
