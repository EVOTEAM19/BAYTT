// API endpoint para probar modelos de Runway
import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { decryptApiKey } from '@/lib/encryption/api-keys'

async function testRunwayModel(
  endpoint: string,
  model: string,
  prompt: string,
  apiKey: string,
  apiVersion: string,
  imageUrl?: string
) {
  const results = {
    model,
    endpoint,
    success: false,
    taskId: null as string | null,
    videoUrl: null as string | null,
    error: null as string | null,
    status: null as string | null
  }

  // ⭐ CRÍTICO: Ratio y duration dependen del modelo
  // veo3.1: ratio "1280:720", "720:1280", "1080:1920", "1920:1080" | duration: 4, 6, 8
  // gen4.5: ratio "1280:720", "720:1280", "1104:832", "960:960", "832:1104" | duration: 5, 8, 10 (NO 4!)
  // gen3a_turbo (image_to_video): ratio "16:9" | duration: 10
  // veo3: ratio "1280:720" | duration: 4, 6, 8
  let ratio = '1280:720' // Valor por defecto
  let duration = 4 // Valor mínimo válido
  
  if (model === 'veo3.1' || model === 'veo3.1_fast') {
    ratio = '1280:720'
    duration = 4 // 4, 6, u 8 son válidos
  } else if (model === 'gen4.5') {
    ratio = '1280:720'
    duration = 5 // ⚠️ CRÍTICO: gen4.5 requiere 5, 8, o 10 (NO 4!)
  } else if (model === 'veo3') {
    ratio = '1280:720'
    duration = 4
  } else if (model === 'gen3a_turbo' && imageUrl) {
    // Para image_to_video, usar ratio simplificado
    ratio = '16:9'
    duration = 10
  }
  
  const body: any = {
    model: model,
    promptText: prompt.substring(0, 1000),
    ratio: ratio,
    duration: duration,
    watermark: false
  }

  if (imageUrl && endpoint.includes('image_to_video')) {
    body.promptImage = imageUrl
  }

  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
        'X-Runway-Version': apiVersion
      },
      body: JSON.stringify(body)
    })

    const responseText = await response.text()

    if (!response.ok) {
      results.error = responseText
      return results
    }

    const data = JSON.parse(responseText)
    const taskId = data.id || data.task_id || data.taskId

    if (!taskId) {
      results.error = 'No task ID in response'
      return results
    }

    results.taskId = taskId
    results.success = true

    // Polling corto (solo 5 intentos = 25 segundos máximo)
    for (let attempt = 1; attempt <= 5; attempt++) {
      await new Promise(r => setTimeout(r, 5000))

      const pollResponse = await fetch(`https://api.dev.runwayml.com/v1/tasks/${taskId}`, {
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'X-Runway-Version': apiVersion
        }
      })

      if (!pollResponse.ok) {
        const errorText = await pollResponse.text()
        results.error = errorText
        return results
      }

      const pollData = await pollResponse.json()
      const status = pollData.status || pollData.state || 'UNKNOWN'
      results.status = status

      if (status === 'SUCCEEDED' || status === 'completed' || status === 'COMPLETED') {
        const videoUrl = pollData.output?.[0] || 
                        pollData.output_url || 
                        pollData.url || 
                        pollData.video_url ||
                        ''
        
        if (videoUrl) {
          results.videoUrl = videoUrl
          return results
        }
      } else if (status === 'FAILED' || status === 'failed') {
        const errorMsg = pollData.failure || pollData.error || pollData.message || 'Unknown error'
        results.error = errorMsg
        return results
      }
    }

    // Si llegamos aquí, el task sigue procesando (normal)
    return results

  } catch (error: any) {
    results.error = error.message
    return results
  }
}

