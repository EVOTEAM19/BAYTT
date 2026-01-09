// src/lib/movie-generation/video-generator-v2.ts

import { SupabaseClient } from '@supabase/supabase-js'
import { LocationManager } from '@/lib/locations/location-manager'
import { ReferenceImageManager } from './reference-image-manager'

interface ContinuityPlan {
  scene_number: number
  is_continuation: boolean
  continues_from: number | null
  location_id: string | null
  needs_reference_frame: boolean
  reference_frame_source: 'previous_scene' | 'location_library' | 'generate'
}

export class VideoGeneratorV2 {
  private supabase: SupabaseClient
  private runwayApiKey: string
  private imageApiKey: string
  private movieId: string
  private runwayProvider: any // Proveedor completo con configuración
  private referenceManager: ReferenceImageManager // Gestor de imágenes de referencia
  
  constructor(
    supabase: SupabaseClient,
    runwayApiKey: string,
    imageApiKey: string,
    movieId: string,
    runwayProvider?: any
  ) {
    this.supabase = supabase
    this.runwayApiKey = runwayApiKey
    this.imageApiKey = imageApiKey
    this.movieId = movieId
    this.runwayProvider = runwayProvider
    
    // Crear el gestor de imágenes de referencia
    this.referenceManager = new ReferenceImageManager(
      supabase,
      imageApiKey,
      movieId
    )
  }
  
  /**
   * Generar video de una escena con sistema de imágenes de referencia
   */
  async generateSceneVideo(
    scene: any,
    continuityPlan: ContinuityPlan,
    previousSceneEndFrame: string | null
  ): Promise<{
    video_url: string
    end_frame_url: string
    reference_image_url: string
    reference_source: string
  }> {
    console.log(`[VIDEO V2] ==========================================`)
    console.log(`[VIDEO V2] Generating scene ${scene.scene_number}`)
    console.log(`[VIDEO V2] Location: ${scene.header?.location || scene.location || 'unknown'}`)
    console.log(`[VIDEO V2] Is continuation: ${continuityPlan?.is_continuation}`)
    console.log(`[VIDEO V2] Previous end frame: ${previousSceneEndFrame ? 'YES' : 'NO'}`)
    
    // ⭐ PASO 1: Obtener o generar imagen de referencia usando ReferenceImageManager
    const referenceResult = await this.referenceManager.getOrCreateReferenceImage(
      scene,
      previousSceneEndFrame,
      continuityPlan?.is_continuation || false
    )
    
    console.log(`[VIDEO V2] Reference image source: ${referenceResult.source}`)
    console.log(`[VIDEO V2] Reference image URL: ${referenceResult.image_url.substring(0, 100)}...`)
    
    // Validar que tenemos una imagen válida
    if (!referenceResult.image_url || referenceResult.image_url.includes('placeholder')) {
      console.error(`[VIDEO V2] ❌ Invalid reference image URL!`)
      throw new Error(`Invalid reference image URL for scene ${scene.scene_number}`)
    }
    
    // ⭐ PASO 2: Construir prompt CORTO para video (máx 1000 chars)
    // NO incluir diálogos - esos van al audio
    const videoPrompt = this.buildShortVideoPrompt(scene)
    
    console.log(`[VIDEO V2] Video prompt (${videoPrompt.length} chars): ${videoPrompt.substring(0, 100)}...`)
    
    // ⭐ PASO 3: Generar video con Runway usando la imagen de referencia
    // SIEMPRE usar image_to_video porque SIEMPRE tenemos imagen de referencia
    console.log(`[VIDEO] Starting video generation for scene ${scene.scene_number}...`)
    const videoUrl = await this.callRunway(
      referenceResult.image_url,
      videoPrompt,
      true // useImageToVideo = true SIEMPRE (tenemos imagen de referencia)
    )
    
    // ⭐ VALIDACIÓN CRÍTICA: Verificar que tenemos un video URL válido
    if (!videoUrl || videoUrl.trim() === '' || videoUrl === 'null' || videoUrl === 'undefined') {
      console.error(`[VIDEO] ❌ CRITICAL: No video URL returned for scene ${scene.scene_number}!`)
      console.error(`[VIDEO] videoUrl value:`, videoUrl)
      throw new Error(`No video URL returned from Runway for scene ${scene.scene_number}`)
    }
    
    console.log(`[VIDEO] ✅ Video URL obtained for scene ${scene.scene_number}: ${videoUrl.substring(0, 100)}...`)
    
    // ⭐ PASO 4: Extraer último frame para continuidad de siguiente escena
    const endFrameUrl = await this.referenceManager.extractEndFrame(videoUrl, scene)
    
    console.log(`[VIDEO] ✅ End frame extracted: ${endFrameUrl.substring(0, 100)}...`)
    
    // ⭐ PASO 5: Guardar datos en movie_scenes
    await this.saveSceneData(scene.scene_number, {
      reference_image_url: referenceResult.image_url,
      reference_image_source: referenceResult.source,
      end_frame_url: endFrameUrl,
      location_image_id: referenceResult.location_image_id,
      video_url: videoUrl
    })
    
    console.log(`[VIDEO] ✅ Scene ${scene.scene_number} video generation completed successfully`)
    console.log(`[VIDEO]   - Video URL: ${videoUrl.substring(0, 80)}...`)
    console.log(`[VIDEO]   - Reference: ${referenceResult.source}`)
    console.log(`[VIDEO]   - End Frame URL: ${endFrameUrl.substring(0, 80)}...`)
    
    return {
      video_url: videoUrl,
      end_frame_url: endFrameUrl,
      reference_image_url: referenceResult.image_url,
      reference_source: referenceResult.source
    }
  }
  
