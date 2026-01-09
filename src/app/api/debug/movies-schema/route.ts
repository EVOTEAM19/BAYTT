import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/admin'

/**
 * Endpoint de diagnóstico para verificar la estructura de la tabla movies
 * Solo para desarrollo/debugging
 */
export async function GET(request: NextRequest) {
  try {
    // Intentar obtener información de la tabla
    const { data: sample, error: sampleError } = await supabaseAdmin
      .from('movies')
      .select('*')
      .limit(1)
    
    // Intentar obtener el schema
    const { data: columns, error: columnsError } = await supabaseAdmin.rpc(
      'get_table_columns',
      { table_name: 'movies' }
    ).catch(() => ({ data: null, error: { message: 'RPC function not available' } }))
    
    return NextResponse.json({
      success: true,
      sample: sampleError ? { error: sampleError.message } : sample,
      columns: columnsError ? { error: columnsError.message } : columns,
      hint: 'Verifica que la tabla movies exista y tenga las columnas requeridas'
    })
  } catch (error: any) {
    return NextResponse.json({
      success: false,
      error: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    }, { status: 500 })
  }
}

