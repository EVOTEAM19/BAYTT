// src/lib/movie-generation/cinematic-video-generator.ts

import { VisualBible } from './creative-director'
import { DetailedScreenplay, DetailedScene } from './cinematic-screenwriter'
import { getProviderWithKey } from '@/lib/ai/config'

export class CinematicVideoGenerator {
  private supabase: any
  private videoApiKey: string
  private imageApiKey: string
  private movieId: string
  private visualBible: VisualBible
  
  constructor(
    supabase: any,
    videoApiKey: string,
    imageApiKey: string,
    movieId: string,
    visualBible: VisualBible
  ) {
    this.supabase = supabase
    this.videoApiKey = videoApiKey
    this.imageApiKey = imageApiKey
    this.movieId = movieId
    this.visualBible = visualBible
  }
  
  /**
   * Genera todos los videos con continuidad perfecta
   */
  async generateAllVideos(screenplay: DetailedScreenplay): Promise<GeneratedVideo[]> {
    console.log('[VIDEO GENERATOR] Starting video generation with perfect continuity...')
    
    const videos: GeneratedVideo[] = []
    let previousFrameUrl: string | null = null
    let previousSceneContext: DetailedScene | null = null
    
    for (let i = 0; i < screenplay.scenes.length; i++) {
      const scene = screenplay.scenes[i]
      
      console.log(`[VIDEO GENERATOR] Generating scene ${i + 1}/${screenplay.scenes.length}`)
      
      // 1. Si no es la primera escena, generar imagen de transición
      let startFrameUrl: string | null = null
      if (previousFrameUrl && previousSceneContext) {
        startFrameUrl = await this.generateTransitionFrame(
          previousSceneContext,
          scene,
          previousFrameUrl
        )
      }
      
      // 2. Construir el MEGA-PROMPT para el video
      const videoPrompt = this.buildUltraDetailedVideoPrompt(
        scene,
        previousSceneContext,
        startFrameUrl
      )
      
      // 3. Generar el video
      const videoResult = await this.generateVideo(
        videoPrompt,
        startFrameUrl,
        scene.duration.screen_time_seconds
      )
      
      // 4. Extraer último frame para continuidad
      const lastFrameUrl = await this.extractLastFrame(videoResult.video_url)
      
      // 5. Guardar resultado
      videos.push({
        scene_number: scene.scene_number,
        scene_id: scene.scene_id,
        video_url: videoResult.video_url,
        start_frame_url: startFrameUrl,
        last_frame_url: lastFrameUrl,
        duration: scene.duration.screen_time_seconds,
        prompt_used: videoPrompt,
        status: 'completed'
      })
      
      // 6. Actualizar contexto para siguiente escena
      previousFrameUrl = lastFrameUrl
      previousSceneContext = scene
      
      // 7. Guardar progreso
      await this.saveProgress(i + 1, screenplay.scenes.length, videos)
    }
    
    console.log(`[VIDEO GENERATOR] ✅ Generated ${videos.length} videos`)
    return videos
  }
  
