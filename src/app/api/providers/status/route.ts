import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { getProvidersStatus } from '@/lib/providers/provider-validator'

export async function GET(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient()
    
    // Verificar auth
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }
    
    // Obtener estado de proveedores
    const status = await getProvidersStatus()
    
    return NextResponse.json({
      success: true,
      ...status
    })
    
  } catch (error: any) {
    console.error('Error getting providers status:', error)
    return NextResponse.json(
      { error: error.message || 'Error al obtener estado de proveedores' },
      { status: 500 }
    )
  }
}

