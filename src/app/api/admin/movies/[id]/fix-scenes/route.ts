import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/admin'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    const resolvedParams = params instanceof Promise ? await params : params
    const movieId = resolvedParams.id

    // Obtener todas las escenas de movie_scenes para esta película
    const { data: movieScenes, error: fetchError } = await supabaseAdmin
      .from('movie_scenes')
      .select('id, scene_number, video_url, status')
      .eq('movie_id', movieId)

    if (fetchError) {
      return NextResponse.json(
        { error: 'Error al obtener escenas', details: fetchError.message },
        { status: 500 }
      )
    }

    if (!movieScenes || movieScenes.length === 0) {
      return NextResponse.json(
        { message: 'No se encontraron escenas en movie_scenes', updated: 0 }
      )
    }

    // Buscar escenas con video_url pero status != 'completed'
    const scenesToFix = movieScenes.filter(
      (scene) => {
        const hasVideo = scene.video_url && scene.video_url.trim() !== '' && scene.video_url !== 'null' && scene.video_url !== 'undefined'
        const isNotCompleted = scene.status !== 'completed'
        return hasVideo && isNotCompleted
      }
    )

    console.log('[FIX SCENES] Total scenes:', movieScenes.length)
    console.log('[FIX SCENES] Scenes to fix:', scenesToFix.length)
    console.log('[FIX SCENES] Scenes details:', movieScenes.map(s => ({
      scene_number: s.scene_number,
      has_video: !!(s.video_url && s.video_url.trim() !== ''),
      video_url_preview: s.video_url ? s.video_url.substring(0, 50) + '...' : 'NULL',
      status: s.status
    })))

    if (scenesToFix.length === 0) {
      return NextResponse.json({
        message: 'Todas las escenas ya están correctamente marcadas o no tienen video_url',
        updated: 0,
        debug: {
          total_scenes: movieScenes.length,
          scenes_with_video: movieScenes.filter(s => s.video_url && s.video_url.trim() !== '').length,
          scenes_completed: movieScenes.filter(s => s.status === 'completed').length,
          scenes_pending: movieScenes.filter(s => s.status === 'pending' || !s.status).length,
          scenes_details: movieScenes.map(s => ({
            scene_number: s.scene_number,
            has_video: !!(s.video_url && s.video_url.trim() !== ''),
            status: s.status
          }))
        }
      })
    }

    // Actualizar escenas
    let updatedCount = 0
    const errors: string[] = []

    for (const scene of scenesToFix) {
      const { error: updateError } = await supabaseAdmin
        .from('movie_scenes')
        .update({ 
          status: 'completed',
          updated_at: new Date().toISOString()
        })
        .eq('id', scene.id)

      if (updateError) {
        errors.push(`Escena ${scene.scene_number}: ${updateError.message}`)
      } else {
        updatedCount++
      }
    }

    return NextResponse.json({
      success: true,
      message: `Se actualizaron ${updatedCount} escena(s)`,
      updated: updatedCount,
      errors: errors.length > 0 ? errors : undefined,
      scenesFixed: scenesToFix.map((s) => ({
        scene_number: s.scene_number,
        video_url: s.video_url ? 'EXISTS' : 'NULL',
        old_status: s.status,
        new_status: 'completed'
      }))
    })
  } catch (error: any) {
    console.error('[API] Error fixing scenes:', error)
    return NextResponse.json(
      { error: 'Error interno del servidor', details: error.message },
      { status: 500 }
    )
  }
}
