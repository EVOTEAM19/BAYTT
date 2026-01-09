-- ==========================================
-- VERIFICAR ESTADO REAL DE ESCENAS
-- Ejecuta estas queries UNA POR UNA para ver qué hay
-- ==========================================

-- Query 1: Ver qué escenas existen
SELECT 
  id,
  movie_id,
  scene_number,
  status,
  video_url IS NOT NULL as tiene_video_url,
  CASE 
    WHEN video_url IS NULL THEN 'NULL'
    WHEN video_url = '' THEN 'VACÍO'
    WHEN LENGTH(video_url) = 0 THEN 'LONGITUD 0'
    ELSE 'TIENE VALOR'
  END as estado_video_url,
  LENGTH(COALESCE(video_url, '')) as longitud_video_url
FROM movie_scenes
WHERE movie_id = '9c3fbb35-f8bf-41f3-b37b-98d894049b53'
ORDER BY scene_number;

-- Query 2: Ver el contenido real del video_url (primeros 100 caracteres)
SELECT 
  scene_number,
  status,
  LEFT(COALESCE(video_url, 'NULL'), 100) as video_url_preview
FROM movie_scenes
WHERE movie_id = '9c3fbb35-f8bf-41f3-b37b-98d894049b53'
ORDER BY scene_number;

-- Query 3: FORZAR actualización directa (ejecutar esto si las escenas no tienen video_url)
UPDATE movie_scenes 
SET 
  video_url = CASE 
    WHEN scene_number = 1 THEN 'https://dnznrvs05pmza.cloudfront.net/cd5269bd-8bc6-4cea-aeaa-c04b5a2b9c2a.mp4?_jwt=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJrZXlIYXNoIjoiMGEwMDY3YTIyYTk1NDMxYSIsImJ1Y2tldCI6InJ1bndheS10YXNrLWFydGlmYWN0cyIsInN0YWdlIjoicHJvZCIsImV4cCI6MTc2ODA4OTYwMH0.xiXI6qpKOhCzJfNKaG9kdaD41M8iWx6g-WWcPtzJ2XQ'
    WHEN scene_number = 2 THEN 'https://dnznrvs05pmza.cloudfront.net/4ad53f4f-158b-40f4-b6c4-14672ba5cdfb.mp4?_jwt=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJrZXlIYXNoIjoiOWUyNWQ3ODE5ODliNGUxYyIsImJ1Y2tldCI6InJ1bndheS10YXNrLWFydGlmYWN0cyIsInN0YWdlIjoicHJvZCIsImV4cCI6MTc2ODA4OTYwMH0.tSUieAXB8xexzmRiKXnrssJK0rNwnMUrP3kY-152nl0'
    ELSE video_url
  END,
  status = 'completed',
  updated_at = NOW()
WHERE movie_id = '9c3fbb35-f8bf-41f3-b37b-98d894049b53'
  AND scene_number IN (1, 2);

-- Query 4: Verificar después de actualizar
SELECT 
  scene_number,
  status,
  video_url IS NOT NULL as tiene_video_url,
  LENGTH(COALESCE(video_url, '')) as longitud,
  LEFT(COALESCE(video_url, 'NULL'), 80) as preview
FROM movie_scenes
WHERE movie_id = '9c3fbb35-f8bf-41f3-b37b-98d894049b53'
ORDER BY scene_number;
