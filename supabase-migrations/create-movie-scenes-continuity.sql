-- ============================================
-- ESCENAS DE PELÍCULA CON SISTEMA DE CONTINUIDAD
-- ============================================

CREATE TABLE IF NOT EXISTS movie_scenes (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  movie_id UUID REFERENCES movies(id) ON DELETE CASCADE,
  
  -- Información de escena
  scene_number INTEGER NOT NULL,
  scene_id TEXT, -- 'SC001', 'SC002', etc.
  
  -- Ubicación (referencia a biblioteca)
  location_id UUID REFERENCES locations(id),
  location_snapshot JSONB, -- Copia de los datos del lugar al momento de generar
  
  -- Continuidad
  is_continuation BOOLEAN DEFAULT false, -- ¿Continúa de la escena anterior?
  continues_from_scene INTEGER,           -- Número de escena que continúa
  
  -- Frames de referencia (CRÍTICO)
  reference_frames JSONB DEFAULT '{}',
  /*
  {
    "start_frame": {
      "url": "https://...",
      "source": "previous_scene" | "location_library" | "generated",
      "generated_at": "ISO date"
    },
    "end_frame": {
      "url": "https://...",
      "extracted_at": "ISO date"
    },
    "key_frames": [
      {"timestamp": 3, "url": "..."},
      {"timestamp": 7, "url": "..."}
    ]
  }
  */
  
  -- Contenido generado
  video_url TEXT,
  video_duration_seconds INTEGER,
  
  -- Prompts usados
  video_prompt TEXT,       -- Prompt corto para Runway (<1000 chars)
  full_scene_description TEXT, -- Descripción completa del guionista
  
  -- Estado
  status TEXT DEFAULT 'pending',
  error_message TEXT,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Constraint: una escena única por película
  UNIQUE(movie_id, scene_number)
);

CREATE INDEX IF NOT EXISTS idx_movie_scenes_movie ON movie_scenes(movie_id);
CREATE INDEX IF NOT EXISTS idx_movie_scenes_location ON movie_scenes(location_id);
CREATE INDEX IF NOT EXISTS idx_movie_scenes_continuation ON movie_scenes(movie_id, continues_from_scene);

-- RLS
ALTER TABLE movie_scenes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "allow_read_scenes" ON movie_scenes
  FOR SELECT TO authenticated
  USING (
    movie_id IN (SELECT id FROM movies WHERE user_id = auth.uid())
    OR EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'superadmin')
    )
  );

CREATE POLICY "allow_insert_scenes" ON movie_scenes
  FOR INSERT TO authenticated
  WITH CHECK (
    movie_id IN (SELECT id FROM movies WHERE user_id = auth.uid())
    OR EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'superadmin')
    )
  );

CREATE POLICY "allow_update_scenes" ON movie_scenes
  FOR UPDATE TO authenticated
  USING (
    movie_id IN (SELECT id FROM movies WHERE user_id = auth.uid())
    OR EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'superadmin')
    )
  );

-- Trigger para actualizar updated_at
CREATE OR REPLACE FUNCTION update_movie_scenes_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_movie_scenes_updated_at
  BEFORE UPDATE ON movie_scenes
  FOR EACH ROW
  EXECUTE FUNCTION update_movie_scenes_updated_at();
