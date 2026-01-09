// src/lib/movie-generation/professional-assembler.ts

import { VisualBible } from './creative-director'
import { DetailedScreenplay } from './cinematic-screenwriter'
import { GeneratedVideo } from './cinematic-video-generator'
import { GeneratedAudio } from './cinematic-audio-generator'

export class ProfessionalMovieAssembler {
  private supabase: any
  private movieId: string
  private visualBible: VisualBible
  
  constructor(supabase: any, movieId: string, visualBible: VisualBible) {
    this.supabase = supabase
    this.movieId = movieId
    this.visualBible = visualBible
  }
  
  /**
   * Ensambla la película con transiciones imperceptibles
   */
  async assemble(
    videos: GeneratedVideo[],
    audioTracks: GeneratedAudio[],
    screenplay: DetailedScreenplay,
    music: { url: string } | null
  ): Promise<string> {
    console.log('[ASSEMBLER] Starting professional assembly...')
    
    // Ordenar por número de escena
    const sortedVideos = [...videos]
      .filter(v => v.status === 'completed' && v.video_url)
      .sort((a, b) => a.scene_number - b.scene_number)
    
    if (sortedVideos.length === 0) {
      throw new Error('No videos to assemble')
    }
    
    // 1. Determinar transiciones según el guión
    const transitions = this.determineTransitions(screenplay)
    
    // 2. Crear comando FFmpeg complejo
    const ffmpegCommand = this.buildFFmpegCommand(
      sortedVideos,
      audioTracks,
      transitions,
      music
    )
    
    console.log('[ASSEMBLER] FFmpeg command built')
    console.log('[ASSEMBLER] Transitions:', transitions.map(t => t.type).join(', '))
    
    // ⚠️ SOLUCIÓN TEMPORAL: Como el ensamblaje real con FFmpeg no está implementado,
    // usamos la primera escena como video principal temporalmente
    // En producción, esto debería ensamblar todos los videos con FFmpeg
    
    // ⭐ USAR ENSAMBLADOR REAL CON SERVIDOR FFMPEG
    console.log('[ASSEMBLER] ==========================================')
    console.log('[ASSEMBLER] Starting REAL assembly with FFmpeg server...')
    console.log(`[ASSEMBLER] Movie ID: ${this.movieId}`)
    console.log(`[ASSEMBLER] Valid videos: ${sortedVideos.length}`)
    
    // Preparar videos para el ensamblador real
    const videosForAssembly = sortedVideos.map(v => ({
      scene_number: v.scene_number,
      video_url: v.video_url as string,
      is_continuation: false, // Se puede determinar desde screenplay si es necesario
      status: 'completed',
    }))
    
    // Llamar al servidor de ensamblaje FFmpeg
    const serverUrl = process.env.ASSEMBLY_SERVER_URL
    const apiKey = process.env.ASSEMBLY_API_KEY
    
    if (!serverUrl || !apiKey) {
      console.error('[ASSEMBLER] ❌ Assembly server not configured')
      console.error('[ASSEMBLER] Required env vars: ASSEMBLY_SERVER_URL, ASSEMBLY_API_KEY')
      throw new Error('Assembly server not configured. Set ASSEMBLY_SERVER_URL and ASSEMBLY_API_KEY environment variables.')
    }
    
    console.log(`[ASSEMBLER] Calling assembly server: ${serverUrl}`)
    
    try {
      // Timeout de 10 minutos para el ensamblaje (puede tardar mucho tiempo)
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 10 * 60 * 1000) // 10 minutos
      
      console.log(`[ASSEMBLY] Sending ${videosForAssembly.length} videos to assembly server...`)
      
      const response = await fetch(`${serverUrl}/assemble`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        signal: controller.signal,
        body: JSON.stringify({
          movie_id: this.movieId,
          api_key: apiKey,
          videos: videosForAssembly.map(v => ({
            scene_number: v.scene_number,
            video_url: v.video_url,
            is_continuation: v.is_continuation || false,
          })),
        }),
      })
      
      clearTimeout(timeoutId)
      
