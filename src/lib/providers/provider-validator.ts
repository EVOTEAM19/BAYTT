import { createServerSupabaseClient } from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { ProviderValidation } from '@/types/movie-creation'

// ============================================
// PROVEEDORES REQUERIDOS PARA CREAR PELÍCULA
// ============================================

const REQUIRED_PROVIDERS = [
  {
    type: 'llm',
    name: 'LLM (Guionista)',
    reason: 'Necesario para generar el guión y los diálogos'
  },
  {
    type: 'video',
    name: 'Generador de Video',
    reason: 'Necesario para generar los clips de video'
  },
  {
    type: 'audio',
    name: 'Generador de Voz',
    reason: 'Necesario para generar las voces de los personajes'
  }
]

const OPTIONAL_PROVIDERS = [
  {
    type: 'lip_sync',
    name: 'Sincronización de Labios',
    reason: 'Recomendado para sincronizar los labios con el audio'
  },
  {
    type: 'music',
    name: 'Generador de Música',
    reason: 'Recomendado para la banda sonora'
  },
  {
    type: 'image',
    name: 'Generador de Imágenes',
    reason: 'Necesario para portadas y referencias visuales'
  }
]

/**
 * Valida que todos los proveedores necesarios estén configurados
 */
export async function validateProviders(): Promise<ProviderValidation> {
  // Obtener proveedores configurados y activos
  // Intentar con 'api_providers' primero, si falla, intentar con 'ai_providers'
  let providers: any[] | null = null
  let error: any = null
  
  try {
    const result = await supabaseAdmin
      .from('api_providers')
      .select('*')
      .eq('is_active', true)
    providers = result.data
    error = result.error
  } catch (e) {
    // Si falla, intentar con 'ai_providers'
    try {
      const result = await supabaseAdmin
        .from('ai_providers')
        .select('*')
        .eq('is_active', true)
      providers = result.data
      error = result.error
    } catch (e2) {
      error = e2
    }
  }
  
  if (error) {
    return {
      is_valid: false,
      missing_providers: REQUIRED_PROVIDERS.map(p => ({
        ...p,
        required: true
      })),
      configured_providers: [],
      warnings: ['Error al verificar proveedores: ' + error.message]
    }
  }
  
  const configuredTypes = new Set(providers?.map(p => p.type) || [])
  
  const missing_providers: ProviderValidation['missing_providers'] = []
  const configured_providers: ProviderValidation['configured_providers'] = []
  const warnings: string[] = []
  
  // Verificar proveedores requeridos
  for (const required of REQUIRED_PROVIDERS) {
    const provider = providers?.find(p => p.type === required.type)
    
    if (!provider) {
      missing_providers.push({
        ...required,
        required: true
      })
    } else {
      configured_providers.push({
        type: required.type,
        name: provider.name,
        status: provider.is_active ? 'active' : 'inactive'
      })
      
      // Verificar que tenga API key
      if (!provider.api_key_encrypted) {
        warnings.push(`${provider.name} no tiene API key configurada`)
      }
    }
  }
  
  // Verificar proveedores opcionales
  for (const optional of OPTIONAL_PROVIDERS) {
    const provider = providers?.find(p => p.type === optional.type)
    
    if (!provider) {
      warnings.push(`${optional.name} no configurado: ${optional.reason}`)
    } else {
      configured_providers.push({
        type: optional.type,
        name: provider.name,
        status: provider.is_active ? 'active' : 'inactive'
      })
    }
  }
  
  return {
    is_valid: missing_providers.filter(p => p.required).length === 0,
    missing_providers,
    configured_providers,
    warnings
  }
}

/**
 * Obtener estado de todos los proveedores para mostrar en UI
 */
export async function getProvidersStatus(): Promise<{
  providers: Array<{
    type: string
    type_label: string
    name: string | null
    is_configured: boolean
    is_active: boolean
    is_required: boolean
  }>
  can_create_movie: boolean
  missing_required: string[]
}> {
  // Intentar con 'api_providers' primero, si falla, intentar con 'ai_providers'
  let providers: any[] | null = null
  
  try {
    const result = await supabaseAdmin
      .from('api_providers')
      .select('*')
    providers = result.data
  } catch (e) {
    try {
      const result = await supabaseAdmin
        .from('ai_providers')
        .select('*')
      providers = result.data
    } catch (e2) {
      providers = []
    }
  }
  
  const allTypes = [
    { type: 'llm', label: 'LLM / Guionista', required: true },
    { type: 'video', label: 'Generador de Video', required: true },
    { type: 'audio', label: 'Generador de Voz', required: true },
    { type: 'lip_sync', label: 'Lip Sync', required: false },
    { type: 'music', label: 'Generador de Música', required: false },
    { type: 'image', label: 'Generador de Imágenes', required: false },
    { type: 'storage', label: 'Almacenamiento', required: false },
  ]
  
  const result = allTypes.map(t => {
    const provider = providers?.find(p => p.type === t.type && p.is_active)
    return {
      type: t.type,
      type_label: t.label,
      name: provider?.name || null,
      is_configured: !!provider,
      is_active: provider?.is_active || false,
      is_required: t.required
    }
  })
  
  const missing_required = result
    .filter(p => p.is_required && !p.is_configured)
    .map(p => p.type_label)
  
  return {
    providers: result,
    can_create_movie: missing_required.length === 0,
    missing_required
  }
}

