import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/supabase/admin'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  // Manejar tanto el formato nuevo (Promise) como el antiguo
  const resolvedParams = params instanceof Promise ? await params : params
  const movieId = resolvedParams.id
  
  try {
    const supabase = await createServerSupabaseClient()
    
    // Verificar auth
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }
    
    // Obtener película (siempre fresca, sin caché)
    const { data: movie, error: movieError } = await supabaseAdmin
      .from('movies')
      .select('*')
      .eq('id', movieId)
      .single()
    
    if (movieError || !movie) {
      console.error('Error fetching movie:', movieError)
      return NextResponse.json({ error: 'Película no encontrada' }, { status: 404 })
    }
    
    console.log(`[PROGRESS API] Movie status: ${movie.status}, progress: ${movie.progress}%`)
    
    // Verificar que el usuario sea el creador o admin
    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()
    
    const isAdmin = profile?.role === 'admin' || profile?.role === 'superadmin'
    const isCreator = movie.user_id === user.id
    
    if (!isAdmin && !isCreator) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
    }
    
    // Obtener progreso (puede no existir si la tabla no está creada o es nueva)
    let progress = null
    try {
      const { data: progressData } = await supabaseAdmin
        .from('movie_creation_progress')
        .select('*')
        .eq('movie_id', movieId)
        .maybeSingle()
      
      progress = progressData
    } catch (e) {
      // Si la tabla no existe, continuar sin progreso
      console.warn('Progress table may not exist:', e)
    }
    
    // Si no hay progreso, crear uno básico desde el estado de la película
    if (!progress) {
      // Intentar determinar el paso actual desde el estado de la película
      let currentStep = 'validate_providers'
      let currentStepDetail = 'Iniciando generación...'
      
      // Mapear estados de película a pasos del pipeline
      const statusToStep: Record<string, { step: string; detail: string; progress: number }> = {
        'processing': { step: 'validate_providers', detail: 'Validando proveedores...', progress: 5 },
        'script_generating': { step: 'generate_screenplay', detail: 'Generando guión...', progress: 15 },
        'video_generating': { step: 'generate_videos', detail: 'Generando videos...', progress: 30 },
        'audio_generating': { step: 'generate_audio', detail: 'Generando audio...', progress: 60 },
        'assembling': { step: 'assemble_movie', detail: 'Ensamblando película...', progress: 85 },
        'completed': { step: 'finalize', detail: '¡Película completada!', progress: 100 },
        'failed': { step: 'finalize', detail: 'Error en la generación', progress: 0 }
      }
      
      const statusInfo = statusToStep[movie.status] || statusToStep['processing']
      currentStep = statusInfo.step
      currentStepDetail = statusInfo.detail
      
      // Obtener escenas para calcular progreso más preciso
      const { data: scenes } = await supabaseAdmin
        .from('scenes')
        .select('id, scene_number, clip_status')
        .eq('movie_id', movieId)
        .order('scene_number', { ascending: true })
      
      const totalScenes = scenes?.length || 0
      const completedScenes = scenes?.filter(s => s.clip_status === 'completed').length || 0
      
      // Calcular progreso basado en estado y escenas
      // IMPORTANTE: Si movie.progress existe, usarlo directamente (viene del pipeline y es la fuente de verdad)
      let calculatedProgress = movie.progress ?? statusInfo.progress
      
      // PRIORIDAD 1: Si el progreso viene de la película, usarlo (es más preciso y actualizado)
      if (typeof movie.progress === 'number' && movie.progress >= 0) {
        calculatedProgress = movie.progress
      } 
      // PRIORIDAD 2: Si está completado, forzar 100%
      else if (movie.status === 'completed') {
        calculatedProgress = 100
      }
      // PRIORIDAD 3: Calcular basado en escenas si está generando videos
      else if (movie.status === 'video_generating' && totalScenes > 0) {
        calculatedProgress = 20 + Math.floor((completedScenes / totalScenes) * 50)
      }
      
      // Asegurar que el progreso esté entre 0-100
      calculatedProgress = Math.max(0, Math.min(100, calculatedProgress))
      
      // Determinar el paso actual basado en el progreso si es processing
      if (movie.status === 'processing' && calculatedProgress > 0) {
        if (calculatedProgress >= 90) {
          currentStep = 'finalize'
          currentStepDetail = 'Finalizando...'
        } else if (calculatedProgress >= 80) {
          currentStep = 'assemble_movie'
          currentStepDetail = 'Ensamblando película...'
        } else if (calculatedProgress >= 70) {
          currentStep = 'generate_cover'
          currentStepDetail = 'Generando portada...'
        } else if (calculatedProgress >= 50) {
          currentStep = 'generate_music'
          currentStepDetail = 'Generando música...'
        } else if (calculatedProgress >= 40) {
          currentStep = 'apply_lip_sync'
          currentStepDetail = 'Sincronizando labios...'
        } else if (calculatedProgress >= 25) {
          currentStep = 'generate_audio'
          currentStepDetail = 'Generando audio...'
        } else if (calculatedProgress >= 15) {
          currentStep = 'generate_videos'
          currentStepDetail = 'Generando videos...'
        } else if (calculatedProgress >= 8) {
          currentStep = 'assign_characters'
          currentStepDetail = 'Asignando personajes...'
        } else if (calculatedProgress >= 5) {
          currentStep = 'generate_screenplay'
          currentStepDetail = 'Generando guión...'
        } else if (calculatedProgress >= 2) {
          currentStep = 'research_locations'
          currentStepDetail = 'Investigando ubicaciones...'
        }
      }
      
      progress = {
        movie_id: movieId,
        overall_status: movie.status === 'completed' ? 'completed' : (movie.status === 'failed' ? 'failed' : 'processing'),
        overall_progress: calculatedProgress,
        current_step: currentStep,
        current_step_detail: currentStepDetail,
        steps: {
          [currentStep]: {
            status: movie.status === 'completed' ? 'completed' : (movie.status === 'failed' ? 'failed' : 'running'),
            progress: calculatedProgress,
            detail: currentStepDetail,
            updated_at: new Date().toISOString()
          }
        },
        stats: {
          total_scenes: totalScenes,
          scenes_completed: completedScenes,
          estimated_time_remaining: 0,
          started_at: movie.created_at,
          elapsed_time: 0
        },
        errors: movie.error_message ? [movie.error_message] : []
      }
    }
    
    // Calcular tiempo transcurrido
    let elapsedTime = 0
    if (progress.started_at || movie.created_at) {
      const start = new Date(progress.started_at || movie.created_at)
      const now = new Date()
      elapsedTime = Math.floor((now.getTime() - start.getTime()) / 1000)
    }
    
    return NextResponse.json({
      success: true,
      movie,
      progress: {
        ...progress,
        stats: {
          ...(progress.stats || {}),
          elapsed_time: elapsedTime
        }
      }
    })
    
  } catch (error: any) {
    console.error('Error getting progress:', error)
    return NextResponse.json(
      { error: error.message || 'Error al obtener progreso' },
      { status: 500 }
    )
  }
}

