import { Scene, VideoGenerationRequest } from '@/types/video-production'
import { getProviderWithKey, getAIConfig } from './config'
import { supabaseAdmin } from '@/lib/supabase/admin'
import type { ApiProvider } from '@/types/database'

// ============================================
// GENERADOR DE VIDEO CON CONTINUIDAD
// ============================================

export async function generateVideoWithContinuity(
  request: VideoGenerationRequest
): Promise<{
  video_url: string
  first_frame_url: string
  last_frame_url: string
}> {
  const config = await getAIConfig()
  
  if (config.mockMode) {
    return generateMockVideo(request)
  }
  
  // Obtener proveedor de video activo
  const { data: providerData } = await supabaseAdmin
    .from('api_providers')
    .select('*')
    .eq('type', 'video')
    .eq('is_active', true)
    .order('priority', { ascending: true })
    .limit(1)
    .single()
  
  if (!providerData) {
    throw new Error('No hay proveedor de video configurado')
  }
  
  const provider = await getProviderWithKey(providerData.id)
  if (!provider || !provider.apiKey) {
    throw new Error('No se pudo obtener la API key del proveedor')
  }
  
  // Construir prompt con contexto de la escena anterior
  let finalPrompt = request.scene.visual_prompt
  
  // Si hay escena anterior, añadir contexto de continuidad
  if (request.previous_scene && request.options.use_reference_frame) {
    finalPrompt = `
      Continuing from previous scene: ${request.previous_scene.visual_context}
      
      Current scene: ${request.scene.visual_prompt}
      
      Maintain visual continuity with the previous frame.
    `.trim()
  }
  
  let result: { video_url: string; first_frame_url: string; last_frame_url: string }
  
  switch (provider.slug) {
    case 'runway':
      result = await generateWithRunway(request, finalPrompt, provider)
      break
    case 'kling':
      result = await generateWithKling(request, finalPrompt, provider)
      break
    case 'luma':
      result = await generateWithLuma(request, finalPrompt, provider)
      break
    default:
      result = await generateWithRunway(request, finalPrompt, provider)
  }
  
  return result
}

// ============================================
// RUNWAY GEN-3 ALPHA (Con Image-to-Video)
// ============================================

async function generateWithRunway(
  request: VideoGenerationRequest,
  prompt: string,
  provider: ApiProvider & { apiKey: string }
): Promise<{ video_url: string; first_frame_url: string; last_frame_url: string }> {
  // Usar image_to_video si hay imagen de referencia, text_to_video si no
  const hasReferenceImage = request.previous_scene?.last_frame_url && request.options.use_reference_frame
  const endpoint = hasReferenceImage
    ? 'https://api.dev.runwayml.com/v1/image_to_video'
    : 'https://api.dev.runwayml.com/v1/text_to_video'
  
  // Verificar que la URL de imagen sea accesible
  let useImageToVideo = false
  let validImageUrl: string | null = null
  
  if (hasReferenceImage && request.previous_scene.last_frame_url) {
    const imageUrl = request.previous_scene.last_frame_url
    if (!imageUrl.includes('placeholder.com') && !imageUrl.startsWith('placeholder://')) {
      try {
        const testResponse = await fetch(imageUrl, { method: 'HEAD', signal: AbortSignal.timeout(5000) })
        if (testResponse.ok) {
          useImageToVideo = true
          validImageUrl = imageUrl
        }
      } catch {
        // Si falla, usar text_to_video
      }
    }
  }
  
  const finalEndpoint = useImageToVideo
    ? 'https://api.dev.runwayml.com/v1/image_to_video'
    : 'https://api.dev.runwayml.com/v1/text_to_video'
  
  // ⭐ CRÍTICO: Ratio correcto para Runway
  // image_to_video: ratio debe ser "1280:768" (horizontal) o "768:1280" (vertical) - NO acepta "16:9"
  // text_to_video: usar formato específico también
  // Usar SIEMPRE gen3a_turbo con duration 10
  let ratio: string
  if (useImageToVideo) {
    ratio = '1280:768' // ⭐ CORRECTO para image_to_video (horizontal/landscape)
  } else {
    ratio = '1280:768' // Por ahora usar el mismo para text_to_video
  }
  
  const body: any = {
    model: 'gen3a_turbo',
    promptText: prompt.substring(0, 1000),
    ratio: ratio, // ⭐ "1280:768" para image_to_video (NO "16:9")
    duration: 10, // gen3a_turbo siempre usa 10 segundos
    watermark: false
  }
  
  // Solo añadir promptImage si la URL es válida y accesible
  if (useImageToVideo && validImageUrl) {
    body.promptImage = validImageUrl
  }
  
  const response = await fetch(finalEndpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${provider.apiKey}`,
      'X-Runway-Version': '2024-11-06'
    },
    body: JSON.stringify(body)
  })
  
  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Unknown error' }))
    throw new Error(`Runway API error: ${error.error || response.statusText}`)
  }
  
  const data = await response.json()
  
  // Polling
  let result = data
  let attempts = 0
  const maxAttempts = 60
  
  while ((result.status === 'processing' || result.status === 'pending') && attempts < maxAttempts) {
    await new Promise(resolve => setTimeout(resolve, 5000))
    attempts++
    
    const pollResponse = await fetch(`https://api.dev.runwayml.com/v1/tasks/${result.id}`, {
      headers: { 'Authorization': `Bearer ${provider.apiKey}` }
    })
    
    if (!pollResponse.ok) {
      throw new Error(`Runway polling error: ${pollResponse.statusText}`)
    }
    
    result = await pollResponse.json()
  }
  
  if (result.status === 'failed') {
    throw new Error(`Runway error: ${result.error || 'Unknown error'}`)
  }
  
  if (result.status !== 'completed') {
    throw new Error('Runway timeout')
  }
  
  // Extraer primer y último frame
  const frames = await extractFrames(result.output_url)
  
  return {
    video_url: result.output_url,
    first_frame_url: frames.first,
    last_frame_url: frames.last
  }
}

