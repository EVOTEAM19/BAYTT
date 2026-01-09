import { getAIConfig } from './config'
import { getProviderWithKey } from './config'
import { LipSyncRequest } from '@/types/video-production'
import type { ApiProvider } from '@/types/database'

// ============================================
// PROVEEDORES DE LIP SYNC
// ============================================

export async function applyLipSync(request: LipSyncRequest): Promise<string> {
  const config = await getAIConfig()
  
  if (config.mockMode) {
    // En mock, devolver el video original
    return request.video_url
  }
  
  // Obtener proveedor de lip sync activo
  const { data: providers } = await import('@/lib/supabase/admin').then(m => m.supabaseAdmin)
    .from('api_providers')
    .select('*')
    .eq('type', 'lip_sync')
    .eq('is_active', true)
    .order('priority', { ascending: true })
    .limit(1)
    .single()
  
  if (!providers) {
    throw new Error('No hay proveedor de lip sync configurado')
  }
  
  const provider = await getProviderWithKey(providers.id)
  if (!provider || !provider.apiKey) {
    throw new Error('No se pudo obtener la API key del proveedor')
  }
  
  switch (provider.slug) {
    case 'sync_labs':
      return await lipSyncWithSyncLabs(request, provider)
    case 'wav2lip':
      return await lipSyncWithWav2Lip(request, provider)
    case 'sadtalker':
      return await lipSyncWithSadTalker(request, provider)
    case 'heygen':
      return await lipSyncWithHeyGen(request, provider)
    default:
      // Fallback: usar Wav2Lip via Replicate
      return await lipSyncWithWav2Lip(request, provider)
  }
}

// ============================================
// SYNC LABS (Mejor calidad, API comercial)
// ============================================

async function lipSyncWithSyncLabs(
  request: LipSyncRequest,
  provider: ApiProvider & { apiKey: string }
): Promise<string> {
  const response = await fetch('https://api.sync.so/v2/generate', {
    method: 'POST',
    headers: {
      'x-api-key': provider.apiKey,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model: 'sync-1.6.0',  // Última versión
      input: [
        {
          type: 'video',
          url: request.video_url
        },
        {
          type: 'audio',
          url: request.audio_url
        }
      ],
      options: {
        output_format: 'mp4',
        active_speaker: true,  // Detectar quién habla
        sync_mode: request.options.quality === 'high' ? 'accurate' : 'fast'
      }
    })
  })
  
  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Unknown error' }))
    throw new Error(`Sync Labs API error: ${error.error || response.statusText}`)
  }
  
  const data = await response.json()
  
  // Polling hasta que esté listo
  let result = data
  let attempts = 0
  const maxAttempts = 60 // 5 minutos máximo
  
  while (result.status === 'processing' && attempts < maxAttempts) {
    await new Promise(resolve => setTimeout(resolve, 5000))
    attempts++
    
    const pollResponse = await fetch(`https://api.sync.so/v2/generate/${result.id}`, {
      headers: { 'x-api-key': provider.apiKey }
    })
    
    if (!pollResponse.ok) {
      throw new Error(`Sync Labs polling error: ${pollResponse.statusText}`)
    }
    
    result = await pollResponse.json()
  }
  
  if (result.status === 'failed') {
    throw new Error(`Sync Labs error: ${result.error || 'Unknown error'}`)
  }
  
  if (result.status !== 'completed') {
    throw new Error('Sync Labs timeout: el proceso tardó demasiado')
  }
  
  return result.output_url
}

// ============================================
// WAV2LIP (Open source via Replicate)
// ============================================

async function lipSyncWithWav2Lip(
  request: LipSyncRequest,
  provider: ApiProvider & { apiKey: string }
): Promise<string> {
  const response = await fetch('https://api.replicate.com/v1/predictions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${provider.apiKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      version: 'devxpy/wav2lip:8d65e3f4f4298520e079198b493c25adfc43c058ffec924f2aefc8010ed25eef',
      input: {
        face: request.video_url,
        audio: request.audio_url,
        pads: [0, 10, 0, 0],  // Padding para mejor detección
        fps: 25,
        smooth: true,
        resize_factor: 1
      }
    })
  })
  
  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Unknown error' }))
    throw new Error(`Wav2Lip API error: ${error.error || response.statusText}`)
  }
  
  const prediction = await response.json()
  
  // Polling
  let result = prediction
  let attempts = 0
  const maxAttempts = 60
  
  while (result.status !== 'succeeded' && result.status !== 'failed' && attempts < maxAttempts) {
    await new Promise(resolve => setTimeout(resolve, 3000))
    attempts++
    
    const pollResponse = await fetch(result.urls.get, {
      headers: { 'Authorization': `Bearer ${provider.apiKey}` }
    })
    
    if (!pollResponse.ok) {
      throw new Error(`Wav2Lip polling error: ${pollResponse.statusText}`)
    }
    
    result = await pollResponse.json()
  }
  
  if (result.status === 'failed') {
    throw new Error(`Wav2Lip error: ${result.error || 'Unknown error'}`)
  }
  
  if (result.status !== 'succeeded') {
    throw new Error('Wav2Lip timeout')
  }
  
  return Array.isArray(result.output) ? result.output[0] : result.output
}