  /**
   * Construye el prompt más detallado posible para el video
   */
  private buildUltraDetailedVideoPrompt(
    scene: DetailedScene,
    previousScene: DetailedScene | null,
    startFrameUrl: string | null
  ): string {
    const parts: string[] = []
    
    // ========================================
    // PARTE 1: CONTEXTO GLOBAL (Biblia Visual)
    // ========================================
    parts.push(`[FILM STYLE: ${this.visualBible.movie_identity.visual_style}]`)
    parts.push(`[COLOR PALETTE: Primary ${this.visualBible.color_palette.primary.hex}, Secondary ${this.visualBible.color_palette.secondary.hex}, Accent ${this.visualBible.color_palette.accent.hex}]`)
    parts.push(`[TONE: ${this.visualBible.movie_identity.tone}]`)
    
    // Referencias cinematográficas
    if (this.visualBible.cinematic_references?.length > 0) {
      const ref = this.visualBible.cinematic_references[0]
      parts.push(`[VISUAL REFERENCE: ${ref.what_to_take} like in "${ref.movie}"]`)
    }
    
    // ========================================
    // PARTE 2: ENCABEZADO DE ESCENA
    // ========================================
    const header = scene.header
    parts.push(`[SCENE: ${header.type}. ${header.location} - ${header.time}]`)
    parts.push(`[SPECIFIC TIME: ${header.time_specific}]`)
    
    // ========================================
    // PARTE 3: ILUMINACIÓN DETALLADA
    // ========================================
    const lighting = scene.visual_direction?.lighting
    if (lighting) {
      parts.push(`[LIGHTING: ${lighting.source}, ${lighting.quality} light, direction from ${lighting.direction}]`)
      parts.push(`[COLOR TEMPERATURE: ${lighting.color_temperature}]`)
      parts.push(`[SHADOWS: ${lighting.shadows}]`)
      if (lighting.practical_lights?.length > 0) {
        parts.push(`[PRACTICAL LIGHTS: ${lighting.practical_lights.join(', ')}]`)
      }
    }
    
    // ========================================
    // PARTE 4: CÁMARA Y COMPOSICIÓN
    // ========================================
    const establishing = scene.visual_direction?.establishing_shot
    if (establishing) {
      parts.push(`[CAMERA: ${establishing.camera_position}, ${establishing.lens} lens]`)
      parts.push(`[MOVEMENT: ${establishing.movement || 'static camera'}]`)
    }
    
    if (scene.visual_direction?.depth_of_field) {
      parts.push(`[DEPTH OF FIELD: ${scene.visual_direction.depth_of_field}]`)
    }
    
    // Color grading
    const grading = scene.visual_direction?.color_grading
    if (grading) {
      parts.push(`[COLOR GRADE: ${grading.dominant_color} dominant, ${grading.saturation} saturation, ${grading.contrast} contrast, ${grading.mood} mood]`)
    }
    
    // ========================================
    // PARTE 5: PERSONAJES CON DETALLE EXTREMO
    // ========================================
    if (scene.characters_in_scene) {
      for (const char of scene.characters_in_scene) {
        // Buscar perfil completo en la Biblia Visual
        const charProfile = this.visualBible.characters?.find(c => c.name === char.character_name)
        
        if (charProfile) {
          const appearance = charProfile.physical_appearance
          parts.push(`[CHARACTER: ${char.character_name}]`)
          parts.push(`  - Build: ${appearance.build}, Height: ${appearance.height}`)
          parts.push(`  - Skin: ${appearance.skin_tone}`)
          parts.push(`  - Hair: ${appearance.hair?.color} ${appearance.hair?.style} ${appearance.hair?.length}`)
          parts.push(`  - Eyes: ${appearance.eyes?.color} ${appearance.eyes?.shape}`)
          parts.push(`  - Face: ${appearance.face?.shape}, features: ${appearance.face?.distinctive_features?.join(', ') || 'none'}`)
          parts.push(`  - Wearing: ${char.wardrobe}`)
          parts.push(`  - Position: ${char.position?.start}`)
          parts.push(`  - State: ${char.physical_state || 'normal'}, ${char.emotional_state || 'neutral'}`)
        }
        
        // Blocking (movimientos)
        if (char.blocking?.length > 0) {
          parts.push(`  - Actions:`)
          for (const block of char.blocking) {
            parts.push(`    ${block.timestamp}: ${block.action}, facing ${block.facing || 'forward'}`)
          }
        }
      }
    }
    
    // ========================================
    // PARTE 6: ACCIÓN BEAT-BY-BEAT
    // ========================================
    if (scene.action_description?.beat_by_beat) {
      parts.push(`[ACTION SEQUENCE:]`)
      for (const beat of scene.action_description.beat_by_beat) {
        parts.push(`  ${beat.timestamp}: ${beat.action} (focus on: ${beat.visual_focus || 'main action'})`)
      }
    }
    
    // ========================================
    // PARTE 7: UBICACIÓN DETALLADA
    // ========================================
    const location = this.visualBible.locations?.find(
      l => l.name.toLowerCase() === scene.header.location.toLowerCase()
    )
    if (location) {
      parts.push(`[LOCATION DETAILS:]`)
      parts.push(`  - ${location.description}`)
      parts.push(`  - Key elements: ${location.key_elements?.join(', ') || 'none'}`)
      parts.push(`  - Atmosphere: ${location.atmosphere}`)
      parts.push(`  - Dominant color: ${location.color_dominant}`)
    }
    
    // ========================================
    // PARTE 8: CONTINUIDAD CON ESCENA ANTERIOR
    // ========================================
    if (previousScene) {
      parts.push(`[CONTINUITY FROM PREVIOUS SCENE:]`)
      if (scene.continuity?.previous_scene_connection) {
        parts.push(`  - Visual connection: ${scene.continuity.previous_scene_connection.visual}`)
        parts.push(`  - Time elapsed: ${scene.continuity.previous_scene_connection.temporal}`)
      }
      if (scene.continuity?.persistent_elements?.length > 0) {
        parts.push(`  - Must maintain: ${scene.continuity.persistent_elements.join(', ')}`)
      }
    }
    
    // ========================================
    // PARTE 9: INSTRUCCIONES TÉCNICAS
    // ========================================
    parts.push(`[TECHNICAL REQUIREMENTS:]`)
    parts.push(`  - Duration: ${scene.duration.screen_time_seconds} seconds`)
    parts.push(`  - Motion: NATURAL SPEED, realistic movement, NOT slow motion`)
    parts.push(`  - Quality: Cinematic 4K, film grain, professional color grading`)
    parts.push(`  - Aspect ratio: ${this.visualBible.camera_style?.aspect_ratio || '16:9'}`)
    
    // ========================================
    // PARTE 10: ELEMENTOS PROHIBIDOS
    // ========================================
    if (this.visualBible.forbidden_elements?.length > 0) {
      parts.push(`[AVOID: ${this.visualBible.forbidden_elements.join(', ')}]`)
    }
    
    // ========================================
    // PARTE 11: PROMPT DE IA OPTIMIZADO
    // ========================================
    if (scene.ai_generation_prompts?.video_prompt) {
      parts.push(`[AI OPTIMIZED: ${scene.ai_generation_prompts.video_prompt}]`)
    }
    
    // Combinar todo
    const fullPrompt = parts.join('\n')
    
    console.log(`[VIDEO GENERATOR] Prompt length: ${fullPrompt.length} characters`)
    
    return fullPrompt
  }
  
