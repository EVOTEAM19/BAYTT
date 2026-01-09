-- ==========================================
-- CORREGIR VIDEO_URL DE LA PELÍCULA
-- Usa la URL real de la primera escena de Runway
-- ==========================================

-- Actualizar la película con la URL real de la primera escena
UPDATE movies SET 
  video_url = 'https://dnznrvs05pmza.cloudfront.net/31aae1b0-2573-45e6-a11e-34270bdb63d4.mp4?_jwt=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJrZXlIYXNoIjoiOGZjMzA0ZWNiNzQ1NTBhOSIsImJ1Y2tldCI6InJ1bndheS10YXNrLWFydGlmYWN0cyIsInN0YWdlIjoicHJvZCIsImV4cCI6MTc2ODA4OTYwMH0.aS1vep0Age9EKha2NK07ixgulkyBKNWbPcvsBeIrxTU',
  updated_at = NOW()
WHERE id = '44cdabff-9877-4c4d-9a81-3aa0c6fbb3e1';

-- Verificar resultado
SELECT 
  id,
  title,
  status,
  LEFT(video_url, 100) as video_url_preview,
  video_url IS NOT NULL as tiene_video_url
FROM movies
WHERE id = '44cdabff-9877-4c4d-9a81-3aa0c6fbb3e1';