// ============================================
// SADTALKER (Mejor expresiones faciales)
// ============================================

async function lipSyncWithSadTalker(
  request: LipSyncRequest,
  provider: ApiProvider & { apiKey: string }
): Promise<string> {
  // SadTalker requiere una imagen, no un video
  // Extraer primer frame del video
  const frameResponse = await fetch(
    `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/video/extract-frames`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ video_url: request.video_url })
    }
  )
  
  const frames = await frameResponse.json()
  const sourceImage = frames.first
  
  const response = await fetch('https://api.replicate.com/v1/predictions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${provider.apiKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      version: 'cjwbw/sadtalker:3aa3dac9353cc4d6bd62a8f95957bd844003b401ca4e4a9b33baa574c549d376',
      input: {
        source_image: sourceImage,
        driven_audio: request.audio_url,
        enhancer: 'gfpgan',  // Mejora calidad facial
        preprocess: 'full',
        still_mode: false,
        expression_scale: 1.0
      }
    })
  })
  
  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Unknown error' }))
    throw new Error(`SadTalker API error: ${error.error || response.statusText}`)
  }
  
  const prediction = await response.json()
  let result = prediction
  let attempts = 0
  const maxAttempts = 60
  
  while (result.status !== 'succeeded' && result.status !== 'failed' && attempts < maxAttempts) {
    await new Promise(resolve => setTimeout(resolve, 3000))
    attempts++
    
    const pollResponse = await fetch(result.urls.get, {
      headers: { 'Authorization': `Bearer ${provider.apiKey}` }
    })
    
    if (!pollResponse.ok) {
      throw new Error(`SadTalker polling error: ${pollResponse.statusText}`)
    }
    
    result = await pollResponse.json()
  }
  
  if (result.status === 'failed') {
    throw new Error(`SadTalker error: ${result.error || 'Unknown error'}`)
  }
  
  if (result.status !== 'succeeded') {
    throw new Error('SadTalker timeout')
  }
  
  return Array.isArray(result.output) ? result.output[0] : result.output
}

// ============================================
// HEYGEN (Premium, mejor calidad)
// ============================================

async function lipSyncWithHeyGen(
  request: LipSyncRequest,
  provider: ApiProvider & { apiKey: string }
): Promise<string> {
  const response = await fetch('https://api.heygen.com/v2/video/translate', {
    method: 'POST',
    headers: {
      'X-Api-Key': provider.apiKey,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      video_url: request.video_url,
      audio_url: request.audio_url,
      output_format: 'mp4',
      resolution: '1080p'
    })
  })
  
  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Unknown error' }))
    throw new Error(`HeyGen API error: ${error.error || response.statusText}`)
  }
  
  const data = await response.json()
  
  // Polling
  let status = 'processing'
  let attempts = 0
  const maxAttempts = 60
  let videoId = data.video_id
  
  while (status === 'processing' && attempts < maxAttempts) {
    await new Promise(resolve => setTimeout(resolve, 10000))
    attempts++
    
    const pollResponse = await fetch(`https://api.heygen.com/v2/video/${videoId}`, {
      headers: { 'X-Api-Key': provider.apiKey }
    })
    
    if (!pollResponse.ok) {
      throw new Error(`HeyGen polling error: ${pollResponse.statusText}`)
    }
    
    const pollData = await pollResponse.json()
    status = pollData.status
    
    if (status === 'completed') {
      return pollData.video_url
    }
    
    if (status === 'failed') {
      throw new Error(`HeyGen error: ${pollData.error || 'Unknown error'}`)
    }
  }
  
  throw new Error('HeyGen timeout: el proceso tardó demasiado')
}