      if (!response.ok) {
        let errorText = ''
        try {
          errorText = await response.text()
        } catch (e) {
          errorText = `HTTP ${response.status} ${response.statusText}`
        }
        console.error(`[ASSEMBLER] ❌ Server error (${response.status}): ${errorText}`)
        throw new Error(`Assembly server error (${response.status}): ${errorText}`)
      }
      
      const result = await response.json()
      
      if (!result.success || !result.video_url) {
        const errorMsg = result.error || 'Assembly failed without error message'
        console.error(`[ASSEMBLER] ❌ Assembly failed: ${errorMsg}`)
        
        // Fallback temporal: usar primera escena
        console.warn(`[ASSEMBLER] ⚠️ Falling back to first scene as temporary solution`)
        const temporaryVideoUrl = sortedVideos[0].video_url as string
        
        if (!temporaryVideoUrl) {
          throw new Error(`Assembly failed and no fallback video available: ${errorMsg}`)
        }
        
        // Guardar metadata indicando que el ensamblaje real falló
        await this.supabase
          .from('movies')
          .update({
            metadata: {
              ...(await this.getCurrentMetadata()),
              assembly_status: 'failed_real_assembly',
              assembly_error: errorMsg,
              scene_videos: sortedVideos.map(v => ({ 
                scene_number: v.scene_number, 
                video_url: v.video_url 
              })),
              note: 'Real assembly failed, using first scene as temporary solution.',
            },
          })
          .eq('id', this.movieId)
        
        return temporaryVideoUrl
      }
      
      console.log(`[ASSEMBLER] ==========================================`)
      console.log(`[ASSEMBLER] ✅ REAL ASSEMBLY SUCCESSFUL!`)
      console.log(`[ASSEMBLER]   - URL: ${result.video_url}`)
      console.log(`[ASSEMBLER]   - Duration: ${result.duration_seconds}s`)
      console.log(`[ASSEMBLER]   - Size: ${(result.file_size_bytes / 1024 / 1024).toFixed(2)} MB`)
      console.log(`[ASSEMBLER]   - Scenes: ${result.scenes_count || videosForAssembly.length}`)
      console.log(`[ASSEMBLER]   - Elapsed: ${result.elapsed_seconds?.toFixed(2)}s`)
      console.log(`[ASSEMBLER] ==========================================`)
      
      // Guardar metadata de éxito
      await this.supabase
        .from('movies')
        .update({
          metadata: {
            ...(await this.getCurrentMetadata()),
            assembly_status: 'completed',
            assembly_duration: result.duration_seconds,
            assembly_size: result.file_size_bytes,
            assembly_elapsed: result.elapsed_seconds,
            assembled_at: new Date().toISOString(),
          },
        })
        .eq('id', this.movieId)
      
