-- ==========================================
-- RECUPERACIÓN URGENTE: Película 9c3fbb35-f8bf-41f3-b37b-98d894049b53
-- Ejecutar esto en Supabase SQL Editor
-- ==========================================

-- PASO 1: Añadir columnas faltantes (si no existen)
ALTER TABLE movies ADD COLUMN IF NOT EXISTS video_url TEXT;
ALTER TABLE movies ADD COLUMN IF NOT EXISTS poster_url TEXT;
ALTER TABLE movies ADD COLUMN IF NOT EXISTS thumbnail_url TEXT;

ALTER TABLE movie_scenes ADD COLUMN IF NOT EXISTS reference_image_url TEXT;
ALTER TABLE movie_scenes ADD COLUMN IF NOT EXISTS reference_image_source TEXT;
ALTER TABLE movie_scenes ADD COLUMN IF NOT EXISTS end_frame_url TEXT;
ALTER TABLE movie_scenes ADD COLUMN IF NOT EXISTS location_image_id UUID;

CREATE TABLE IF NOT EXISTS location_images (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  location_name TEXT NOT NULL,
  location_slug TEXT NOT NULL,
  time_of_day TEXT DEFAULT 'day',
  weather TEXT DEFAULT 'clear',
  image_url TEXT NOT NULL,
  thumbnail_url TEXT,
  generation_prompt TEXT,
  width INTEGER DEFAULT 1280,
  height INTEGER DEFAULT 768,
  times_used INTEGER DEFAULT 0,
  last_used_at TIMESTAMPTZ,
  created_by_movie_id UUID REFERENCES movies(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(location_slug, time_of_day, weather)
);

-- PASO 2: Actualizar la película con los datos generados
UPDATE movies SET
  video_url = 'https://dnznrvs05pmza.cloudfront.net/cd5269bd-8bc6-4cea-aeaa-c04b5a2b9c2a.mp4?_jwt=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJrZXlIYXNoIjoiMGEwMDY3YTIyYTk1NDMxYSIsImJ1Y2tldCI6InJ1bndheS10YXNrLWFydGlmYWN0cyIsInN0YWdlIjoicHJvZCIsImV4cCI6MTc2ODA4OTYwMH0.xiXI6qpKOhCzJfNKaG9kdaD41M8iWx6g-WWcPtzJ2XQ',
  poster_url = 'https://v3b.fal.media/files/b/0a89b24f/Hb7oZtezGYp1OXegYbEm5.jpg',
  thumbnail_url = 'https://v3b.fal.media/files/b/0a89b24f/Hb7oZtezGYp1OXegYbEm5.jpg',
  status = 'completed',
  progress = 100,
  updated_at = NOW()
WHERE id = '9c3fbb35-f8bf-41f3-b37b-98d894049b53';

-- PASO 3: Actualizar escena 1
UPDATE movie_scenes SET
  video_url = 'https://dnznrvs05pmza.cloudfront.net/cd5269bd-8bc6-4cea-aeaa-c04b5a2b9c2a.mp4?_jwt=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJrZXlIYXNoIjoiMGEwMDY3YTIyYTk1NDMxYSIsImJ1Y2tldCI6InJ1bndheS10YXNrLWFydGlmYWN0cyIsInN0YWdlIjoicHJvZCIsImV4cCI6MTc2ODA4OTYwMH0.xiXI6qpKOhCzJfNKaG9kdaD41M8iWx6g-WWcPtzJ2XQ',
  status = 'completed',
  updated_at = NOW()
WHERE movie_id = '9c3fbb35-f8bf-41f3-b37b-98d894049b53' AND scene_number = 1;

-- PASO 4: Actualizar escena 2
UPDATE movie_scenes SET
  video_url = 'https://dnznrvs05pmza.cloudfront.net/4ad53f4f-158b-40f4-b6c4-14672ba5cdfb.mp4?_jwt=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJrZXlIYXNoIjoiOWUyNWQ3ODE5ODliNGUxYyIsImJ1Y2tldCI6InJ1bndheS10YXNrLWFydGlmYWN0cyIsInN0YWdlIjoicHJvZCIsImV4cCI6MTc2ODA4OTYwMH0.tSUieAXB8xexzmRiKXnrssJK0rNwnMUrP3kY-152nl0',
  status = 'completed',
  updated_at = NOW()
WHERE movie_id = '9c3fbb35-f8bf-41f3-b37b-98d894049b53' AND scene_number = 2;

-- PASO 5: Verificar que se actualizó correctamente
SELECT 
  id,
  title,
  status,
  progress,
  video_url,
  poster_url,
  thumbnail_url,
  created_at,
  updated_at
FROM movies
WHERE id = '9c3fbb35-f8bf-41f3-b37b-98d894049b53';

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

-- ✅ RECUPERACIÓN COMPLETA
