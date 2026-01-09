-- ==========================================
-- SQL FINAL - EJECUTA ESTO DIRECTAMENTE
-- Copia y pega todo en Supabase SQL Editor
-- ==========================================

-- Crear políticas RLS simples (sin verificar profiles)
DO $$
BEGIN
  -- Eliminar políticas existentes si hay algún problema
  DROP POLICY IF EXISTS "allow_read_scenes" ON public.movie_scenes;
  DROP POLICY IF EXISTS "allow_insert_scenes" ON public.movie_scenes;
  DROP POLICY IF EXISTS "allow_update_scenes" ON public.movie_scenes;

  -- Política de lectura: solo el dueño del movie puede leer sus escenas
  CREATE POLICY "allow_read_scenes" ON public.movie_scenes
    FOR SELECT TO authenticated
    USING (
      movie_id IN (SELECT id FROM public.movies WHERE user_id = auth.uid())
    );

  -- Política de inserción: solo el dueño del movie puede insertar escenas
  CREATE POLICY "allow_insert_scenes" ON public.movie_scenes
    FOR INSERT TO authenticated
    WITH CHECK (
      movie_id IN (SELECT id FROM public.movies WHERE user_id = auth.uid())
    );

  -- Política de actualización: solo el dueño del movie puede actualizar escenas
  CREATE POLICY "allow_update_scenes" ON public.movie_scenes
    FOR UPDATE TO authenticated
    USING (
      movie_id IN (SELECT id FROM public.movies WHERE user_id = auth.uid())
    );

  RAISE NOTICE '✅ Políticas RLS creadas exitosamente';
END $$;

-- ✅ COMPLETADO