      return result.video_url
      
    } catch (error: any) {
      console.error(`[ASSEMBLER] ==========================================`)
      console.error(`[ASSEMBLER] ❌ EXCEPTION during assembly`)
      console.error(`[ASSEMBLER] Error: ${error.message}`)
      if (error.name === 'AbortError') {
        console.error(`[ASSEMBLER] Request timed out after 10 minutes`)
      }
      if (error.stack) {
        console.error(`[ASSEMBLER] Stack: ${error.stack}`)
      }
      console.error(`[ASSEMBLER] ==========================================`)
      
      // Si es un error de timeout o conexión, verificar si el servidor está disponible
      if (error.name === 'AbortError' || error.message.includes('fetch')) {
        try {
          const healthCheck = await fetch(`${serverUrl}/health`, { signal: AbortSignal.timeout(5000) })
          if (!healthCheck.ok) {
            console.error(`[ASSEMBLER] ⚠️ Assembly server health check failed: ${healthCheck.status}`)
          }
        } catch (healthError) {
          console.error(`[ASSEMBLER] ⚠️ Cannot reach assembly server: ${healthError}`)
        }
      }
      
      // Fallback temporal: usar primera escena
      console.warn(`[ASSEMBLER] ⚠️ Using first scene as fallback due to exception`)
      const temporaryVideoUrl = sortedVideos[0]?.video_url as string
      
      if (!temporaryVideoUrl) {
        throw new Error(`Assembly exception and no fallback available: ${error.message}`)
      }
      
      // Guardar metadata del error
      try {
        await this.supabase
          .from('movies')
          .update({
            metadata: {
              ...(await this.getCurrentMetadata()),
              assembly_status: 'exception',
              assembly_error: error.message,
              assembly_error_type: error.name || 'Unknown',
              scene_videos: sortedVideos.map(v => ({ 
                scene_number: v.scene_number, 
                video_url: v.video_url 
              })),
              note: 'Assembly exception occurred, using first scene as fallback.',
            },
          })
          .eq('id', this.movieId)
      } catch (metadataError) {
        console.warn(`[ASSEMBLER] ⚠️ Could not save error metadata: ${metadataError}`)
      }
      
      return temporaryVideoUrl
    }
  }
  
  /**
   * Determina el tipo de transición entre cada escena según el guión
   */
  private determineTransitions(screenplay: DetailedScreenplay): SceneTransition[] {
    const transitions: SceneTransition[] = []
    
    for (let i = 0; i < screenplay.scenes.length - 1; i++) {
      const scene = screenplay.scenes[i]
      const nextScene = screenplay.scenes[i + 1]
      
      // Usar la transición definida en el guión
      const transitionType = scene.transition?.type || 'CROSSFADE'
      const durationFrames = scene.transition?.duration_frames || 12
      
      // Determinar duración según el tipo
      let durationMs = 500 // Default crossfade
      
      switch (transitionType.toUpperCase()) {
        case 'CORTE':
        case 'CUT':
          durationMs = 0
          break
        case 'FUNDIDO':
        case 'FADE':
          durationMs = 1000
          break
        case 'ENCADENADO':
        case 'CROSSFADE':
        case 'DISSOLVE':
          durationMs = 500
          break
        case 'BARRIDO':
        case 'WIPE':
          durationMs = 750
          break
      }
      
      transitions.push({
        from_scene: scene.scene_number,
        to_scene: nextScene.scene_number,
        type: transitionType,
        duration_ms: durationMs,
        duration_frames: durationFrames
      })
    }
    
    return transitions
  }
  
  /**
   * Construye el comando FFmpeg complejo para ensamblaje profesional
   */
  private buildFFmpegCommand(
    videos: GeneratedVideo[],
    audioTracks: GeneratedAudio[],
    transitions: SceneTransition[],
    music: { url: string } | null
  ): FFmpegCommand {
    /*
    Estructura del comando FFmpeg:
    
    1. Inputs: Todos los videos + audio + música
    2. Filter complex:
       - Normalizar todos los videos (mismo codec, fps, resolución)
       - Aplicar transiciones (xfade, fade, etc)
       - Mezclar audio (diálogos + ambiente + música)
       - Color grading básico
    3. Output: Video final con audio mezclado
    */
    
    const inputs: string[] = []
    const filterComplex: string[] = []
    
    // Añadir inputs de video
    videos.forEach((video, i) => {
      inputs.push(`-i "${video.video_url}"`)
    })
    
    // Añadir input de música si existe
    if (music?.url) {
      inputs.push(`-i "${music.url}"`)
    }
    
    // Construir filter complex para videos
    // Normalizar todos los videos
    videos.forEach((_, i) => {
      filterComplex.push(
        `[${i}:v]fps=24,scale=1920:1080:force_original_aspect_ratio=decrease,` +
        `pad=1920:1080:(ow-iw)/2:(oh-ih)/2,setsar=1[v${i}]`
      )
    })
    
    // Concatenar con transiciones
    let currentOutput = '[v0]'
    
    for (let i = 0; i < transitions.length; i++) {
      const transition = transitions[i]
      const nextInput = `[v${i + 1}]`
      const outputLabel = `[vt${i}]`
      
      if (transition.type.toUpperCase() === 'CORTE' || transition.type.toUpperCase() === 'CUT') {
        // Corte directo - solo concatenar
        filterComplex.push(
          `${currentOutput}${nextInput}concat=n=2:v=1:a=0${outputLabel}`
        )
      } else {
        // Transición con xfade
        const transitionName = this.mapTransitionToFFmpeg(transition.type)
        const offsetSeconds = 10 - (transition.duration_ms / 1000) // Asumiendo videos de 10s
        
        filterComplex.push(
          `${currentOutput}${nextInput}xfade=transition=${transitionName}:` +
          `duration=${transition.duration_ms / 1000}:offset=${offsetSeconds}${outputLabel}`
        )
      }
      
      currentOutput = outputLabel
    }
    
    // Audio mixing
    // Mezclar diálogos con música de fondo
    const audioFilter = music?.url
      ? `[${videos.length}:a]volume=0.3[music];` +
        `[0:a][music]amix=inputs=2:duration=longest[aout]`
      : `[0:a]anull[aout]`
    
    filterComplex.push(audioFilter)
    
    return {
      inputs: inputs.join(' '),
      filter_complex: filterComplex.join(';'),
      output_options: '-c:v libx264 -preset slow -crf 18 -c:a aac -b:a 192k -movflags +faststart',
      output_file: `output_${this.movieId}.mp4`
    }
  }
  
  /**
   * Mapea tipos de transición a filtros FFmpeg
   */
  private mapTransitionToFFmpeg(type: string): string {
    const map: Record<string, string> = {
      'CROSSFADE': 'fade',
      'ENCADENADO': 'fade',
      'DISSOLVE': 'dissolve',
      'FUNDIDO': 'fade',
      'FADE': 'fade',
      'BARRIDO': 'wipeleft',
      'WIPE': 'wipeleft',
      'FADEBLACK': 'fadeblack',
      'FADEWHITE': 'fadewhite'
    }
    
    return map[type.toUpperCase()] || 'fade'
  }
  
  /**
   * Ejecuta el ensamblaje con FFmpeg
   * ⚠️ TEMPORAL: Por ahora retorna la URL del primer video como solución rápida
   * En producción, esto debería realmente ensamblar los videos con FFmpeg y subirlos a storage
   */
  private async executeFFmpegAssembly(command: FFmpegCommand): Promise<string> {
    console.log('[ASSEMBLER] Executing FFmpeg assembly...')
    console.log('[ASSEMBLER] Filter complex length:', command.filter_complex.length)
    
    // TODO: Implementar llamada real a FFmpeg
    // Opciones:
    // 1. Cloudflare Workers con FFmpeg WASM
    // 2. AWS Lambda con FFmpeg layer
    // 3. Servidor dedicado con FFmpeg
    
    // ⚠️ SOLUCIÓN TEMPORAL: Usar la primera escena como video completo
    // En producción, esto debería ensamblar todos los videos y subirlos a storage real
    // Por ahora, retornamos null para que el frontend use las escenas individuales
    
    console.log('[ASSEMBLER] ⚠️ TEMPORAL: FFmpeg assembly not implemented, returning null')
    console.log('[ASSEMBLER] Video will be played scene by scene in the frontend')
    
    // Retornar null para indicar que no hay video ensamblado
    // El frontend debería manejar esto mostrando las escenas individuales
    return null as any
  }
  
  /**
   * Aplica color grading unificado a toda la película
   */
  private async applyColorGrading(videoUrl: string): Promise<string> {
    console.log('[ASSEMBLER] Applying color grading...')
    
    // El color grading se basa en la Biblia Visual
    const palette = this.visualBible.color_palette
    
    // Construir LUT (Look-Up Table) basada en la paleta
    // En producción, esto aplicaría un filtro FFmpeg de color
    
    // Placeholder - retornar mismo URL
    return videoUrl
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

export interface SceneTransition {
  from_scene: number
  to_scene: number
  type: string
  duration_ms: number
  duration_frames: number
}

export interface FFmpegCommand {
  inputs: string
  filter_complex: string
  output_options: string
  output_file: string
}
