import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/supabase/admin'

// DELETE - Eliminar película
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  // Manejar params como Promise (Next.js 15) o objeto directo (Next.js 14)
  let movieId: string
  try {
    const resolvedParams = await Promise.resolve(params)
    movieId = resolvedParams.id
  } catch (error: any) {
    console.error('[DELETE MOVIE] Error parsing params:', error)
    return NextResponse.json(
      { error: 'ID de película inválido' },
      { status: 400 }
    )
  }

  console.log(`[DELETE MOVIE] Attempting to delete movie: ${movieId}`)

  try {
    const supabase = await createServerSupabaseClient()
    const {
      data: { user },
      error: authError
    } = await supabase.auth.getUser()

    if (authError || !user) {
      console.error('[DELETE MOVIE] Auth error:', authError)
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    console.log(`[DELETE MOVIE] User authenticated: ${user.id}`)

    // Verificar que sea admin o superadmin
    const { data: profile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (profileError) {
      console.error('[DELETE MOVIE] Profile error:', profileError)
    }

    if (!profile || (profile.role !== 'admin' && profile.role !== 'superadmin')) {
      console.warn(`[DELETE MOVIE] Unauthorized: user role is ${profile?.role}`)
      return NextResponse.json({ 
        error: 'No autorizado. Solo administradores pueden eliminar películas.' 
      }, { status: 403 })
    }

    console.log(`[DELETE MOVIE] User is ${profile.role}, proceeding with delete`)

    // Verificar que la película existe
    const { data: movie, error: movieError } = await supabaseAdmin
      .from('movies')
      .select('id, user_id, title')
      .eq('id', movieId)
      .single()

    if (movieError || !movie) {
      console.error('[DELETE MOVIE] Movie not found:', movieError)
      return NextResponse.json(
        { error: 'Película no encontrada' },
        { status: 404 }
      )
    }

    console.log(`[DELETE MOVIE] Movie found: ${movie.title}`)

    // Primero, eliminar registros relacionados (si existen)
    try {
      // Eliminar progreso de creación
      await supabaseAdmin
        .from('movie_creation_progress')
        .delete()
        .eq('movie_id', movieId)
      
      console.log('[DELETE MOVIE] Deleted movie_creation_progress records')
    } catch (progressError: any) {
      // No es crítico si no existe la tabla o no hay registros
      console.warn('[DELETE MOVIE] Could not delete progress (table may not exist):', progressError.message)
    }

    // Intentar soft delete primero (si las columnas existen)
    let deleted = false
    try {
      const { error: softDeleteError } = await supabaseAdmin
        .from('movies')
        .update({
          is_deleted: true,
          deleted_at: new Date().toISOString(),
        })
        .eq('id', movieId)

      if (!softDeleteError) {
        deleted = true
        console.log('[DELETE MOVIE] Soft delete successful')
      } else {
        console.warn('[DELETE MOVIE] Soft delete failed, trying with is_deleted only:', softDeleteError.message)
        
        // Intentar solo con is_deleted
        const { error: softDeleteError2 } = await supabaseAdmin
          .from('movies')
          .update({
            is_deleted: true,
          })
          .eq('id', movieId)

        if (!softDeleteError2) {
          deleted = true
          console.log('[DELETE MOVIE] Soft delete (is_deleted only) successful')
        } else {
          console.warn('[DELETE MOVIE] Soft delete failed completely:', softDeleteError2.message)
        }
      }
    } catch (softDeleteException: any) {
      console.warn('[DELETE MOVIE] Soft delete exception:', softDeleteException.message)
    }

    // Si el soft delete falló, hacer hard delete (eliminación real)
    if (!deleted) {
      console.log('[DELETE MOVIE] Attempting hard delete...')
      const { error: hardDeleteError } = await supabaseAdmin
        .from('movies')
        .delete()
        .eq('id', movieId)

      if (hardDeleteError) {
        console.error('[DELETE MOVIE] Hard delete error:', hardDeleteError)
        return NextResponse.json(
          { 
            error: 'Error al eliminar película', 
            details: hardDeleteError.message,
            code: hardDeleteError.code
          },
          { status: 500 }
        )
      }

      console.log('[DELETE MOVIE] Hard delete successful')
    }

    return NextResponse.json({
      success: true,
      message: 'Película eliminada correctamente',
    })
  } catch (error: any) {
    console.error('[DELETE MOVIE] Unexpected error:', error)
    console.error('[DELETE MOVIE] Error stack:', error.stack)
    return NextResponse.json(
      { 
        error: 'Error interno del servidor al eliminar película',
        details: error.message,
        code: error.code
      },
      { status: 500 }
    )
  }
}

