import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { MovieGenerationPipeline } from '@/lib/movie-generation/pipeline'
import { validateProviders } from '@/lib/providers/provider-validator'
import { v4 as uuidv4 } from 'uuid'

export const maxDuration = 10 // Máximo 10 segundos para este endpoint

export async function POST(request: NextRequest) {
  const startTime = Date.now()
  
  try {
    const supabase = await createServerSupabaseClient()
    
    // ==========================================
    // 1. VERIFICAR AUTENTICACIÓN
    // ==========================================
    console.log('[CREATE MOVIE] Step 1: Checking auth...')
    
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      console.error('[CREATE MOVIE] Auth failed:', authError)
      return NextResponse.json(
        { error: 'No autorizado', code: 'AUTH_ERROR' },
        { status: 401 }
      )
    }
    
    console.log('[CREATE MOVIE] Auth OK, user:', user.id)
    
    // ==========================================
    // 2. VALIDAR PROVEEDORES ANTES DE CREAR
    // ==========================================
    console.log('[CREATE MOVIE] Step 2: Validating providers...')
    
    const providerValidation = await validateProviders()
    
    if (!providerValidation.is_valid) {
      console.error('[CREATE MOVIE] Provider validation failed:', providerValidation.missing_providers)
      return NextResponse.json({
        error: 'Proveedores no configurados',
        code: 'PROVIDERS_MISSING',
        details: providerValidation.warnings,
        missing: providerValidation.missing_providers.map(p => p.name)
      }, { status: 400 })
    }
    
    console.log('[CREATE MOVIE] Providers OK:', providerValidation.configured_providers.map(p => p.name))
    
    // ==========================================
    // 3. PARSEAR Y VALIDAR BODY
    // ==========================================
    console.log('[CREATE MOVIE] Step 3: Parsing body...')
    
    let body
    try {
      body = await request.json()
    } catch (e) {
      return NextResponse.json(
        { error: 'JSON inválido', code: 'INVALID_JSON' },
        { status: 400 }
      )
    }
    
    const { title, prompt, genre, target_duration_minutes, character_selection, description, user_prompt } = body
    
    // Usar user_prompt si existe, sino prompt
    const finalPrompt = user_prompt || prompt
    
    // Validaciones básicas
    if (!title || title.trim().length < 3) {
      return NextResponse.json(
        { error: 'Título debe tener al menos 3 caracteres', code: 'INVALID_TITLE' },
        { status: 400 }
      )
    }
    
    if (!finalPrompt || finalPrompt.trim().length < 20) {
      return NextResponse.json(
        { error: 'Prompt debe tener al menos 20 caracteres', code: 'INVALID_PROMPT' },
        { status: 400 }
      )
    }
    
    console.log('[CREATE MOVIE] Body OK, title:', title)
    
    // ==========================================
    // 4. CREAR PELÍCULA EN DB (status: processing)
    // ==========================================
    console.log('[CREATE MOVIE] Step 4: Creating movie in DB...')
    
    const movieId = uuidv4()
    const slug = `${title.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-${movieId.slice(0, 8)}`
    
    // Preparar datos de la película
    // Convertir duración a número y asegurar que sea válido
    let durationValue: number = target_duration_minutes || 20/60
    if (typeof durationValue === 'string') {
      durationValue = parseFloat(durationValue)
    }
    if (isNaN(durationValue)) {
      durationValue = 20/60 // Fallback a 20 segundos
    }
    // Asegurar mínimo de 20 segundos (0.33 minutos)
    durationValue = Math.max(20/60, durationValue)
    // Redondear a 2 decimales para evitar problemas de precisión
    durationValue = Math.round(durationValue * 100) / 100
    
    console.log('[CREATE MOVIE] Duration value:', durationValue, typeof durationValue)
    
    const movieData: any = {
      id: movieId,
      title: title.trim(),
      user_prompt: finalPrompt.trim(),
      description: description || null,
      genre: genre || 'drama',
      duration_minutes: durationValue, // Enviar como número decimal
      status: 'processing', // ⚠️ IMPORTANTE: Empieza en processing
      progress: 0,
      user_id: user.id,
      is_published: false,
      rental_price: 0,
      views_count: 0,
      rentals_count: 0,
      average_rating: 0,
    }
    
    // Intentar añadir slug solo si la columna existe
    try {
      const testQuery = await supabaseAdmin
        .from('movies')
        .select('slug')
        .limit(1)
      
      if (!testQuery.error) {
        movieData.slug = slug
      }
    } catch (e) {
      console.warn('[CREATE MOVIE] Slug column may not exist, skipping...')
    }
    
    const { data: movie, error: movieError } = await supabaseAdmin
      .from('movies')
      .insert(movieData)
      .select()
      .single()
    
    if (movieError) {
      console.error('[CREATE MOVIE] DB insert error:', movieError)
      
      let errorMessage = movieError.message || 'Error al crear película en DB'
      if (movieError.code === 'PGRST204') {
        errorMessage = `Columna no encontrada: ${movieError.details || 'desconocida'}. Ejecuta la migración SQL.`
      } else if (movieError.code === '23505') {
        errorMessage = 'Ya existe una película con ese slug. Intenta de nuevo.'
      } else if (movieError.code === '23502') {
        errorMessage = `Campo requerido faltante: ${movieError.column || 'desconocido'}`
      }
      
      return NextResponse.json(
        { 
          error: errorMessage, 
          code: 'DB_ERROR', 
          details: movieError.message,
          hint: 'Verifica que todas las columnas requeridas existan en la tabla movies.'
        },
        { status: 500 }
      )
    }
    
    console.log('[CREATE MOVIE] Movie created:', movieId)
    
    // ==========================================
    // 5. CREAR REGISTRO DE PROGRESO
    // ==========================================
    console.log('[CREATE MOVIE] Step 5: Creating progress record...')
    
    try {
      const { error: progressError } = await supabaseAdmin
        .from('movie_creation_progress')
        .insert({
          movie_id: movieId,
          overall_status: 'processing',
          overall_progress: 0,
          current_step: 'validate_providers',
          current_step_detail: 'Validando proveedores...',
          steps: {
            validate_providers: { status: 'running', progress: 0, detail: 'Validando proveedores...', updated_at: new Date().toISOString() },
            research_locations: { status: 'pending', progress: 0 },
            generate_screenplay: { status: 'pending', progress: 0 },
            assign_characters: { status: 'pending', progress: 0 },
            generate_videos: { status: 'pending', progress: 0 },
            generate_audio: { status: 'pending', progress: 0 },
            apply_lip_sync: { status: 'pending', progress: 0 },
            generate_music: { status: 'pending', progress: 0 },
            assemble_movie: { status: 'pending', progress: 0 },
            generate_cover: { status: 'pending', progress: 0 },
            finalize: { status: 'pending', progress: 0 }
          },
          stats: {
            total_scenes: 0,
            scenes_completed: 0,
            estimated_time_remaining: 0,
            started_at: new Date().toISOString(),
            elapsed_time: 0
          },
          errors: []
        })
      
      if (progressError) {
        // Si el error es que la tabla no existe, solo loguear y continuar
        if (progressError.code === 'PGRST205' || progressError.message?.includes('not found') || progressError.message?.includes('schema cache')) {
          console.warn('[CREATE MOVIE] ⚠️ Progress table doesn\'t exist. Progress will be calculated from movie status.')
          console.warn('[CREATE MOVIE] Hint: Run the migration: supabase-migrations/create-movie-creation-progress.sql')
        } else {
          console.error('[CREATE MOVIE] Progress record error:', progressError)
        }
        // No fallar, solo loguear
      } else {
        console.log('[CREATE MOVIE] ✅ Progress record created successfully')
      }
    } catch (e: any) {
      console.warn('[CREATE MOVIE] Progress table may not exist, skipping...', e?.message || e)
    }
    
    // ==========================================
    // 6. INICIAR PIPELINE VÍA ENDPOINT DEDICADO
    // ==========================================
    console.log('[CREATE MOVIE] Step 6: Starting pipeline via dedicated endpoint...')
    
    // Configurar URLs y token para el endpoint de pipeline
    const appBaseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
    const endpointUrl = `${appBaseUrl}/api/movies/${movieId}/pipeline`
    const token = process.env.INTERNAL_API_TOKEN || 'internal-secret'
    
    console.log(`[CREATE MOVIE] Triggering pipeline via: ${endpointUrl}`)
    
    // Crear un AbortController para timeout
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 5000) // 5 segundos timeout
    
    // Llamar al endpoint en background (no esperar respuesta)
    fetch(endpointUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Internal-Token': token
      },
      signal: controller.signal
    }).then(async (response) => {
      clearTimeout(timeoutId)
      if (response.ok) {
        const result = await response.json()
        console.log(`[CREATE MOVIE] Pipeline endpoint responded:`, result)
      } else {
        const errorText = await response.text()
        console.error(`[CREATE MOVIE] Pipeline endpoint error (${response.status}):`, errorText)
        // Si falla el endpoint, intentar ejecución directa como respaldo
        executePipelineDirectly()
      }
    }).catch((fetchErr) => {
      clearTimeout(timeoutId)
      console.error('[CREATE MOVIE] Failed to trigger pipeline endpoint:', fetchErr)
      // Si falla el fetch, intentar ejecución directa como respaldo
      executePipelineDirectly()
    })
    
    // Función de respaldo para ejecutar directamente
    async function executePipelineDirectly() {
      try {
        console.log(`[CREATE MOVIE] [DIRECT] Starting direct pipeline execution for movie: ${movieId}`)
        const pipeline = new MovieGenerationPipeline(movieId, supabaseAdmin)
        await pipeline.execute()
        console.log(`[CREATE MOVIE] [DIRECT] ✅ Pipeline completed successfully`)
      } catch (err: any) {
        console.error(`[CREATE MOVIE] [DIRECT] ❌ Pipeline failed:`, err)
        console.error(`[CREATE MOVIE] [DIRECT] Error stack:`, err?.stack)
        try {
          await supabaseAdmin
            .from('movies')
            .update({ 
              status: 'failed',
              error_message: err?.message || 'Error desconocido'
            })
            .eq('id', movieId)
          
          await supabaseAdmin
            .from('movie_creation_progress')
            .update({
              overall_status: 'failed',
              current_step_detail: `Error: ${err?.message || 'Error desconocido'}`,
              updated_at: new Date().toISOString()
            })
            .eq('movie_id', movieId)
        } catch (updateErr) {
          console.error(`[CREATE MOVIE] [DIRECT] Failed to update error status:`, updateErr)
        }
      }
    }
    
    console.log('[CREATE MOVIE] Pipeline trigger sent')
    
    // ==========================================
    // 7. RESPONDER INMEDIATAMENTE
    // ==========================================
    const elapsed = Date.now() - startTime
    console.log(`[CREATE MOVIE] Complete in ${elapsed}ms, returning movie_id:`, movieId)
    
    return NextResponse.json({
      success: true,
      movie: {
        id: movieId,
        title: movie.title,
        slug: movie.slug || slug,
        status: 'processing'
      },
      message: 'Película creada. La generación ha comenzado.',
      redirect_to: `/admin/movies/${movieId}/progress`
    }, { status: 201 })
    
  } catch (error: any) {
    console.error('[CREATE MOVIE] Unexpected error:', error)
    return NextResponse.json({
      error: 'Error interno del servidor',
      code: 'INTERNAL_ERROR',
      details: error.message
    }, { status: 500 })
  }
}