  /**
   * Genera una imagen de transición para continuidad perfecta
   */
  private async generateTransitionFrame(
    previousScene: DetailedScene,
    currentScene: DetailedScene,
    previousLastFrame: string
  ): Promise<string> {
    console.log('[VIDEO GENERATOR] Generating transition frame for continuity...')
    
    // Construir prompt que combine el final de la anterior con el inicio de la actual
    const transitionPrompt = `
Continuation frame from previous scene.
Previous scene ended with: ${previousScene.action_description?.beat_by_beat?.slice(-1)[0]?.action || 'previous action'}
Current scene starts with: ${currentScene.action_description?.beat_by_beat?.[0]?.action || 'current action'}

Location: ${currentScene.header.location}
Time: ${currentScene.header.time_specific}
Characters: ${currentScene.characters_in_scene?.map(c => `${c.character_name} at ${c.position?.start || 'position'}`).join(', ') || 'none'}

This frame must seamlessly connect the two scenes.
Style: ${this.visualBible.movie_identity.visual_style}
Color palette: ${this.visualBible.color_palette.primary.hex}, ${this.visualBible.color_palette.secondary.hex}
    `.trim()
    
    // Generar imagen con Fal.ai usando la imagen anterior como referencia
    try {
      const response = await fetch('https://fal.run/fal-ai/flux-pro/v1.1-ultra', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Key ${this.imageApiKey}`
        },
        body: JSON.stringify({
          prompt: transitionPrompt,
          image_url: previousLastFrame,  // Usar como referencia
          image_size: 'landscape_16_9',
          num_images: 1
        })
      })
      
      if (!response.ok) {
        console.warn('[VIDEO GENERATOR] Could not generate transition frame, using previous frame')
        return previousLastFrame
      }
      
      const data = await response.json()
      return data.images?.[0]?.url || previousLastFrame
    } catch (error) {
      console.warn('[VIDEO GENERATOR] Error generating transition frame:', error)
      return previousLastFrame
    }
  }
  
  /**
   * Extrae el último frame del video
   */
  private async extractLastFrame(videoUrl: string): Promise<string> {
    // Por ahora, generar una imagen representativa del final de la escena
    // En producción, usar FFmpeg para extraer el frame real
    console.log('[VIDEO GENERATOR] Extracting last frame...')
    
    // Placeholder: retornar URL del video
    // TODO: Implementar extracción real con FFmpeg
    return videoUrl + '#lastframe'
  }
  
  /**
   * Optimiza el prompt para Runway (máximo 1000 caracteres)
   * Prioriza información más importante y elimina redundancias
   */
  private optimizePromptForRunway(fullPrompt: string): string {
    const MAX_LENGTH = 1000
    
    // Si ya está dentro del límite, retornar tal cual
    if (fullPrompt.length <= MAX_LENGTH) {
      return fullPrompt
    }
    
    console.log(`[VIDEO GENERATOR] Prompt too long (${fullPrompt.length} chars), optimizing for Runway (max ${MAX_LENGTH})...`)
    
    // Dividir en líneas y priorizar
    const lines = fullPrompt.split('\n')
    const importantParts: string[] = []
    const optionalParts: string[] = []
    
    // Identificar líneas importantes (acción, personajes, ubicación, estilo)
    for (const line of lines) {
      const lowerLine = line.toLowerCase().trim()
      if (
        lowerLine.includes('[action') ||
        lowerLine.includes('action sequence') ||
        lowerLine.includes('[character') ||
        lowerLine.includes('[scene') ||
        lowerLine.includes('[location') ||
        lowerLine.includes('[film style') ||
        lowerLine.includes('[lighting') ||
        lowerLine.includes('[camera') ||
        lowerLine.startsWith('scene:') ||
        lowerLine.startsWith('location:') ||
        lowerLine.includes('action:') ||
        (lowerLine.length < 100 && lowerLine.includes(':')) // Líneas cortas con información clave
      ) {
        importantParts.push(line)
      } else if (line.trim().length > 0) {
        optionalParts.push(line)
      }
    }
    
    // Construir prompt optimizado: primero lo importante
    let optimized = importantParts.join('\n')
    
    // Si aún hay espacio, añadir partes opcionales más concisas
    if (optimized.length < MAX_LENGTH * 0.7) {
      // Añadir partes opcionales pero truncar líneas muy largas
      for (const part of optionalParts) {
        const truncatedPart = part.length > 150 ? part.substring(0, 150) + '...' : part
        if ((optimized + '\n' + truncatedPart).length <= MAX_LENGTH - 10) {
          optimized += '\n' + truncatedPart
        } else {
          break
        }
      }
    }
    
    // Si aún es muy largo, truncar directamente manteniendo las partes importantes
    if (optimized.length > MAX_LENGTH) {
      // Priorizar las primeras líneas (más importantes)
      const importantLines = optimized.split('\n')
      optimized = ''
      for (const line of importantLines) {
        if ((optimized + '\n' + line).length <= MAX_LENGTH - 10) {
          optimized += (optimized ? '\n' : '') + line
        } else {
          // Truncar la línea actual si es necesario
          const remaining = MAX_LENGTH - optimized.length - 10
          if (remaining > 50) {
            optimized += '\n' + line.substring(0, remaining) + '...'
          }
          break
        }
      }
    }
    
    // Asegurar que no exceda el límite
    if (optimized.length > MAX_LENGTH) {
      optimized = optimized.substring(0, MAX_LENGTH - 3) + '...'
    }
    
    console.log(`[VIDEO GENERATOR] ✅ Optimized prompt: ${optimized.length} characters (was ${fullPrompt.length})`)
    return optimized.trim()
  }
  
  /**
   * Genera el video con Runway
   */
  private async generateVideo(
    prompt: string,
    referenceImage: string | null,
    duration: number
  ): Promise<{ video_url: string }> {
    // Usar image_to_video si hay imagen, text_to_video si no
    const endpoint = referenceImage
      ? 'https://api.dev.runwayml.com/v1/image_to_video'
      : 'https://api.dev.runwayml.com/v1/text_to_video'
    
    // Verificar que la URL de imagen sea accesible antes de usarla
    let useImageToVideo = false
    let validImageUrl: string | null = null
    
    if (referenceImage && !referenceImage.includes('placeholder.com') && !referenceImage.startsWith('placeholder://')) {
      try {
        // Verificar que la URL sea accesible con un HEAD request
        const controller = new AbortController()
        const timeoutId = setTimeout(() => controller.abort(), 5000)
        
        const testResponse = await fetch(referenceImage, { 
          method: 'HEAD',
          signal: controller.signal
        })
        
        clearTimeout(timeoutId)
        
        if (testResponse.ok) {
          useImageToVideo = true
          validImageUrl = referenceImage
          console.log('[CINEMATIC VIDEO] Image URL is accessible, using image_to_video')
        } else {
          console.warn('[CINEMATIC VIDEO] Image URL returned status', testResponse.status, ', using text_to_video')
        }
      } catch (error) {
        console.warn('[CINEMATIC VIDEO] Could not verify image URL, using text_to_video:', error)
      }
    } else if (referenceImage) {
      console.warn('[CINEMATIC VIDEO] Image URL is a placeholder, using text_to_video')
    }
    
    const endpoint = useImageToVideo
      ? 'https://api.dev.runwayml.com/v1/image_to_video'
      : 'https://api.dev.runwayml.com/v1/text_to_video'
    
    // ⭐ Runway espera ratio simplificado: "16:9" no "1280:720"
    const body: any = {
      model: 'gen3a_turbo',
      promptText: prompt.substring(0, 1000),
      ratio: '16:9', // Runway espera "16:9" no "1280:720"
      duration: 10,
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
        'Authorization': `Bearer ${this.videoApiKey}`,
        'X-Runway-Version': '2024-11-06'
      },
      body: JSON.stringify(body)
    })
    
    if (!response.ok) {
      throw new Error(`Runway error: ${await response.text()}`)
    }
    
    const data = await response.json()
    
    // Polling
    const videoUrl = await this.pollForVideo(data.id || data.task_id)
    
    return { video_url: videoUrl }
  }
  
  private async pollForVideo(taskId: string): Promise<string> {
    const maxAttempts = 120
    let attempts = 0
    
    while (attempts < maxAttempts) {
      const response = await fetch(`https://api.dev.runwayml.com/v1/tasks/${taskId}`, {
        headers: {
          'Authorization': `Bearer ${this.videoApiKey}`,
          'X-Runway-Version': '2024-11-06'
        }
      })
      
      const data = await response.json()
      
      if (data.status === 'SUCCEEDED') {
        return data.output?.[0] || data.output_url
      } else if (data.status === 'FAILED') {
        throw new Error(`Video generation failed: ${data.failure || 'Unknown error'}`)
      }
      
      await this.sleep(5000)
      attempts++
    }
    
    throw new Error('Video generation timeout')
  }
  
  private async saveProgress(current: number, total: number, videos: any[]): Promise<void> {
    await this.supabase
      .from('movies')
      .update({
        progress: Math.round((current / total) * 50) + 20, // 20-70%
        metadata: {
          ...(await this.getCurrentMetadata()),
          generated_videos: videos
        }
      })
      .eq('id', this.movieId)
  }
  
  private async getCurrentMetadata(): Promise<any> {
    const { data } = await this.supabase
      .from('movies')
      .select('metadata')
      .eq('id', this.movieId)
      .single()
    
    return data?.metadata || {}
  }
  
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms))
  }
}

export interface GeneratedVideo {
  scene_number: number
  scene_id: string
  video_url: string
  start_frame_url: string | null
  last_frame_url: string | null
  duration: number
  prompt_used: string
  status: 'pending' | 'completed' | 'failed'
}
