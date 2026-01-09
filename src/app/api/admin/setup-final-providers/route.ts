import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { encryptApiKey } from '@/lib/encryption/api-keys'

export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient()
    
    // Verificar autenticación
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }
    
    // Verificar rol admin
    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()
    
    if (profile?.role !== 'admin' && profile?.role !== 'superadmin') {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
    }
    
    // Primero, desactivar TODOS los proveedores existentes
    const { data: allProviders } = await supabaseAdmin
      .from('api_providers')
      .select('id')
    
    if (allProviders && allProviders.length > 0) {
      const ids = allProviders.map(p => p.id)
      for (const id of ids) {
        await supabaseAdmin
          .from('api_providers')
          .update({ is_active: false, is_default: false })
          .eq('id', id)
      }
    }
    
    // Proveedores a configurar
    const providers = [
      // FAL.AI FLUX - Imágenes
      {
        type: 'image' as const,
        name: 'FAL.AI FLUX',
        slug: 'fal_flux',
        api_url: 'https://fal.run/fal-ai/flux/dev',
        auth_method: 'api_key' as const,
        api_key: process.env.FAL_API_KEY || '',
        config: {
          model: 'flux-dev',
          width: 1024,
          height: 1024,
          steps: 28,
          guidance_scale: 3.5
        },
        is_active: true,
        is_default: true,
        priority: 0,
        cost_per_second: null,
        cost_per_request: 0.05,
      },
      // FAL.AI FLUX - LoRA Training
      {
        type: 'lora_training' as const,
        name: 'FAL.AI FLUX LoRA',
        slug: 'fal_flux_lora',
        api_url: 'https://fal.run/fal-ai/flux-lora-fast-training',
        auth_method: 'api_key' as const,
        api_key: process.env.FAL_API_KEY || '',
        config: {
          steps: 1000,
          create_masks: true,
          is_style: false,
        },
        is_active: true,
        is_default: true,
        priority: 0,
        cost_per_second: null,
        cost_per_request: 2.0,
      },
      // Runway - Video
      {
        type: 'video' as const,
        name: 'Runway Gen-3 Alpha',
        slug: 'runway',
        api_url: 'https://api.runwayml.com/v1/image-to-video',
        auth_method: 'api_key' as const,
        api_key: process.env.RUNWAY_API_KEY || '',
        config: {
          model: 'gen3a_turbo',
          aspect_ratio: '16:9',
          duration: 5,
          watermark: false,
        },
        is_active: true,
        is_default: true,
        priority: 0,
        cost_per_second: 0.05,
        cost_per_request: null,
      },
      // OpenAI/ChatGPT - LLM/Guiones
      {
        type: 'llm' as const,
        name: 'OpenAI GPT-4 Turbo',
        slug: 'openai',
        api_url: 'https://api.openai.com/v1/chat/completions',
        auth_method: 'bearer' as const,
        api_key: process.env.OPENAI_API_KEY || '',
        config: {
          model: 'gpt-4-turbo-preview',
          temperature: 0.8,
          max_tokens: 4096,
        },
        is_active: true,
        is_default: true,
        priority: 0,
        cost_per_second: null,
        cost_per_request: 0.01,
      },
      // ElevenLabs - Audio/Voces
      {
        type: 'audio' as const,
        name: 'ElevenLabs',
        slug: 'elevenlabs',
        api_url: 'https://api.elevenlabs.io/v1/text-to-speech',
        auth_method: 'api_key' as const,
        api_key: process.env.ELEVENLABS_API_KEY || '',
        config: {
          model_id: 'eleven_multilingual_v2',
          voice_settings: {
            stability: 0.5,
            similarity_boost: 0.75,
            style: 0.5,
            use_speaker_boost: true,
          },
          output_format: 'mp3_44100_128',
        },
        is_active: true,
        is_default: true,
        priority: 0,
        cost_per_second: 0.18,
        cost_per_request: null,
      },
      // Sync Labs - Lip Sync
      {
        type: 'lip_sync' as const,
        name: 'Sync Labs',
        slug: 'sync_labs',
        api_url: 'https://api.sync.so/v2/generate',
        auth_method: 'api_key' as const,
        api_key: process.env.SYNC_LABS_API_KEY || '',
        config: {
          model: 'sync-1.6.0',
          output_format: 'mp4',
          active_speaker: true,
        },
        is_active: true,
        is_default: true,
        priority: 0,
        cost_per_second: null,
        cost_per_request: 0.10,
      },
      // Beatoven AI - Música
      {
        type: 'music' as const,
        name: 'Beatoven AI',
        slug: 'beatoven',
        api_url: 'https://www.beatoven.ai/api/v1/music/generate',
        auth_method: 'bearer' as const,
        api_key: process.env.BEATOVEN_API_KEY || '',
        config: {
          duration: 120,
          mood: 'epic',
          tempo: 'medium',
        },
        is_active: true,
        is_default: true,
        priority: 0,
        cost_per_second: null,
        cost_per_request: 0.05,
      },
      // Cloudflare R2 - Almacenamiento
      {
        type: 'storage' as const,
        name: 'Cloudflare R2',
        slug: 'cloudflare_r2',
        api_url: 'https://api.cloudflare.com/client/v4',
        auth_method: 'bearer' as const,
        api_key: process.env.CLOUDFLARE_API_KEY || '',
        config: {
          account_id: 'bbe12a0259a64824ec97d74203ff5065',
          bucket: 'baytt-media',
        },
        is_active: true,
        is_default: true,
        priority: 0,
        cost_per_second: null,
        cost_per_request: null,
      },
    ]
    
    const results = []
    
    for (const providerData of providers) {
      try {
        // Encriptar API key
        const encryptedApiKey = encryptApiKey(providerData.api_key)
        
        // Verificar si ya existe
        const { data: existing } = await supabaseAdmin
          .from('api_providers')
          .select('id')
          .eq('slug', providerData.slug)
          .maybeSingle()
        
        const providerPayload: any = {
          type: providerData.type,
          name: providerData.name,
          slug: providerData.slug,
          api_url: providerData.api_url,
          auth_method: providerData.auth_method,
          api_key_encrypted: encryptedApiKey,
          config: providerData.config,
          is_active: providerData.is_active,
          is_default: providerData.is_default,
          priority: providerData.priority,
          cost_per_second: providerData.cost_per_second,
          cost_per_request: providerData.cost_per_request,
        }
        
        if (existing) {
          // Actualizar
          const { error } = await supabaseAdmin
            .from('api_providers')
            .update(providerPayload)
            .eq('id', existing.id)
          
          if (error) throw error
          results.push({ provider: providerData.name, action: 'updated', success: true })
        } else {
          // Crear
          const { error } = await supabaseAdmin
            .from('api_providers')
            .insert(providerPayload)
          
          if (error) throw error
          results.push({ provider: providerData.name, action: 'created', success: true })
        }
      } catch (error: any) {
        console.error(`Error setting up ${providerData.name}:`, error)
        results.push({
          provider: providerData.name,
          action: 'error',
          success: false,
          error: error.message
        })
      }
    }
    
    // Configurar global_mock_mode como false
    const { data: globalMockExisting } = await supabaseAdmin
      .from('admin_config')
      .select('id')
      .eq('key', 'global_mock_mode')
      .maybeSingle()
    
    if (globalMockExisting) {
      await supabaseAdmin
        .from('admin_config')
        .update({ value: false })
        .eq('key', 'global_mock_mode')
    } else {
      await supabaseAdmin
        .from('admin_config')
        .insert({
          key: 'global_mock_mode',
          value: false,
          is_secret: false,
        })
    }
    
    // Configurar mock_mode como false por defecto para todos los tipos
    const configTypes = ['video', 'audio', 'music', 'llm', 'image', 'lora_training', 'lip_sync', 'storage']
    
    for (const type of configTypes) {
      const configKey = `${type}_config`
      const { data: existing } = await supabaseAdmin
        .from('admin_config')
        .select('id')
        .eq('key', configKey)
        .maybeSingle()
      
      const configValue = {
        mock_mode: false,
        primary_id: null,
        fallback_id: null,
      }
      
      // Obtener el proveedor activo por defecto para este tipo
      const { data: activeProvider } = await supabaseAdmin
        .from('api_providers')
        .select('id')
        .eq('type', type)
        .eq('is_active', true)
        .eq('is_default', true)
        .maybeSingle()
      
      if (activeProvider) {
        configValue.primary_id = activeProvider.id
      }
      
      if (existing) {
        await supabaseAdmin
          .from('admin_config')
          .update({ value: configValue })
          .eq('key', configKey)
      } else {
        await supabaseAdmin
          .from('admin_config')
          .insert({
            key: configKey,
            value: configValue,
            is_secret: false,
          })
      }
    }
    
    return NextResponse.json({
      success: true,
      message: 'Proveedores configurados correctamente',
      results,
    })
  } catch (error: any) {
    console.error('Setup providers error:', error)
    return NextResponse.json(
      { error: error.message || 'Error al configurar proveedores' },
      { status: 500 }
    )
  }
}
