import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { MovieGenerationPipeline } from '@/lib/movie-generation/pipeline'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  // Manejar params como Promise (Next.js 15) o objeto directo (Next.js 14)
  const resolvedParams = await Promise.resolve(params)
  const movieId = resolvedParams.id
  
  console.log(`[PIPELINE GENERATE] Iniciando pipeline para película ${movieId}`)
  
  try {
    // Verificar token interno (opcional, para seguridad)
    const internalToken = request.headers.get('X-Internal-Token')
    if (process.env.INTERNAL_API_TOKEN && internalToken !== process.env.INTERNAL_API_TOKEN) {
      console.warn(`[PIPELINE GENERATE] Token inválido o faltante`)
      // En desarrollo, permitir sin token si no está configurado
      if (process.env.NODE_ENV === 'production') {
        return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
      }
    }
    
    // Obtener película
    const { data: movie, error } = await supabaseAdmin
      .from('movies')
      .select('*')
      .eq('id', movieId)
      .single()
    
    if (error || !movie) {
      console.error(`[PIPELINE GENERATE] Película no encontrada:`, error)
      return NextResponse.json({ error: 'Película no encontrada' }, { status: 404 })
    }
    
    console.log(`[PIPELINE GENERATE] Película encontrada: ${movie.title} (status: ${movie.status})`)
    
    // Verificar que no esté ya en proceso
    if (movie.status === 'completed') {
      console.warn(`[PIPELINE GENERATE] Película ya completada`)
      return NextResponse.json({ error: 'Película ya completada' }, { status: 400 })
    }
    
    // Crear instancia del pipeline
    const pipeline = new MovieGenerationPipeline(movieId, supabaseAdmin)
    
    // Ejecutar pipeline (esto puede tomar mucho tiempo, así que lo hacemos en background)
    // En producción, esto debería ser una cola de trabajos
    console.log(`[PIPELINE GENERATE] Ejecutando pipeline en background...`)
    pipeline.execute().catch(error => {
      console.error('[PIPELINE GENERATE] Pipeline execution error:', error)
      // Actualizar estado a failed
      supabaseAdmin
        .from('movies')
        .update({ status: 'failed' })
        .eq('id', movieId)
        .then(() => {
          console.log(`[PIPELINE GENERATE] Película ${movieId} marcada como failed`)
        })
    })
    
    console.log(`[PIPELINE GENERATE] Pipeline iniciado correctamente`)
    return NextResponse.json({ 
      success: true,
      message: 'Pipeline iniciado'
    })
    
  } catch (error: any) {
    console.error('Pipeline error:', error)
    
    // Actualizar estado a failed
    await supabaseAdmin
      .from('movies')
      .update({ 
        status: 'failed'
      })
      .eq('id', movieId)
    
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

