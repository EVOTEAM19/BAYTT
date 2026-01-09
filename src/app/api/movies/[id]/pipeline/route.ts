import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { MovieGenerationPipeline } from '@/lib/movie-generation/pipeline'

// Este endpoint puede tardar mucho - configurar timeout alto
export const maxDuration = 300 // 5 minutos máximo por request

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  // Manejar params como Promise (Next.js 15) o objeto directo (Next.js 14)
  const resolvedParams = await Promise.resolve(params)
  const movieId = resolvedParams.id
  
  console.log(`[PIPELINE API] Received request for movie: ${movieId}`)
  
  // Verificar token interno (seguridad)
  const internalToken = request.headers.get('x-internal-token') || request.headers.get('X-Internal-Token')
  const expectedToken = process.env.INTERNAL_API_TOKEN || 'internal-secret'
  
  if (internalToken !== expectedToken) {
    console.error('[PIPELINE API] Invalid internal token')
    // En desarrollo, permitir sin token si no está configurado
    if (process.env.NODE_ENV === 'production' || process.env.INTERNAL_API_TOKEN) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    console.warn('[PIPELINE API] Token validation skipped in development')
  }
  
  try {
    // Usar supabaseAdmin para operaciones de base de datos
    const { data: movie, error } = await supabaseAdmin
      .from('movies')
      .select('*')
      .eq('id', movieId)
      .single()
    
    if (error || !movie) {
      console.error('[PIPELINE API] Movie not found:', movieId, error)
      return NextResponse.json({ error: 'Movie not found' }, { status: 404 })
    }
    
    console.log(`[PIPELINE API] Movie found: ${movie.title} (status: ${movie.status})`)
    
    // Verificar que no esté ya completada
    if (movie.status === 'completed') {
      console.warn(`[PIPELINE API] Movie already completed: ${movieId}`)
      return NextResponse.json({ 
        error: 'Movie already completed',
        message: 'This movie has already been generated'
      }, { status: 400 })
    }
    
    // Actualizar el progreso ANTES de empezar
    try {
      await supabaseAdmin
        .from('movies')
        .update({
          status: 'processing',
          progress: 0
        })
        .eq('id', movieId)
      
      // Intentar crear/marcar progreso inicial
      await supabaseAdmin
        .from('movie_creation_progress')
        .upsert({
          movie_id: movieId,
          overall_status: 'processing',
          overall_progress: 0,
          current_step: 'validate_providers',
          current_step_detail: 'Iniciando validación de proveedores...',
          steps: {
            validate_providers: { status: 'running', progress: 0, detail: 'Validando proveedores...', updated_at: new Date().toISOString() }
          },
          stats: {
            total_scenes: 0,
            scenes_completed: 0,
            started_at: new Date().toISOString(),
            elapsed_time: 0
          },
          errors: []
        }, {
          onConflict: 'movie_id'
        })
        .then(() => {
          console.log('[PIPELINE API] Initial progress record created/updated')
        })
        .catch((e) => {
          console.warn('[PIPELINE API] Could not create progress record (table may not exist):', e)
        })
    } catch (e) {
      console.warn('[PIPELINE API] Could not update initial status:', e)
    }
    
    // Crear instancia del pipeline
    console.log('[PIPELINE API] Creating pipeline instance...')
    const pipeline = new MovieGenerationPipeline(movieId, supabaseAdmin)
    
    // IMPORTANTE: Ejecutar el pipeline de forma que continúe
    // Usamos setImmediate para asegurar que se ejecute después de responder
    const pipelinePromise = pipeline.execute().then(() => {
      console.log(`[PIPELINE API] ✅ Pipeline completed successfully for movie: ${movieId}`)
    }).catch(async (err) => {
      console.error(`[PIPELINE API] Pipeline failed for movie ${movieId}:`, err)
      
      // Actualizar estado a failed
      await supabaseAdmin
        .from('movies')
        .update({
          status: 'failed',
          error_message: err.message || 'Unknown error'
        })
        .eq('id', movieId)
        .then(() => {
          console.log(`[PIPELINE API] Movie ${movieId} marked as failed`)
        })
        .catch((updateErr) => {
          console.error(`[PIPELINE API] Failed to update movie status:`, updateErr)
        })
      
      // Actualizar progreso con error
      try {
        const { data: progressData } = await supabaseAdmin
          .from('movie_creation_progress')
          .select('*')
          .eq('movie_id', movieId)
          .single()
        
        if (progressData) {
          const errors = [...(progressData.errors || [])]
          errors.push({
            step: progressData.current_step || 'unknown',
            message: err.message || 'Unknown error',
            timestamp: new Date().toISOString(),
            recoverable: false
          })
          
          await supabaseAdmin
            .from('movie_creation_progress')
            .update({
              overall_status: 'failed',
              errors,
              current_step_detail: `Error: ${err.message || 'Unknown error'}`
            })
            .eq('movie_id', movieId)
        }
      } catch (progressErr) {
        console.error('[PIPELINE API] Failed to update progress:', progressErr)
      }
    })
    
    // Ejecutar el pipeline de forma asíncrona pero asegurar que se inicie
    // Usar setImmediate para que se ejecute después de responder pero inmediatamente
    setImmediate(async () => {
      try {
        await pipelinePromise
      } catch (err) {
        console.error(`[PIPELINE API] Unhandled pipeline error:`, err);
      }
    });
    
    console.log(`[PIPELINE API] Pipeline started successfully for movie: ${movieId}`)
    
    // Responder inmediatamente
    return NextResponse.json({
      success: true,
      message: 'Pipeline started',
      movie_id: movieId
    })
    
  } catch (error: any) {
    console.error('[PIPELINE API] Error:', error)
    return NextResponse.json({
      error: error.message || 'Internal server error',
      code: 'PIPELINE_START_ERROR'
    }, { status: 500 })
  }
}