export async function POST(request: NextRequest) {
  try {
    // Verificar autenticación
    const supabase = await createServerSupabaseClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
    }

    // Verificar rol admin
    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .maybeSingle()

    if (profile?.role !== 'admin' && profile?.role !== 'superadmin') {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
    }

    // Obtener proveedor de Runway
    const { data: providers, error } = await supabaseAdmin
      .from('api_providers')
      .select('*')
      .eq('slug', 'runway')
      .eq('type', 'video')
      .eq('is_active', true)

    if (error || !providers || providers.length === 0) {
      return NextResponse.json({ error: 'No se encontró proveedor de Runway activo' }, { status: 404 })
    }

    const provider = providers[0]
    const apiKey = decryptApiKey(provider.api_key_encrypted || '')
    const apiVersion = provider.api_version || '2024-11-06'
    const baseUrl = provider.api_url || 'https://api.dev.runwayml.com/v1'
    const finalBaseUrl = baseUrl.includes('/v1') ? baseUrl : baseUrl.replace(/\/$/, '') + '/v1'

    const testPrompt = 'A cinematic sunset over the ocean, waves gently crashing, golden hour lighting, 4K quality'

    console.log('[TEST RUNWAY] Iniciando pruebas de modelos...')

    // TEST 1: veo3.1 con text_to_video (más reciente)
    console.log('[TEST RUNWAY] Probando veo3.1 con text_to_video...')
    const test1 = await testRunwayModel(
      `${finalBaseUrl}/text_to_video`,
      'veo3.1',
      testPrompt,
      apiKey,
      apiVersion
    )

    // TEST 2: gen3a_turbo con text_to_video
    console.log('[TEST RUNWAY] Probando gen3a_turbo con text_to_video...')
    const test2 = await testRunwayModel(
      `${finalBaseUrl}/text_to_video`,
      'gen3a_turbo',
      testPrompt,
      apiKey,
      apiVersion
    )

    // TEST 3: gen4.5 con text_to_video (con duration correcto)
    console.log('[TEST RUNWAY] Probando gen4.5 con text_to_video...')
    const test3 = await testRunwayModel(
      `${finalBaseUrl}/text_to_video`,
      'gen4.5',
      testPrompt,
      apiKey,
      apiVersion
    )

    // TEST 4: gen3a_turbo con image_to_video (para verificar que funciona con imagen)
    console.log('[TEST RUNWAY] Probando gen3a_turbo con image_to_video...')
    // Usar una imagen de prueba (placeholder)
    const testImageUrl = 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=1920&h=1080&fit=crop'
    const test4 = await testRunwayModel(
      `${finalBaseUrl}/image_to_video`,
      'gen3a_turbo',
      testPrompt,
      apiKey,
      apiVersion,
      testImageUrl
    )

    // Determinar qué modelo funciona
    let workingModel = null
    if (test1.success && !test1.error?.includes('not available') && !test1.error?.includes('Invalid option')) {
      workingModel = 'veo3.1'
    } else if (test2.success && !test2.error?.includes('not available') && !test2.error?.includes('Invalid option')) {
      workingModel = 'gen3a_turbo'
    } else if (test3.success && !test3.error?.includes('not available') && !test3.error?.includes('Invalid option')) {
      workingModel = 'gen4.5'
    }

    // Determinar qué modelo funciona
    let workingModel = null
    if (test1.success && !test1.error?.includes('not available') && !test1.error?.includes('Invalid option')) {
      workingModel = 'veo3.1'
    } else if (test2.success && !test2.error?.includes('not available') && !test2.error?.includes('Invalid option')) {
      workingModel = 'gen3a_turbo'
    } else if (test3.success && !test3.error?.includes('not available') && !test3.error?.includes('Invalid option')) {
      workingModel = 'gen4.5'
    }

    const results = {
      provider: {
        name: provider.name,
        api_url: provider.api_url,
        api_version: apiVersion
      },
      tests: {
        veo3_1_text_to_video: test1,
        gen3a_turbo_text_to_video: test2,
        gen4_5_text_to_video: test3,
        gen3a_turbo_image_to_video: test4
      },
      conclusion: {
        veo3_1_works_for_text: test1.success && !test1.error?.includes('not available') && !test1.error?.includes('Invalid option'),
        gen3a_turbo_works_for_text: test2.success && !test2.error?.includes('not available') && !test2.error?.includes('Invalid option'),
        gen4_5_works_for_text: test3.success && !test3.error?.includes('not available') && !test3.error?.includes('Invalid option'),
        gen3a_turbo_works_for_image: test4.success && !test4.error?.includes('not available') && !test4.error?.includes('Invalid option'),
        recommended_model_for_text: workingModel || 'veo3.1',
        recommended_model_for_image: test4.success ? 'gen3a_turbo' : 'unknown',
        strategy: 'Use gen3a_turbo for image_to_video when image is available, use veo3.1 for text_to_video when no image'
      }
    }

    console.log('[TEST RUNWAY] Pruebas completadas:', results)

    return NextResponse.json({
      success: true,
      message: 'Pruebas completadas',
      ...results
    })

  } catch (error: any) {
    console.error('[TEST RUNWAY] Error:', error)
    return NextResponse.json(
      { error: 'Error al probar modelos', details: error.message },
      { status: 500 }
    )
  }
}

// También permitir GET para fácil acceso desde navegador
export async function GET(request: NextRequest) {
  return POST(request)
}
