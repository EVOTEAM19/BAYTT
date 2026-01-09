-- ============================================
-- AÑADIR CAMPOS LoRA A PERSONAJES
-- ============================================

-- Avatar definitivo generado con LoRA entrenado
ALTER TABLE characters ADD COLUMN IF NOT EXISTS lora_avatar_url TEXT;

-- Bloqueo de personaje (una vez true, no se puede modificar visualmente)
ALTER TABLE characters ADD COLUMN IF NOT EXISTS lora_locked BOOLEAN DEFAULT false;

-- Fecha de bloqueo
ALTER TABLE characters ADD COLUMN IF NOT EXISTS lora_locked_at TIMESTAMPTZ;

-- Comentarios
COMMENT ON COLUMN characters.lora_avatar_url IS 'Avatar generado con LoRA entrenado, siempre de frente, imagen definitiva';
COMMENT ON COLUMN characters.lora_locked IS 'Una vez true, el personaje no se puede modificar visualmente, solo actitud/comportamiento';
COMMENT ON COLUMN characters.lora_locked_at IS 'Fecha en que se bloqueó el personaje después del entrenamiento LoRA';
