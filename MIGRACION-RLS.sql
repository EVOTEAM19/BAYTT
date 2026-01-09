-- ==========================================
-- MIGRACIÓN RLS: Crear políticas de seguridad
-- Ejecutar esto DESPUÉS de que movies exista
-- ==========================================

-- Verificar que movies existe antes de crear políticas
DO $$
DECLARE
  profiles_exists BOOLEAN;
BEGIN
  IF NOT EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'movies') THEN
    RAISE WARNING '⚠️ La tabla movies no existe. Las políticas RLS no se crearán. Ejecuta este script después de crear la tabla movies.';
    RETURN;
  END IF;

  -- Verificar si profiles existe
  SELECT EXISTS (
    SELECT FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = 'profiles'
  ) INTO profiles_exists;

  -- Crear políticas RLS (versión simple si profiles no existe)
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'movie_scenes' 
    AND policyname = 'allow_read_scenes'
  ) THEN
    IF profiles_exists THEN
      -- Política con verificación de admin en profiles
      CREATE POLICY "allow_read_scenes" ON public.movie_scenes
        FOR SELECT TO authenticated
        USING (
          movie_id IN (SELECT id FROM public.movies WHERE user_id = auth.uid())
          OR EXISTS (
            SELECT 1 FROM public.profiles
            WHERE profiles.id = auth.uid()
            AND profiles.role IN ('admin', 'superadmin')
          )
        );
    ELSE
      -- Política simple sin profiles (solo verifica que el usuario sea dueño del movie)
      CREATE POLICY "allow_read_scenes" ON public.movie_scenes
        FOR SELECT TO authenticated
        USING (
          movie_id IN (SELECT id FROM public.movies WHERE user_id = auth.uid())
        );
    END IF;
    RAISE NOTICE '✅ Política allow_read_scenes creada';
  ELSE
    RAISE NOTICE '⚠️ Política allow_read_scenes ya existe';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'movie_scenes' 
    AND policyname = 'allow_insert_scenes'
  ) THEN
    IF profiles_exists THEN
      CREATE POLICY "allow_insert_scenes" ON public.movie_scenes
        FOR INSERT TO authenticated
        WITH CHECK (
          movie_id IN (SELECT id FROM public.movies WHERE user_id = auth.uid())
          OR EXISTS (
            SELECT 1 FROM public.profiles
            WHERE profiles.id = auth.uid()
            AND profiles.role IN ('admin', 'superadmin')
          )
        );
    ELSE
      CREATE POLICY "allow_insert_scenes" ON public.movie_scenes
        FOR INSERT TO authenticated
        WITH CHECK (
          movie_id IN (SELECT id FROM public.movies WHERE user_id = auth.uid())
        );
    END IF;
    RAISE NOTICE '✅ Política allow_insert_scenes creada';
  ELSE
    RAISE NOTICE '⚠️ Política allow_insert_scenes ya existe';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'movie_scenes' 
    AND policyname = 'allow_update_scenes'
  ) THEN
    IF profiles_exists THEN
      CREATE POLICY "allow_update_scenes" ON public.movie_scenes
        FOR UPDATE TO authenticated
        USING (
          movie_id IN (SELECT id FROM public.movies WHERE user_id = auth.uid())
          OR EXISTS (
            SELECT 1 FROM public.profiles
            WHERE profiles.id = auth.uid()
            AND profiles.role IN ('admin', 'superadmin')
          )
        );
    ELSE
      CREATE POLICY "allow_update_scenes" ON public.movie_scenes
        FOR UPDATE TO authenticated
        USING (
          movie_id IN (SELECT id FROM public.movies WHERE user_id = auth.uid())
        );
    END IF;
    RAISE NOTICE '✅ Política allow_update_scenes creada';
  ELSE
    RAISE NOTICE '⚠️ Política allow_update_scenes ya existe';
  END IF;

  RAISE NOTICE '✅ Todas las políticas RLS configuradas correctamente';
END $$;

-- ✅ MIGRACIÓN RLS COMPLETA