  /**
   * Construir prompt CORTO para video (sin diálogos)
   * Los diálogos se procesan aparte en audio + lip sync
   */
  private buildShortVideoPrompt(scene: any): string {
    const parts: string[] = []
    
    // Estilo base
    parts.push('Cinematic scene, natural movement, 4K quality')
    
    // Ubicación y tiempo
    if (scene.location) {
      parts.push(`Location: ${scene.location}`)
    }
    if (scene.time_of_day) {
      parts.push(`Time: ${scene.time_of_day}`)
    }
    
    // Acción principal (SIN diálogos)
    if (scene.action_description?.summary) {
      parts.push(scene.action_description.summary)
    } else if (scene.scene_description) {
      // Extraer solo acción, no diálogos
      const actionOnly = scene.scene_description
        .replace(/["'].*?["']/g, '') // Quitar diálogos entre comillas
        .replace(/dice:|says:|exclama:/gi, '') // Quitar indicadores de diálogo
        .substring(0, 400)
      parts.push(actionOnly)
    }
    
    // Personajes y posiciones (sin diálogos)
    if (scene.characters_in_scene) {
      const charDesc = scene.characters_in_scene
        .map((c: any) => `${c.character_name} ${c.action || ''}`.trim())
        .join(', ')
      if (charDesc.length < 200) {
        parts.push(`Characters: ${charDesc}`)
      }
    }
    
    // Movimiento de cámara
    if (scene.camera?.movement) {
      parts.push(`Camera: ${scene.camera.movement}`)
    }
    
    // Combinar y limitar a 950 caracteres
    let prompt = parts.join('. ')
    if (prompt.length > 950) {
      prompt = prompt.substring(0, 947) + '...'
    }
    
    return prompt
  }
  
  /**
   * Guardar datos de la escena en BD
   */
  private async saveSceneData(sceneNumber: number, data: {
    reference_image_url: string
    reference_image_source: string
    end_frame_url: string
    location_image_id?: string
    video_url: string
  }): Promise<void> {
    try {
      // Primero intentar guardar todos los campos
      const updateData: any = {
        video_url: data.video_url,
        status: 'completed',
        updated_at: new Date().toISOString()
      }
      
      // Intentar añadir campos opcionales si existen (manejar errores de columnas inexistentes)
      try {
        updateData.reference_image_url = data.reference_image_url
        updateData.reference_image_source = data.reference_image_source
        updateData.end_frame_url = data.end_frame_url
        if (data.location_image_id) {
          updateData.location_image_id = data.location_image_id
        }
      } catch (e) {
        console.warn(`[VIDEO V2] ⚠️ Some optional columns may not exist, continuing with basic fields only`)
      }
      
      const { error } = await this.supabase
        .from('movie_scenes')
        .update(updateData)
        .eq('movie_id', this.movieId)
        .eq('scene_number', sceneNumber)
      
      if (error) {
        // Si falla con columnas opcionales, intentar solo con campos básicos
        if (error.message?.includes('column') || error.message?.includes('schema cache')) {
          console.warn(`[VIDEO V2] ⚠️ Column error detected, trying with basic fields only: ${error.message}`)
          const { error: basicError } = await this.supabase
            .from('movie_scenes')
            .update({
              video_url: data.video_url,
              status: 'completed',
              updated_at: new Date().toISOString()
            } as any)
            .eq('movie_id', this.movieId)
            .eq('scene_number', sceneNumber)
          
          if (basicError) {
            console.error(`[VIDEO V2] ❌ Error saving basic scene data: ${basicError.message}`)
            throw basicError
          } else {
            console.log(`[VIDEO V2] ✅ Scene basic data saved (some columns may be missing)`)
          }
        } else {
          console.error(`[VIDEO V2] ❌ Error saving scene data: ${error.message}`)
          throw error
        }
      } else {
        console.log(`[VIDEO V2] ✅ Scene data saved to database`)
      }
    } catch (error: any) {
      console.error(`[VIDEO V2] ❌ Error in saveSceneData: ${error.message}`)
      // No relanzar el error, solo loguearlo para no romper el pipeline
    }
  }
  
  /**
   * Llamar a Runway para generar video
   * SIEMPRE usa image_to_video porque siempre tenemos imagen de referencia
   */
  private async callRunway(
    imageUrl: string,
    prompt: string,
    useImageToVideo: boolean = true
  ): Promise<string> {
    // Obtener configuración del proveedor
    const providerConfig = this.runwayProvider?.config || {}
    const apiVersion = this.runwayProvider?.api_version || '2024-11-06'
    let providerApiUrl = this.runwayProvider?.api_url || 'https://api.dev.runwayml.com/v1'
    
    // ⭐ CRÍTICO: Corregir hostname si es incorrecto
    // Runway requiere api.dev.runwayml.com, NO api.runwayml.com
    if (providerApiUrl.includes('api.runwayml.com') && !providerApiUrl.includes('api.dev.runwayml.com')) {
      console.warn(`[VIDEO] ⚠️ Incorrect Runway hostname detected: ${providerApiUrl}`)
      providerApiUrl = providerApiUrl.replace('api.runwayml.com', 'api.dev.runwayml.com')
      console.log(`[VIDEO] ✅ Corrected to: ${providerApiUrl}`)
    }
    
    // Construir endpoint base
    // Si api_url contiene un path específico (ej: /image-to-video), extraer solo la base
    let baseEndpoint = providerApiUrl
    if (baseEndpoint.includes('/image-to-video') || baseEndpoint.includes('/image_to_video') || 
        baseEndpoint.includes('/text-to-video') || baseEndpoint.includes('/text_to_video') ||
        baseEndpoint.includes('/generate')) {
      // Extraer solo la parte base (antes del último /)
      const urlParts = baseEndpoint.split('/')
      const baseParts = urlParts.slice(0, urlParts.length - 1)
      baseEndpoint = baseParts.join('/')
    }
    
    // Asegurar que termine en /v1
    if (!baseEndpoint.includes('/v1')) {
      baseEndpoint = baseEndpoint.replace(/\/$/, '') + '/v1'
    } else if (!baseEndpoint.match(/\/v1\/?$/)) {
      // Si tiene /v1 pero con más cosas después, cortar ahí
      const v1Index = baseEndpoint.indexOf('/v1')
      baseEndpoint = baseEndpoint.substring(0, v1Index + 3)
    }
    
    // ⭐ VERIFICACIÓN FINAL CRÍTICA: SIEMPRE usar api.dev.runwayml.com (requerido por Runway)
    // Reemplazar cualquier ocurrencia de api.runwayml.com por api.dev.runwayml.com
    if (baseEndpoint.includes('api.runwayml.com')) {
      console.warn(`[VIDEO] ⚠️ baseEndpoint has incorrect hostname: ${baseEndpoint}`)
      baseEndpoint = baseEndpoint.replace(/api\.runwayml\.com/g, 'api.dev.runwayml.com')
      console.log(`[VIDEO] ✅ Corrected baseEndpoint to: ${baseEndpoint}`)
    }
    
    // Verificación final: Si después de todas las correcciones no tiene api.dev.runwayml.com, forzar
    if (!baseEndpoint.includes('api.dev.runwayml.com')) {
      console.error(`[VIDEO] ❌ CRITICAL: baseEndpoint does not contain api.dev.runwayml.com: ${baseEndpoint}`)
      // Forzar corrección absoluta
      baseEndpoint = 'https://api.dev.runwayml.com/v1'
      console.log(`[VIDEO] ✅ Forced baseEndpoint to: ${baseEndpoint}`)
    }
    
    console.log(`[VIDEO] 🔍 Final baseEndpoint after all corrections: ${baseEndpoint}`)
    
    console.log(`[VIDEO V2] Runway Provider Config:`, {
      providerApiUrl,
      baseEndpoint,
      apiVersion,
      model: providerConfig.model || 'gen3a_turbo',
      ratio: providerConfig.ratio || providerConfig.aspect_ratio || '16:9'
    })
    
    // ⭐ Validar que la URL de imagen es accesible
    // SIEMPRE usamos image_to_video porque siempre tenemos imagen de referencia
    let validImageUrl: string | null = null
    
    if (imageUrl && !imageUrl.includes('placeholder.com') && !imageUrl.startsWith('placeholder://')) {
      try {
        // Verificar que la URL sea accesible
        const controller = new AbortController()
        const timeoutId = setTimeout(() => controller.abort(), 5000)
        const testResponse = await fetch(imageUrl, { 
          method: 'HEAD',
          signal: controller.signal
        })
        clearTimeout(timeoutId)
        
        if (testResponse.ok) {
          validImageUrl = imageUrl
          console.log('[VIDEO V2] ✅ Image URL is accessible, using image_to_video')
        } else {
          console.error(`[VIDEO V2] ❌ Image URL returned status ${testResponse.status}, but we MUST use image_to_video`)
          // Aún así usamos la URL (puede ser un problema temporal)
          validImageUrl = imageUrl
        }
      } catch (error: any) {
        console.warn('[VIDEO V2] ⚠️ Could not verify image URL:', error.message)
        // Aún así usamos la URL
        validImageUrl = imageUrl
      }
    } else {
      console.error(`[VIDEO V2] ❌ Invalid image URL: ${imageUrl}`)
      throw new Error(`Invalid reference image URL for video generation: ${imageUrl}`)
    }
    
    if (!validImageUrl) {
      throw new Error('No valid reference image URL available for video generation')
    }
    
    // Construir endpoint completo
    // ⭐ SIEMPRE usar image_to_video porque siempre tenemos imagen de referencia
    const endpointPath = '/image_to_video'
    const endpoint = baseEndpoint.replace(/\/$/, '') + endpointPath
    
    console.log(`[VIDEO V2] 🔧 Endpoint construction:`)
    console.log(`  Provider api_url: ${providerApiUrl}`)
    console.log(`  Base endpoint: ${baseEndpoint}`)
    console.log(`  Final endpoint: ${endpoint}`)
    
    // ⭐ ESTRATEGIA: Usar SIEMPRE gen3a_turbo con image_to_video (requerido por el usuario)
    // SIEMPRE usamos image_to_video porque siempre tenemos imagen de referencia
    const model = 'gen3a_turbo'
    console.log(`[VIDEO] ✅ Using gen3a_turbo for image_to_video`)
    
    // ⭐ CRÍTICO: Ratio y duration para gen3a_turbo + image_to_video
    // image_to_video (gen3a_turbo): ratio "1280:768" (horizontal) o "768:1280" (vertical) | duration: 10
    // Runway NO acepta "16:9" para image_to_video, solo acepta: "1280:768" o "768:1280"
    const ratio = '1280:768' // ⭐ CORRECTO para image_to_video (horizontal/landscape)
    const duration = 10 // gen3a_turbo siempre usa 10 segundos
    
    console.log(`[VIDEO] Configuration:`)
    console.log(`[VIDEO]   Model: ${model}`)
    console.log(`[VIDEO]   Ratio: ${ratio} (required by Runway for image_to_video)`)
    console.log(`[VIDEO]   Duration: ${duration} seconds`)
    console.log(`[VIDEO]   Endpoint: image_to_video (always, we have reference image)`)
    
    const watermark = providerConfig.watermark !== undefined ? providerConfig.watermark : false
    
    // ⭐ CONFIGURACIÓN CORRECTA para Runway image_to_video con gen3a_turbo
    // Ratio debe ser "1280:768" (NO "16:9")
    const body: any = {
      model: model,
      promptText: prompt.substring(0, 1000),
      ratio: ratio, // "1280:768" para image_to_video
      duration: duration, // 10 segundos
      watermark: watermark
    }
    
    // ⭐ SIEMPRE incluir promptImage porque siempre tenemos imagen de referencia
    if (!validImageUrl) {
      throw new Error('Cannot generate video without a valid reference image URL')
    }
    body.promptImage = validImageUrl
    
    console.log(`[VIDEO] 🎬 Calling Runway API:`)
    console.log(`[VIDEO] Endpoint: ${endpoint}`)
    console.log(`[VIDEO] Method: POST`)
    console.log(`[VIDEO] Headers: Authorization: Bearer ***, X-Runway-Version: ${apiVersion}`)
    console.log(`[VIDEO] Request body:`, JSON.stringify(body, null, 2))
    
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.runwayApiKey}`,
        'X-Runway-Version': apiVersion
      },
      body: JSON.stringify(body)
    })
    
    console.log(`[VIDEO] Response status: ${response.status} ${response.statusText}`)
    
    const responseText = await response.text()
    console.log(`[VIDEO] Response body:`, responseText)
    
    if (!response.ok) {
      console.error(`[VIDEO] ❌ Runway API failed (${response.status}):`, responseText)
      console.error(`[VIDEO] Request details:`, {
        endpoint,
        status: response.status,
        statusText: response.statusText,
        headers: Object.fromEntries(response.headers.entries()),
        body: JSON.stringify(body, null, 2)
      })
      throw new Error(`Runway error: ${responseText}`)
    }
    
    let data: any
    try {
      data = JSON.parse(responseText)
    } catch (e) {
      console.error(`[VIDEO] ❌ Failed to parse response as JSON:`, responseText)
      throw new Error(`Invalid JSON response from Runway: ${responseText}`)
    }
    
    const taskId = data.id || data.task_id || data.taskId
    if (!taskId) {
      console.error(`[VIDEO] ❌ No task ID in response:`, data)
      throw new Error(`No task ID returned from Runway. Response: ${JSON.stringify(data)}`)
    }
    
    console.log(`[VIDEO] ✅ Runway task created - Task ID: ${taskId}`)
    console.log(`[VIDEO] Full response:`, JSON.stringify(data, null, 2))
    
    // Polling
    console.log(`[VIDEO] Starting polling for task: ${taskId}`)
    const videoUrl = await this.pollRunwayTask(taskId, apiVersion)
    
    if (!videoUrl || videoUrl.trim() === '') {
      console.error(`[VIDEO] ❌ Polling returned empty video URL!`)
      throw new Error('No video URL returned from Runway polling')
    }
    
    console.log(`[VIDEO] ✅ Video URL obtained: ${videoUrl}`)
    return videoUrl
  }
  
  
  private async pollRunwayTask(taskId: string, apiVersion?: string): Promise<string> {
    const maxAttempts = 120
    let attempts = 0
    
    // Obtener configuración del proveedor
    const version = apiVersion || this.runwayProvider?.api_version || '2024-11-06'
    let providerApiUrl = this.runwayProvider?.api_url || 'https://api.dev.runwayml.com/v1'
    
    // ⭐ CRÍTICO: Corregir hostname si es incorrecto
    if (providerApiUrl.includes('api.runwayml.com') && !providerApiUrl.includes('api.dev.runwayml.com')) {
      providerApiUrl = providerApiUrl.replace('api.runwayml.com', 'api.dev.runwayml.com')
    }
    
    // Construir endpoint base (mismo proceso que en callRunway)
    let baseEndpoint = providerApiUrl
    if (baseEndpoint.includes('/image-to-video') || baseEndpoint.includes('/image_to_video') || 
        baseEndpoint.includes('/text-to-video') || baseEndpoint.includes('/text_to_video') ||
        baseEndpoint.includes('/generate')) {
      const urlParts = baseEndpoint.split('/')
      const baseParts = urlParts.slice(0, urlParts.length - 1)
      baseEndpoint = baseParts.join('/')
    }
    
    if (!baseEndpoint.includes('/v1')) {
      baseEndpoint = baseEndpoint.replace(/\/$/, '') + '/v1'
    } else if (!baseEndpoint.match(/\/v1\/?$/)) {
      const v1Index = baseEndpoint.indexOf('/v1')
      baseEndpoint = baseEndpoint.substring(0, v1Index + 3)
    }
    
    // ⭐ VERIFICACIÓN FINAL: SIEMPRE usar api.dev.runwayml.com
    if (baseEndpoint.includes('api.runwayml.com')) {
      baseEndpoint = baseEndpoint.replace(/api\.runwayml\.com/g, 'api.dev.runwayml.com')
    }
    
    // Forzar corrección si aún no tiene el hostname correcto
    if (!baseEndpoint.includes('api.dev.runwayml.com')) {
      console.error(`[VIDEO] ❌ CRITICAL: Polling baseEndpoint incorrect, forcing correction`)
      baseEndpoint = 'https://api.dev.runwayml.com/v1'
    }
    
    const pollingUrl = baseEndpoint.replace(/\/$/, '') + `/tasks/${taskId}`
    console.log(`[VIDEO] 🔍 Final polling URL: ${pollingUrl}`)
    
    console.log(`[VIDEO] 🔄 Polling Runway task: ${taskId}`)
    console.log(`[VIDEO] Polling URL: ${pollingUrl}`)
    console.log(`[VIDEO] Max attempts: ${maxAttempts} (10 minutes total)`)
    
    while (attempts < maxAttempts) {
      attempts++
      console.log(`[VIDEO] Poll attempt ${attempts}/${maxAttempts} for task ${taskId}...`)
      
      const response = await fetch(pollingUrl, {
        headers: {
          'Authorization': `Bearer ${this.runwayApiKey}`,
          'X-Runway-Version': version
        }
      })
      
      console.log(`[VIDEO] Poll response status: ${response.status} ${response.statusText}`)
      
      if (!response.ok) {
        const errorText = await response.text()
        console.error(`[VIDEO] ❌ Runway polling error (${response.status}):`, errorText)
        throw new Error(`Runway polling error: ${errorText}`)
      }
      
      const responseText = await response.text()
      let data: any
      try {
        data = JSON.parse(responseText)
      } catch (e) {
        console.error(`[VIDEO] ❌ Failed to parse polling response:`, responseText)
        throw new Error(`Invalid JSON in polling response: ${responseText}`)
      }
      
      const status = data.status || data.state || 'UNKNOWN'
      console.log(`[VIDEO] Poll ${attempts}: status = ${status}`)
      
      if (status === 'SUCCEEDED' || status === 'completed' || status === 'COMPLETED') {
        // Intentar obtener la URL del video de múltiples campos posibles
        const videoUrl = data.output?.[0] || 
                        data.output_url || 
                        data.url || 
                        data.video_url ||
                        data.result?.output?.[0] ||
                        data.result?.output_url ||
                        ''
        
        console.log(`[VIDEO] ✅ Task completed! Response data:`, JSON.stringify(data, null, 2))
        console.log(`[VIDEO] ✅ Extracted video URL: ${videoUrl}`)
        
        if (!videoUrl || videoUrl.trim() === '') {
          console.error(`[VIDEO] ❌ Task marked as SUCCEEDED but no video URL found!`)
          console.error(`[VIDEO] Full response:`, JSON.stringify(data, null, 2))
          throw new Error(`Task completed but no video URL in response: ${JSON.stringify(data)}`)
        }
        
        return videoUrl
      } else if (status === 'FAILED' || status === 'failed' || status === 'FAILED') {
        const errorMsg = data.failure || data.error || data.message || 'Unknown error'
        console.error(`[VIDEO] ❌ Task failed! Error:`, errorMsg)
        console.error(`[VIDEO] Full failed response:`, JSON.stringify(data, null, 2))
        throw new Error(`Runway task failed: ${errorMsg}`)
      } else if (status === 'PENDING' || status === 'IN_PROGRESS' || status === 'PROCESSING') {
        console.log(`[VIDEO] Task still processing (${status}), waiting 5 seconds...`)
      } else {
        console.warn(`[VIDEO] ⚠️ Unknown status: ${status}, continuing polling...`)
        console.log(`[VIDEO] Full response:`, JSON.stringify(data, null, 2))
      }
      
      // Esperar antes del siguiente intento
      await new Promise(r => setTimeout(r, 5000))
    }
    
    console.error(`[VIDEO] ❌ Timeout after ${maxAttempts} attempts (10 minutes)`)
    throw new Error(`Runway timeout after ${maxAttempts} attempts (10 minutes)`)
  }
}
