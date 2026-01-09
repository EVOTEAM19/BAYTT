// API endpoint para corregir la URL de Runway en la base de datos
import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { createServerSupabaseClient } from '@/lib/supabase/server'

export async function POST(request: NextRequest) {
  try {
    // Verificar autenticación
    try {
      const supabase = await createServerSupabaseClient()
      const { data: { user } } = await supabase.auth.getUser()

      if (user) {
        // Si hay usuario, verificar rol
        const { data: profile } = await supabaseAdmin
          .from('profiles')
          .select('role')
          .eq('id', user.id)
          .maybeSingle()

        if (profile?.role !== 'admin' && profile?.role !== 'superadmin') {
          return NextResponse.json(
            { error: 'No autorizado - Se requiere rol admin' },
            { status: 403 }
          )
        }
      }
    } catch (authError) {
      // Si falla la autenticación, continuar (por si se llama desde script)
      console.log('⚠️ No se pudo verificar autenticación, continuando...')
    }

    console.log('🔧 Corrigiendo URL de Runway en la base de datos...')

    // Buscar proveedor de Runway
    const { data: providers, error: fetchError } = await supabaseAdmin
      .from('api_providers')
      .select('*')
      .eq('slug', 'runway')
      .eq('type', 'video')

    if (fetchError) {
      console.error('❌ Error buscando proveedor:', fetchError.message)
      return NextResponse.json(
        { error: 'Error buscando proveedor', details: fetchError.message },
        { status: 500 }
      )
    }

    if (!providers || providers.length === 0) {
      return NextResponse.json(
        { error: 'No se encontró proveedor de Runway' },
        { status: 404 }
      )
    }

    const results = []

    for (const provider of providers) {
      console.log(`📋 Proveedor encontrado: ${provider.name}`)
      console.log(`   URL actual: ${provider.api_url}`)

      let newUrl = provider.api_url || 'https://api.dev.runwayml.com/v1'

      // Corregir hostname si es necesario
      if (newUrl.includes('api.runwayml.com') && !newUrl.includes('api.dev.runwayml.com')) {
        newUrl = newUrl.replace('api.runwayml.com', 'api.dev.runwayml.com')
      }

      // Si tiene un path específico (como /image-to-video), mantener solo la base
      if (newUrl.includes('/image-to-video') || newUrl.includes('/image_to_video') || 
          newUrl.includes('/text-to-video') || newUrl.includes('/text_to_video') ||
          newUrl.includes('/generate')) {
        const urlParts = newUrl.split('/')
        const baseParts = urlParts.slice(0, urlParts.length - 1)
        newUrl = baseParts.join('/')
      }

      // Asegurar que termine en /v1
      if (!newUrl.includes('/v1')) {
        newUrl = newUrl.replace(/\/$/, '') + '/v1'
      }

      // Si la URL ya está correcta, no hacer nada
      if (newUrl === provider.api_url && newUrl.includes('api.dev.runwayml.com')) {
        results.push({
          id: provider.id,
          name: provider.name,
          status: 'already_correct',
          old_url: provider.api_url,
          new_url: newUrl
        })
        continue
      }

      // Actualizar proveedor
      const { error: updateError } = await supabaseAdmin
        .from('api_providers')
        .update({
          api_url: newUrl,
          updated_at: new Date().toISOString()
        })
        .eq('id', provider.id)

      if (updateError) {
        results.push({
          id: provider.id,
          name: provider.name,
          status: 'error',
          error: updateError.message,
          old_url: provider.api_url,
          new_url: newUrl
        })
        console.error(`❌ Error actualizando ${provider.name}:`, updateError.message)
      } else {
        results.push({
          id: provider.id,
          name: provider.name,
          status: 'updated',
          old_url: provider.api_url,
          new_url: newUrl
        })
        console.log(`✅ ${provider.name} actualizado: ${provider.api_url} → ${newUrl}`)
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Corrección completada',
      results
    })

  } catch (error: any) {
    console.error('❌ Error:', error)
    return NextResponse.json(
      { error: 'Error al corregir URL', details: error.message },
      { status: 500 }
    )
  }
}

// También permitir GET para fácil acceso desde navegador
export async function GET(request: NextRequest) {
  return POST(request)
}
