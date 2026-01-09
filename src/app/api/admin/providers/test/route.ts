import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { provider_type, api_endpoint, api_key, api_version } = body
    
    console.log(`[PROVIDER TEST] Testing ${provider_type} at ${api_endpoint} (version: ${api_version})`)
    
    let testResult = { success: false, message: '' }
    
    switch (provider_type) {
      case 'llm':
        testResult = await testOpenAI(api_key, api_version)
        break
      case 'video':
        testResult = await testRunway(api_key, api_version)
        break
      case 'audio':
        testResult = await testElevenLabs(api_key, api_version)
        break
      case 'image':
      case 'lora_training':
        testResult = await testFalAI(api_key, api_version)
        break
      case 'lip_sync':
        testResult = await testSyncLabs(api_key, api_version)
        break
      case 'music':
        testResult = await testBeatoven(api_key, api_version)
        break
      default:
        testResult = { success: true, message: 'No test available for this provider type' }
    }
    
    return NextResponse.json(testResult)
    
  } catch (error: any) {
    return NextResponse.json({
      success: false,
      error: error.message
    }, { status: 500 })
  }
}

// Test específico para Runway con versión
async function testRunway(apiKey: string, version: string = '2024-11-06'): Promise<{ success: boolean; message: string }> {
  try {
    const response = await fetch('https://api.dev.runwayml.com/v1/tasks', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'X-Runway-Version': version  // ⭐ Incluir versión
      }
    })
    
    if (response.ok) {
      return { success: true, message: `Runway conectado correctamente (versión ${version})` }
    } else {
      const error = await response.text()
      return { success: false, message: `Error: ${error}` }
    }
  } catch (error: any) {
    return { success: false, message: error.message }
  }
}

// Test para OpenAI
async function testOpenAI(apiKey: string, model: string = 'gpt-4-turbo-preview'): Promise<{ success: boolean; message: string }> {
  try {
    const response = await fetch('https://api.openai.com/v1/models', {
      headers: {
        'Authorization': `Bearer ${apiKey}`
      }
    })
    
    if (response.ok) {
      return { success: true, message: `OpenAI conectado (modelo: ${model})` }
    } else {
      const error = await response.json()
      return { success: false, message: error.error?.message || 'Error de conexión' }
    }
  } catch (error: any) {
    return { success: false, message: error.message }
  }
}

// Test para ElevenLabs
async function testElevenLabs(apiKey: string, version: string = 'v1'): Promise<{ success: boolean; message: string }> {
  try {
    const response = await fetch('https://api.elevenlabs.io/v1/user', {
      headers: {
        'xi-api-key': apiKey
      }
    })
    
    if (response.ok) {
      const data = await response.json()
      return { 
        success: true, 
        message: `ElevenLabs conectado. Créditos: ${data.subscription?.character_count || 0}/${data.subscription?.character_limit || 0}` 
      }
    } else {
      return { success: false, message: 'API key inválida' }
    }
  } catch (error: any) {
    return { success: false, message: error.message }
  }
}

// Test para Fal.ai
async function testFalAI(apiKey: string, model: string = 'flux-pro/v1.1-ultra'): Promise<{ success: boolean; message: string }> {
  try {
    // Fal.ai no tiene endpoint de "ping", pero podemos verificar la key
    const response = await fetch('https://fal.run/fal-ai/flux-pro', {
      method: 'POST',
      headers: {
        'Authorization': `Key ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        prompt: 'test',
        num_images: 0  // No generar nada, solo verificar auth
      })
    })
    
    // Incluso si falla por parámetros, si no es 401 la key es válida
    if (response.status !== 401) {
      return { success: true, message: `Fal.ai conectado (modelo: ${model})` }
    } else {
      return { success: false, message: 'API key inválida' }
    }
  } catch (error: any) {
    return { success: false, message: error.message }
  }
}

// Test para Sync Labs
async function testSyncLabs(apiKey: string, version: string = 'sync-1.7.1'): Promise<{ success: boolean; message: string }> {
  try {
    const response = await fetch('https://api.sync.so/v2/account', {
      headers: {
        'x-api-key': apiKey
      }
    })
    
    if (response.ok) {
      return { success: true, message: `Sync Labs conectado (versión ${version})` }
    } else {
      return { success: false, message: 'API key inválida' }
    }
  } catch (error: any) {
    return { success: false, message: error.message }
  }
}

// Test para Beatoven
async function testBeatoven(apiKey: string, version: string = 'v1'): Promise<{ success: boolean; message: string }> {
  // Beatoven no tiene endpoint de test público
  return { 
    success: true, 
    message: `Beatoven configurado (versión ${version}). Nota: La generación de música está temporalmente deshabilitada.` 
  }
}
