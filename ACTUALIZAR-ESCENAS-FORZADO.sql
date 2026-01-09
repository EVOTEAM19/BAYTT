-- ==========================================
-- ACTUALIZAR ESCENAS - FORZADO DIRECTO
-- Ejecuta esto PRIMERO para ver qué hay, luego actualiza
-- ==========================================

-- PASO 1: Ver qué hay ANTES
SELECT 
  scene_number,
  id,
  status,
  video_url,
  updated_at
FROM movie_scenes
WHERE movie_id = '9c3fbb35-f8bf-41f3-b37b-98d894049b53'
ORDER BY scene_number;

-- PASO 2: Actualizar ESCENA 1 (FORZADO)
UPDATE movie_scenes 
SET 
  video_url = 'https://dnznrvs05pmza.cloudfront.net/cd5269bd-8bc6-4cea-aeaa-c04b5a2b9c2a.mp4?_jwt=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJrZXlIYXNoIjoiMGEwMDY3YTIyYTk1NDMxYSIsImJ1Y2tldCI6InJ1bndheS10YXNrLWFydGlmYWN0cyIsInN0YWdlIjoicHJvZCIsImV4cCI6MTc2ODA4OTYwMH0.xiXI6qpKOhCzJfNKaG9kdaD41M8iWx6g-WWcPtzJ2XQ',
  status = 'completed',
  updated_at = NOW()
WHERE movie_id = '9c3fbb35-f8bf-41f3-b37b-98d894049b53' 
  AND scene_number = 1
RETURNING id, scene_number, status, video_url;

-- PASO 3: Actualizar ESCENA 2 (FORZADO)
UPDATE movie_scenes 
SET 
  video_url = 'https://dnznrvs05pmza.cloudfront.net/4ad53f4f-158b-40f4-b6c4-14672ba5cdfb.mp4?_jwt=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJrZXlIYXNoIjoiOWUyNWQ3ODE5ODliNGUxYyIsImJ1Y2tldCI6InJ1bndheS10YXNrLWFydGlmYWN0cyIsInN0YWdlIjoicHJvZCIsImV4cCI6MTc2ODA4OTYwMH0.tSUieAXB8xexzmRiKXnrssJK0rNwnMUrP3kY-152nl0',
  status = 'completed',
  updated_at = NOW()
WHERE movie_id = '9c3fbb35-f8bf-41f3-b37b-98d894049b53' 
  AND scene_number = 2
RETURNING id, scene_number, status, video_url;

-- PASO 4: Ver qué hay DESPUÉS
SELECT 
  scene_number,
  id,
  status,
  video_url IS NOT NULL as tiene_video,
  LENGTH(video_url) as longitud_video_url,
  LEFT(video_url, 80) as video_preview,
  updated_at
FROM movie_scenes
WHERE movie_id = '9c3fbb35-f8bf-41f3-b37b-98d894049b53'
ORDER BY scene_number;
