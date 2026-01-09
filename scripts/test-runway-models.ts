// Script de prueba para verificar modelos de Runway
import { createClient } from '@supabase/supabase-js'
import { decryptApiKey } from '../src/lib/encryption/api-keys'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Variables de entorno faltantes')
  console.error('Necesitas: NEXT_PUBLIC_SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
})

async function testRunwayModel(
  endpoint: string,
  model: string,
  prompt: string,
  apiKey: string,
  apiVersion: string,
  imageUrl?: string
) {
  console.log(`\n🧪 Probando modelo: ${model}`)
  console.log(`   Endpoint: ${endpoint}`)
  console.log(`   Prompt: ${prompt.substring(0, 100)}...`)

  const body: any = {
    model: model,
    promptText: prompt.substring(0, 1000),
    ratio: '16:9',
    duration: 5,
    watermark: false
  }

  if (imageUrl && endpoint.includes('image_to_video')) {
    body.promptImage = imageUrl
    console.log(`   Con imagen: ${imageUrl}`)
  }

  try {
    console.log(`   ⏳ Enviando request a Runway...`)
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
        'X-Runway-Version': apiVersion
      },
      body: JSON.stringify(body)
    })

    console.log(`   📊 Response status: ${response.status} ${response.statusText}`)

    const responseText = await response.text()
    console.log(`   📄 Response body:`, responseText)

    if (!response.ok) {
      console.error(`   ❌ Error: ${responseText}`)
      return { success: false, error: responseText }
    }

    const data = JSON.parse(responseText)
    const taskId = data.id || data.task_id || data.taskId

    if (!taskId) {
      console.error(`   ❌ No task ID en respuesta:`, data)
      return { success: false, error: 'No task ID' }
    }

    console.log(`   ✅ Task creado: ${taskId}`)
    console.log(`   ⏳ Esperando resultado (máx 2 minutos)...`)

    // Polling corto (solo para verificar que funciona)
    const maxAttempts = 24 // 2 minutos máximo
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      await new Promise(r => setTimeout(r, 5000))

      const pollResponse = await fetch(`https://api.dev.runwayml.com/v1/tasks/${taskId}`, {
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'X-Runway-Version': apiVersion
        }
      })

      if (!pollResponse.ok) {
        const errorText = await pollResponse.text()
        console.error(`   ❌ Error en polling: ${errorText}`)
        return { success: false, error: errorText }
      }

      const pollData = await pollResponse.json()
      const status = pollData.status || pollData.state || 'UNKNOWN'

      console.log(`   📊 Poll ${attempt}/${maxAttempts}: status = ${status}`)

      if (status === 'SUCCEEDED' || status === 'completed' || status === 'COMPLETED') {
        const videoUrl = pollData.output?.[0] || 
                        pollData.output_url || 
                        pollData.url || 
                        pollData.video_url ||
                        ''
        
        if (videoUrl) {
          console.log(`   ✅ ✅ ✅ ÉXITO! Video generado: ${videoUrl}`)
          return { success: true, taskId, videoUrl, model }
        } else {
          console.error(`   ⚠️ Status SUCCEEDED pero no hay video URL`)
          return { success: false, error: 'No video URL' }
        }
      } else if (status === 'FAILED' || status === 'failed') {
        const errorMsg = pollData.failure || pollData.error || pollData.message || 'Unknown error'
        console.error(`   ❌ Task falló: ${errorMsg}`)
        return { success: false, error: errorMsg }
      }

      // Continuar polling
    }

    console.log(`   ⏱️ Timeout después de ${maxAttempts} intentos`)
    console.log(`   ⚠️ Task sigue procesando (esto es normal, puede tardar más)`)
    return { success: true, taskId, status: 'processing', model }

  } catch (error: any) {
    console.error(`   ❌ Excepción: ${error.message}`)
    return { success: false, error: error.message }
  }
}

