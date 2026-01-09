import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { getAIConfig, getProviderWithKey } from '@/lib/ai/config'

// Endpoint de prueba para verificar configuración de proveedores
export async function GET(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient()
    
    // Verificar auth
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    // Verificar que sea admin
    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (profile?.role !== 'admin' && profile?.role !== 'superadmin') {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
    }

    // Obtener configuración
    const config = await getAIConfig()
    
    // Obtener detalles de cada proveedor
    const providerDetails: any = {}
    
    if (config.llmProvider) {
      const withKey = await getProviderWithKey(config.llmProvider.id)
      providerDetails.llm = {
        id: config.llmProvider.id,
        name: config.llmProvider.name,
        slug: config.llmProvider.slug,
        hasApiKey: !!withKey?.apiKey,
        apiKeyLength: withKey?.apiKey?.length || 0,
        apiUrl: config.llmProvider.api_url
      }
    }
    
    if (config.imageProvider) {
      const withKey = await getProviderWithKey(config.imageProvider.id)
      providerDetails.image = {
        id: config.imageProvider.id,
        name: config.imageProvider.name,
        slug: config.imageProvider.slug,
        hasApiKey: !!withKey?.apiKey,
        apiKeyLength: withKey?.apiKey?.length || 0,
        apiKeyPreview: withKey?.apiKey ? `${withKey.apiKey.substring(0, 20)}...` : null,
        apiUrl: config.imageProvider.api_url
      }
    }
    
    if (config.videoProvider) {
      const withKey = await getProviderWithKey(config.videoProvider.id)
      providerDetails.video = {
        id: config.videoProvider.id,
        name: config.videoProvider.name,
        slug: config.videoProvider.slug,
        hasApiKey: !!withKey?.apiKey,
        apiKeyLength: withKey?.apiKey?.length || 0,
        apiUrl: config.videoProvider.api_url
      }
    }
    
    if (config.audioProvider) {
      const withKey = await getProviderWithKey(config.audioProvider.id)
      providerDetails.audio = {
        id: config.audioProvider.id,
        name: config.audioProvider.name,
        slug: config.audioProvider.slug,
        hasApiKey: !!withKey?.apiKey,
        apiKeyLength: withKey?.apiKey?.length || 0,
        apiUrl: config.audioProvider.api_url
      }
    }

    // Obtener configuración de admin_config
    const { data: adminConfigs } = await supabaseAdmin
      .from('admin_config')
      .select('key, value')
      .in('key', ['global_mock_mode', 'mock_mode', 'llm_config', 'image_config', 'video_config', 'audio_config'])

    return NextResponse.json({
      success: true,
      mockMode: config.mockMode,
      providers: providerDetails,
      adminConfig: adminConfigs?.reduce((acc: any, item: any) => {
        acc[item.key] = item.value
        return acc
      }, {})
    })
  } catch (error: any) {
    console.error('[TEST PROVIDERS] Error:', error)
    return NextResponse.json(
      { error: error.message || 'Error al obtener configuración' },
      { status: 500 }
    )
  }
}
