-- ============================================
-- AUDIO DE ESCENAS (SEPARADO DEL VIDEO)
-- ============================================

CREATE TABLE IF NOT EXISTS scene_audio (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  scene_id UUID REFERENCES movie_scenes(id) ON DELETE CASCADE,
  
  -- Diálogo
  character_id UUID REFERENCES characters(id),
  character_name TEXT NOT NULL,
  dialogue_text TEXT NOT NULL,
  
  -- Delivery (para ElevenLabs)
  emotion TEXT,
  pace TEXT,        -- 'slow', 'normal', 'fast'
  volume TEXT,      -- 'whisper', 'normal', 'loud', 'shout'
  tone TEXT,
  
  -- Timing
  start_second DECIMAL(5,2),
  duration_seconds DECIMAL(5,2),
  
  -- Audio generado
  audio_url TEXT,
  
  -- Lip sync
  lip_sync_applied BOOLEAN DEFAULT false,
  lip_synced_video_url TEXT,
  
  -- Estado
  status TEXT DEFAULT 'pending',
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_scene_audio_scene ON scene_audio(scene_id);
CREATE INDEX IF NOT EXISTS idx_scene_audio_character ON scene_audio(character_id);
CREATE INDEX IF NOT EXISTS idx_scene_audio_status ON scene_audio(status);

-- RLS
ALTER TABLE scene_audio ENABLE ROW LEVEL SECURITY;

CREATE POLICY "allow_read_audio" ON scene_audio
  FOR SELECT TO authenticated
  USING (
    scene_id IN (
      SELECT ms.id FROM movie_scenes ms
      JOIN movies m ON ms.movie_id = m.id
      WHERE m.user_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'superadmin')
    )
  );

CREATE POLICY "allow_insert_audio" ON scene_audio
  FOR INSERT TO authenticated
  WITH CHECK (
    scene_id IN (
      SELECT ms.id FROM movie_scenes ms
      JOIN movies m ON ms.movie_id = m.id
      WHERE m.user_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'superadmin')
    )
  );

CREATE POLICY "allow_update_audio" ON scene_audio
  FOR UPDATE TO authenticated
  USING (
    scene_id IN (
      SELECT ms.id FROM movie_scenes ms
      JOIN movies m ON ms.movie_id = m.id
      WHERE m.user_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'superadmin')
    )
  );

-- Trigger para actualizar updated_at
CREATE OR REPLACE FUNCTION update_scene_audio_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_scene_audio_updated_at
  BEFORE UPDATE ON scene_audio
  FOR EACH ROW
  EXECUTE FUNCTION update_scene_audio_updated_at();