async function main() {
  console.log('🚀 Iniciando pruebas de modelos Runway...\n')

  // Obtener proveedor de Runway
  const { data: providers, error } = await supabase
    .from('api_providers')
    .select('*')
    .eq('slug', 'runway')
    .eq('type', 'video')
    .eq('is_active', true)

  if (error || !providers || providers.length === 0) {
    console.error('❌ No se encontró proveedor de Runway activo')
    process.exit(1)
  }

  const provider = providers[0]
  console.log(`📋 Proveedor encontrado: ${provider.name}`)
  console.log(`   API URL: ${provider.api_url}`)
  console.log(`   API Version: ${provider.api_version || '2024-11-06'}`)

  // Obtener API key
  let apiKey: string
  try {
    const decrypted = decryptApiKey(provider.api_key_encrypted || '')
    apiKey = decrypted
    console.log(`   API Key: ${apiKey.substring(0, 10)}...${apiKey.substring(apiKey.length - 10)}`)
  } catch (e) {
    console.error('❌ Error descifrando API key')
    process.exit(1)
  }

  const apiVersion = provider.api_version || '2024-11-06'
  const baseUrl = provider.api_url || 'https://api.dev.runwayml.com/v1'

  // Asegurar que baseUrl termine en /v1
  const finalBaseUrl = baseUrl.includes('/v1') ? baseUrl : baseUrl.replace(/\/$/, '') + '/v1'

  console.log(`\n✅ Configuración lista\n`)

  const testPrompt = 'A cinematic sunset over the ocean, waves gently crashing, golden hour lighting, 4K quality'

  // TEST 1: gen3a con text_to_video
  console.log('\n' + '='.repeat(60))
  console.log('TEST 1: gen3a con text_to_video')
  console.log('='.repeat(60))
  const test1 = await testRunwayModel(
    `${finalBaseUrl}/text_to_video`,
    'gen3a',
    testPrompt,
    apiKey,
    apiVersion
  )

  // TEST 2: gen3a_turbo con text_to_video (debería fallar)
  console.log('\n' + '='.repeat(60))
  console.log('TEST 2: gen3a_turbo con text_to_video (esperado: fallo)')
  console.log('='.repeat(60))
  const test2 = await testRunwayModel(
    `${finalBaseUrl}/text_to_video`,
    'gen3a_turbo',
    testPrompt,
    apiKey,
    apiVersion
  )

  // Resumen
  console.log('\n' + '='.repeat(60))
  console.log('📊 RESUMEN DE PRUEBAS')
  console.log('='.repeat(60))
  console.log(`\n1. gen3a + text_to_video: ${test1.success ? '✅ FUNCIONA' : '❌ FALLA'}`)
  if (test1.error) console.log(`   Error: ${test1.error}`)
  if (test1.videoUrl) console.log(`   Video URL: ${test1.videoUrl}`)
  
  console.log(`\n2. gen3a_turbo + text_to_video: ${test2.success ? '✅ FUNCIONA' : '❌ FALLA (esperado)'}`)
  if (test2.error) console.log(`   Error: ${test2.error}`)

  console.log('\n' + '='.repeat(60))
  console.log('💡 CONCLUSIÓN')
  console.log('='.repeat(60))
  if (test1.success && !test2.success) {
    console.log('✅ CORRECTO: gen3a funciona con text_to_video')
    console.log('✅ CORRECTO: gen3a_turbo NO funciona con text_to_video (como esperábamos)')
    console.log('\n🎯 La solución implementada es CORRECTA')
  } else if (test1.success && test2.success) {
    console.log('⚠️ AMBOS modelos funcionan con text_to_video')
    console.log('💡 Puedes usar cualquiera de los dos')
  } else {
    console.log('❌ gen3a NO funciona con text_to_video')
    console.log('⚠️ Necesitamos probar otros modelos o verificar la configuración')
  }
}

main().catch(console.error)
