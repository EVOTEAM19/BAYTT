-- ==========================================
-- CREAR TABLA MOVIES BÁSICA
-- Ejecutar esto si movies no existe
-- ==========================================

-- Crear tabla movies básica si no existe
CREATE TABLE IF NOT EXISTS public.movies (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID NOT NULL,
  title TEXT NOT NULL,
  slug TEXT,
  description TEXT,
  genre TEXT DEFAULT 'drama',
  duration_minutes NUMERIC DEFAULT 10,
  user_prompt TEXT,
  user_plot TEXT,
  user_ending TEXT,
  ending_type TEXT DEFAULT 'ai',
  status TEXT DEFAULT 'draft',
  progress INTEGER DEFAULT 0,
  thumbnail_url TEXT,
  poster_url TEXT,
  video_url TEXT,
  video_url_720p TEXT,
  video_url_1080p TEXT,
  video_url_4k TEXT,
  is_published BOOLEAN DEFAULT false,
  rental_price NUMERIC DEFAULT 0,
  views_count INTEGER DEFAULT 0,
  rentals_count INTEGER DEFAULT 0,
  average_rating NUMERIC DEFAULT 0,
  available_plans TEXT[],
  is_deleted BOOLEAN DEFAULT false,
  deleted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices básicos
CREATE INDEX IF NOT EXISTS idx_movies_user_id ON public.movies(user_id);
CREATE INDEX IF NOT EXISTS idx_movies_status ON public.movies(status);
CREATE INDEX IF NOT EXISTS idx_movies_slug ON public.movies(slug);
CREATE INDEX IF NOT EXISTS idx_movies_is_published ON public.movies(is_published);
CREATE INDEX IF NOT EXISTS idx_movies_is_deleted ON public.movies(is_deleted) WHERE is_deleted = false;

-- Habilitar RLS
ALTER TABLE public.movies ENABLE ROW LEVEL SECURITY;

-- ✅ TABLA MOVIES BÁSICA CREADA
SELECT '✅ Tabla movies creada exitosamente' as resultado;

-- NOTA: Las políticas RLS deberías crearlas manualmente según tus necesidades de seguridad
-- O usar las que ya tienes configuradas en otras migraciones
