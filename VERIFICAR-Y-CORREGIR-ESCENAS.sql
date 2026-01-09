-- ==========================================
-- VERIFICAR Y CORREGIR ESCENAS DIRECTAMENTE
-- Ejecuta esto para ver qué hay realmente en la BD
-- ==========================================

-- 1. VERIFICAR SI LAS ESCENAS EXISTEN
SELECT 
  'VERIFICACIÓN: Escenas existentes' as paso,
  id,
  movie_id,
  scene_number,
  status,
  clip_status,
  video_url IS NOT NULL as tiene_video_url,
  clip_url IS NOT NULL as tiene_clip_url,
  LEFT(COALESCE(video_url, clip_url, 'NULL'), 100) as video_preview,
  created_at,
  updated_at
FROM movie_scenes
WHERE movie_id = '44cdabff-9877-4c4d-9a81-3aa0c6fbb3e1'
ORDER BY scene_number;

-- 2. SI NO HAY ESCENAS, VERIFICAR LA PELÍCULA
SELECT 
  'VERIFICACIÓN: Datos de la película' as paso,
  id,
  title,
  status,
  progress,
  video_url IS NOT NULL as tiene_video_url,
  poster_url IS NOT NULL as tiene_poster_url,
  LEFT(COALESCE(video_url, 'NULL'), 100) as video_preview
FROM movies
WHERE id = '44cdabff-9877-4c4d-9a81-3aa0c6fbb3e1';

-- 3. CREAR O ACTUALIZAR ESCENAS (INSERT ... ON CONFLICT es más seguro)
-- Crear o actualizar escenas usando INSERT ... ON CONFLICT
-- Esto funciona tanto si las escenas existen como si no
INSERT INTO movie_scenes (
  movie_id,
  scene_number,
  scene_id,
  full_scene_description,
  video_url,
  status,
  updated_at
) VALUES 
  (
    '44cdabff-9877-4c4d-9a81-3aa0c6fbb3e1',
    1,
    'SC001',
    'La chica camina tranquilamente por el paseo marítimo, disfrutando de la vista.',
    'https://dnznrvs05pmza.cloudfront.net/31aae1b0-2573-45e6-a11e-34270bdb63d4.mp4?_jwt=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJrZXlIYXNoIjoiOGZjMzA0ZWNiNzQ1NTBhOSIsImJ1Y2tldCI6InJ1bndheS10YXNrLWFydGlmYWN0cyIsInN0YWdlIjoicHJvZCIsImV4cCI6MTc2ODA4OTYwMH0.aS1vep0Age9EKha2NK07ixgulkyBKNWbPcvsBeIrxTU',
    'completed',
    NOW()
  ),
  (
    '44cdabff-9877-4c4d-9a81-3aa0c6fbb3e1',
    2,
    'SC002',
    'Algo cae del bolso de la chica, se agacha para recogerlo y se sorprende al escuchar un ruido detrás de ella.',
    'https://dnznrvs05pmza.cloudfront.net/c8a72225-e9b7-4713-b081-badb2b6f93f1.mp4?_jwt=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJrZXlIYXNoIjoiZWI2ZmYzYTMxNjE5ZjkzMiIsImJ1Y2tldCI6InJ1bndheS10YXNrLWFydGlmYWN0cyIsInN0YWdlIjoicHJvZCIsImV4cCI6MTc2ODA4OTYwMH0.DZ49xZXdHz0_nxmk2BqGBQJaaQff3WWfjmzm224i5Cg',
    'completed',
    NOW()
  )
ON CONFLICT (movie_id, scene_number) 
DO UPDATE SET
  video_url = EXCLUDED.video_url,
  status = EXCLUDED.status,
  updated_at = NOW(),
  full_scene_description = COALESCE(EXCLUDED.full_scene_description, movie_scenes.full_scene_description),
  scene_id = COALESCE(EXCLUDED.scene_id, movie_scenes.scene_id);

-- 4. ACTUALIZAR clip_url también si la columna existe (para compatibilidad)
-- Intentar actualizar clip_url solo si la columna existe
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns 
             WHERE table_schema = 'public' 
             AND table_name = 'movie_scenes' 
             AND column_name = 'clip_url') THEN
    UPDATE movie_scenes SET 
      clip_url = video_url
    WHERE movie_id = '44cdabff-9877-4c4d-9a81-3aa0c6fbb3e1'
      AND scene_number IN (1, 2)
      AND video_url IS NOT NULL;
    RAISE NOTICE '✅ clip_url actualizado para compatibilidad';
  END IF;
  
  IF EXISTS (SELECT 1 FROM information_schema.columns 
             WHERE table_schema = 'public' 
             AND table_name = 'movie_scenes' 
             AND column_name = 'clip_status') THEN
    UPDATE movie_scenes SET 
      clip_status = status
    WHERE movie_id = '44cdabff-9877-4c4d-9a81-3aa0c6fbb3e1'
      AND scene_number IN (1, 2)
      AND status = 'completed';
    RAISE NOTICE '✅ clip_status actualizado para compatibilidad';
  END IF;
END $$;

-- 6. VERIFICACIÓN FINAL DESPUÉS DE LA CORRECCIÓN
SELECT 
  '✅ RESULTADO FINAL' as paso,
  id,
  scene_number,
  status,
  clip_status,
  video_url IS NOT NULL as tiene_video_url,
  clip_url IS NOT NULL as tiene_clip_url,
  LENGTH(COALESCE(video_url, clip_url, '')) as longitud_video,
  LEFT(COALESCE(video_url, clip_url, 'NULL'), 80) as video_preview
FROM movie_scenes
WHERE movie_id = '44cdabff-9877-4c4d-9a81-3aa0c6fbb3e1'
ORDER BY scene_number;
