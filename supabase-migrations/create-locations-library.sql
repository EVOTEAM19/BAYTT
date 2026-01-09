-- ============================================
-- BIBLIOTECA DE LUGARES
-- Tabla para almacenar 1000+ lugares reutilizables entre películas
-- ============================================

CREATE TABLE IF NOT EXISTS locations (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  
  -- Información básica
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  description TEXT,
  
  -- Categorización
  category TEXT NOT NULL, -- 'beach', 'city', 'interior', 'nature', 'urban', etc.
  subcategory TEXT,       -- 'tropical_beach', 'european_city', etc.
  tags TEXT[] DEFAULT '{}',
  
  -- Ubicación real (si aplica)
  real_location TEXT,     -- 'Benidorm, España'
  country TEXT,
  
  -- Imágenes de referencia (CRÍTICO para continuidad)
  images JSONB DEFAULT '[]',
  /*
  [
    {
      "id": "uuid",
      "url": "https://...",
      "type": "main" | "detail" | "wide" | "close",
      "angle": "front" | "left" | "right" | "aerial",
      "time_of_day": "day" | "night" | "sunset" | "sunrise",
      "weather": "sunny" | "cloudy" | "rainy",
      "description": "Vista principal de la playa"
    }
  ]
  */
  
  -- Imagen principal (thumbnail)
  thumbnail_url TEXT,
  
  -- Prompt base para generar este lugar
  generation_prompt TEXT NOT NULL,
  negative_prompt TEXT,
  
  -- Características visuales
  visual_characteristics JSONB DEFAULT '{}',
  /*
  {
    "dominant_colors": ["#FFD700", "#87CEEB", "#F4A460"],
    "lighting_type": "natural",
    "atmosphere": "warm, tropical",
    "key_elements": ["palm trees", "white sand", "blue water"],
    "style": "realistic, cinematic"
  }
  */
  
  -- Estadísticas de uso
  times_used INTEGER DEFAULT 0,
  last_used_at TIMESTAMPTZ,
  
  -- Origen
  source TEXT DEFAULT 'generated', -- 'generated', 'web_search', 'uploaded'
  source_url TEXT,                 -- URL original si vino de internet
  
  -- Metadata
  is_public BOOLEAN DEFAULT true,  -- Disponible para todos los usuarios
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_locations_category ON locations(category);
CREATE INDEX IF NOT EXISTS idx_locations_tags ON locations USING GIN(tags);
CREATE INDEX IF NOT EXISTS idx_locations_slug ON locations(slug);
CREATE INDEX IF NOT EXISTS idx_locations_search ON locations USING GIN(to_tsvector('spanish', name || ' ' || COALESCE(description, '')));

-- Búsqueda full-text
CREATE OR REPLACE FUNCTION search_locations(search_query TEXT, limit_count INTEGER DEFAULT 20)
RETURNS SETOF locations AS $$
BEGIN
  RETURN QUERY
  SELECT *
  FROM locations
  WHERE 
    to_tsvector('spanish', name || ' ' || COALESCE(description, '') || ' ' || COALESCE(real_location, '')) 
    @@ plainto_tsquery('spanish', search_query)
    OR name ILIKE '%' || search_query || '%'
    OR category ILIKE '%' || search_query || '%'
    OR search_query = ANY(tags)
  ORDER BY times_used DESC, created_at DESC
  LIMIT limit_count;
END;
$$ LANGUAGE plpgsql;

-- RLS
ALTER TABLE locations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "allow_read_public_locations" ON locations
  FOR SELECT TO authenticated
  USING (is_public = true OR created_by = auth.uid());

CREATE POLICY "allow_insert_locations" ON locations
  FOR INSERT TO authenticated
  WITH CHECK (created_by = auth.uid() OR EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role IN ('admin', 'superadmin')
  ));

CREATE POLICY "allow_update_own_locations" ON locations
  FOR UPDATE TO authenticated
  USING (created_by = auth.uid() OR EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role IN ('admin', 'superadmin')
  ));

-- Trigger para actualizar updated_at
CREATE OR REPLACE FUNCTION update_locations_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_locations_updated_at
  BEFORE UPDATE ON locations
  FOR EACH ROW
  EXECUTE FUNCTION update_locations_updated_at();
