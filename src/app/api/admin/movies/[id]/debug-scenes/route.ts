import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/admin'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    const resolvedParams = params instanceof Promise ? await params : params
    const movieId = resolvedParams.id

    // Obtener película
    const { data: movie, error: movieError } = await supabaseAdmin
      .from('movies')
      .select('id, title, status, video_url, poster_url, thumbnail_url')
      .eq('id', movieId)
      .maybeSingle()

    if (movieError) {
      return NextResponse.json(
        { error: 'Error al obtener película', details: movieError.message },
        { status: 500 }
      )
    }

    // Obtener escenas
    const { data: scenes, error: scenesError } = await supabaseAdmin
      .from('movie_scenes')
      .select('*')
      .eq('movie_id', movieId)
      .order('scene_number', { ascending: true })

    if (scenesError) {
      return NextResponse.json(
        { error: 'Error al obtener escenas', details: scenesError.message },
        { status: 500 }
      )
    }

    return NextResponse.json({
      movie: {
        id: movie?.id,
        title: movie?.title,
        status: movie?.status,
        has_video_url: !!(movie?.video_url),
        has_poster_url: !!(movie?.poster_url),
        has_thumbnail_url: !!(movie?.thumbnail_url),
        video_url_preview: movie?.video_url ? movie.video_url.substring(0, 100) + '...' : null,
        poster_url_preview: movie?.poster_url ? movie.poster_url.substring(0, 100) + '...' : null,
      },
      scenes: scenes?.map(s => ({
        id: s.id,
        scene_number: s.scene_number,
        status: s.status,
        has_video_url: !!(s.video_url),
        video_url_length: s.video_url ? s.video_url.length : 0,
        video_url_preview: s.video_url ? s.video_url.substring(0, 100) + '...' : null,
        video_url_status: s.video_url === null ? 'NULL' : 
                         s.video_url === '' ? 'EMPTY' : 
                         s.video_url === 'null' ? 'STRING_NULL' :
                         s.video_url === 'undefined' ? 'STRING_UNDEFINED' : 'HAS_VALUE',
        created_at: s.created_at,
        updated_at: s.updated_at
      })) || [],
      summary: {
        total_scenes: scenes?.length || 0,
        scenes_with_video: scenes?.filter(s => s.video_url && s.video_url.trim() !== '').length || 0,
        scenes_completed: scenes?.filter(s => s.status === 'completed').length || 0,
        scenes_pending: scenes?.filter(s => s.status === 'pending' || !s.status).length || 0,
      }
    })
  } catch (error: any) {
    console.error('[DEBUG] Error:', error)
    return NextResponse.json(
      { error: 'Error interno del servidor', details: error.message },
      { status: 500 }
    )
  }
}