// ============================================
// KLING AI (Con Image-to-Video)
// ============================================

async function generateWithKling(
  request: VideoGenerationRequest,
  prompt: string,
  provider: ApiProvider & { apiKey: string }
): Promise<{ video_url: string; first_frame_url: string; last_frame_url: string }> {
  const requestBody: any = {
    prompt: prompt,
    duration: request.options.duration_seconds,
    mode: 'standard',
    aspect_ratio: '16:9'
  }
  
  // Image-to-Video con frame de referencia
  if (request.previous_scene?.last_frame_url && request.options.use_reference_frame) {
    requestBody.image_url = request.previous_scene.last_frame_url
    requestBody.mode = 'img2video'
  }
  
  const response = await fetch('https://api.klingai.com/v1/videos/generate', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${provider.apiKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(requestBody)
  })
  
  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Unknown error' }))
    throw new Error(`Kling API error: ${error.error || response.statusText}`)
  }
  
  const data = await response.json()
  
  // Polling similar
  let result = data
  let attempts = 0
  const maxAttempts = 60
  
  while ((result.status === 'processing' || result.status === 'pending') && attempts < maxAttempts) {
    await new Promise(resolve => setTimeout(resolve, 5000))
    attempts++
    
    const pollResponse = await fetch(`https://api.klingai.com/v1/videos/${result.id}`, {
      headers: { 'Authorization': `Bearer ${provider.apiKey}` }
    })
    
    if (!pollResponse.ok) {
      throw new Error(`Kling polling error: ${pollResponse.statusText}`)
    }
    
    result = await pollResponse.json()
  }
  
  if (result.status === 'failed') {
    throw new Error(`Kling error: ${result.error || 'Unknown error'}`)
  }
  
  if (result.status !== 'completed') {
    throw new Error('Kling timeout')
  }
  
  const frames = await extractFrames(result.video_url)
  
  return {
    video_url: result.video_url,
    first_frame_url: frames.first,
    last_frame_url: frames.last
  }
}

// ============================================
// LUMA AI
// ============================================

async function generateWithLuma(
  request: VideoGenerationRequest,
  prompt: string,
  provider: ApiProvider & { apiKey: string }
): Promise<{ video_url: string; first_frame_url: string; last_frame_url: string }> {
  const requestBody: any = {
    prompt: prompt,
    duration: request.options.duration_seconds,
    aspect_ratio: '16:9'
  }
  
  if (request.previous_scene?.last_frame_url && request.options.use_reference_frame) {
    requestBody.image_url = request.previous_scene.last_frame_url
  }
  
  const response = await fetch('https://api.lumalabs.ai/v1/generate', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${provider.apiKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(requestBody)
  })
  
  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Unknown error' }))
    throw new Error(`Luma API error: ${error.error || response.statusText}`)
  }
  
  const data = await response.json()
  
  // Polling
  let result = data
  let attempts = 0
  const maxAttempts = 60
  
  while ((result.status === 'processing' || result.status === 'pending') && attempts < maxAttempts) {
    await new Promise(resolve => setTimeout(resolve, 5000))
    attempts++
    
    const pollResponse = await fetch(`https://api.lumalabs.ai/v1/generate/${result.id}`, {
      headers: { 'Authorization': `Bearer ${provider.apiKey}` }
    })
    
    if (!pollResponse.ok) {
      throw new Error(`Luma polling error: ${pollResponse.statusText}`)
    }
    
    result = await pollResponse.json()
  }
  
  if (result.status === 'failed') {
    throw new Error(`Luma error: ${result.error || 'Unknown error'}`)
  }
  
  if (result.status !== 'completed') {
    throw new Error('Luma timeout')
  }
  
  const frames = await extractFrames(result.video_url)
  
  return {
    video_url: result.video_url,
    first_frame_url: frames.first,
    last_frame_url: frames.last
  }
}

// ============================================
// EXTRAER FRAMES (Primer y último)
// ============================================

async function extractFrames(videoUrl: string): Promise<{ first: string; last: string }> {
  // Usar API de extracción de frames
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
  const response = await fetch(`${baseUrl}/api/video/extract-frames`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ video_url: videoUrl })
  })
  
  if (!response.ok) {
    throw new Error('Error al extraer frames')
  }
  
  return await response.json()
}

// ============================================
// MOCK PARA DESARROLLO
// ============================================

function generateMockVideo(request: VideoGenerationRequest) {
  return {
    video_url: `https://storage.baytt.com/mock/scene_${request.scene.scene_number}.mp4`,
    first_frame_url: `https://picsum.photos/seed/${request.scene.id}-first/1920/1080`,
    last_frame_url: `https://picsum.photos/seed/${request.scene.id}-last/1920/1080`
  }
}

