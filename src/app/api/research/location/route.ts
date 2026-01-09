import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { generateVisualBible } from '@/lib/ai/visual-bible-generator'

export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient()
    
    // Verificar auth
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }
    
    // Verificar que sea admin
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()
    
    if (profile?.role !== 'admin' && profile?.role !== 'superadmin') {
      return NextResponse.json({ error: 'Solo administradores pueden generar biblias visuales' }, { status: 403 })
    }
    
    const body = await request.json()
    const { 
      location_name, 
      location_type, 
      specific_places, 
      time_period, 
      mood 
    } = body
    
    if (!location_name || location_name.trim().length === 0) {
      return NextResponse.json(
        { error: 'location_name es requerido' },
        { status: 400 }
      )
    }
    
    // Generar biblia visual
    const bible = await generateVisualBible({
      location_name: location_name.trim(),
      location_type: location_type || 'city',
      specific_places,
      time_period,
      mood
    })
    
    // Guardar en base de datos
    const { data, error } = await supabaseAdmin
      .from('visual_bibles')
      .insert({
        location_name: bible.location_name,
        location_type: location_type || 'city',
        content: bible as any,
        reference_images: bible.reference_images as any,
        created_by: user.id
      })
      .select()
      .single()
    
    if (error) {
      console.error('Error saving visual bible:', error)
      // Si es error de duplicado, actualizar en lugar de crear
      if (error.code === '23505') {
        const { data: updated } = await supabaseAdmin
          .from('visual_bibles')
          .update({
            content: bible as any,
            reference_images: bible.reference_images as any,
            updated_at: new Date().toISOString()
          })
          .eq('location_name', bible.location_name)
          .select()
          .single()
        
        return NextResponse.json({
          success: true,
          bible: updated?.content || bible,
          message: 'Biblia visual actualizada'
        })
      }
      throw error
    }
    
    return NextResponse.json({
      success: true,
      bible: data?.content || bible,
      message: 'Biblia visual generada exitosamente'
    })
    
  } catch (error: any) {
    console.error('Error generating visual bible:', error)
    return NextResponse.json(
      { error: error.message || 'Error al investigar ubicación' },
      { status: 500 }
    )
  }
}

// GET - Obtener biblia visual existente
export async function GET(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient()
    
    // Verificar auth
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }
    
    const searchParams = request.nextUrl.searchParams
    const locationName = searchParams.get('location_name')
    
    if (!locationName) {
      return NextResponse.json(
        { error: 'location_name es requerido' },
        { status: 400 }
      )
    }
    
    // Buscar biblia existente
    const { data, error } = await supabaseAdmin
      .from('visual_bibles')
      .select('*')
      .eq('location_name', locationName)
      .maybeSingle()
    
    if (error) {
      throw error
    }
    
    if (!data) {
      return NextResponse.json(
        { error: 'Biblia visual no encontrada' },
        { status: 404 }
      )
    }
    
    return NextResponse.json({
      success: true,
      bible: data.content
    })
    
  } catch (error: any) {
    console.error('Error fetching visual bible:', error)
    return NextResponse.json(
      { error: error.message || 'Error al obtener biblia visual' },
      { status: 500 }
    )
  }
}

