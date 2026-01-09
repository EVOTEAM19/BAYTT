-- ============================================
-- TABLA DE PROGRESO DE CREACIÓN DE PELÍCULAS
-- ============================================

CREATE TABLE IF NOT EXISTS movie_creation_progress (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  movie_id UUID REFERENCES movies(id) ON DELETE CASCADE UNIQUE,
  
  overall_status TEXT DEFAULT 'pending',
  overall_progress INTEGER DEFAULT 0,
  current_step TEXT,
  current_step_detail TEXT,
  
  steps JSONB DEFAULT '{}',
  
  stats JSONB DEFAULT '{}',
  errors JSONB DEFAULT '[]',
  
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_movie_progress_movie_id ON movie_creation_progress(movie_id);

-- RLS
ALTER TABLE movie_creation_progress ENABLE ROW LEVEL SECURITY;

CREATE POLICY "allow_read_own_progress" ON movie_creation_progress
  FOR SELECT TO authenticated
  USING (
    movie_id IN (SELECT id FROM movies WHERE user_id = auth.uid())
  );

CREATE POLICY "allow_read_admin_progress" ON movie_creation_progress
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'superadmin')
    )
  );

-- Trigger para actualizar updated_at
CREATE OR REPLACE FUNCTION update_movie_creation_progress_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_movie_creation_progress_updated_at
  BEFORE UPDATE ON movie_creation_progress
  FOR EACH ROW
  EXECUTE FUNCTION update_movie_creation_progress_updated_at();

