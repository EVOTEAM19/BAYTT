import { SupabaseClient } from '@supabase/supabase-js'
import { getProviderWithKey } from '@/lib/ai/config'
import { CreativeDirector, VisualBible } from './creative-director'
import { CreativeDirectorV2 } from './creative-director-v2'
import { CinematicScreenwriter, DetailedScreenplay } from './cinematic-screenwriter'
import { CinematicVideoGenerator } from './cinematic-video-generator'
import { VideoGeneratorV2 } from './video-generator-v2'
import { CinematicAudioGenerator } from './cinematic-audio-generator'
import { AudioProcessor } from './audio-processor'
import { LocationManager } from '@/lib/locations/location-manager'
import { ProfessionalMovieAssembler } from './professional-assembler'

// ============================================
// PIPELINE DE GENERACIÓN DE PELÍCULA
// ============================================

export class MovieGenerationPipeline {
  private movieId: string
  private supabase: SupabaseClient
  private movie: any
  private providers: Map<string, any> = new Map()
  
  constructor(movieId: string, supabase: SupabaseClient) {
    this.movieId = movieId
    this.supabase = supabase
  }
  
  async execute(): Promise<void> {
    const startTime = Date.now()
    console.log(`[PIPELINE] ========== STARTING PIPELINE FOR MOVIE: ${this.movieId} ==========`)
    console.log(`[PIPELINE] Timestamp: ${new Date().toISOString()}`)
    
    try {
      // ==========================================
      // PASO 0: VALIDAR PROVEEDORES (marcar como iniciado INMEDIATAMENTE)
      // ==========================================
      await this.updateProgress('validate_providers', 'running', 0, 'Validando proveedores...')
      console.log(`[PIPELINE] Step 0: Validating providers...`)
      
      // Cargar datos iniciales
      console.log(`[PIPELINE] Step 0.1: Loading movie data...`)
      await this.loadMovie()
      console.log(`[PIPELINE] Step 0.1: ✅ Movie loaded: ${this.movie.title}`)
      
      console.log(`[PIPELINE] Step 0.2: Loading providers...`)
      await this.loadProviders()
      console.log(`[PIPELINE] Step 0.2: ✅ Loaded ${this.providers.size} providers`)
      
      // Validar que tenemos los proveedores necesarios
      const requiredTypes = ['llm', 'video', 'audio']
      const missing = requiredTypes.filter(type => !this.providers.has(type))
      if (missing.length > 0) {
        throw new Error(`Faltan proveedores requeridos: ${missing.join(', ')}`)
      }
      
      // Marcar como completado
      await this.updateProgress('validate_providers', 'completed', 100, 'Proveedores validados')
      console.log(`[PIPELINE] Step 0: ✅ Providers validated`)
      
      // ==========================================
      // PASO 0.5: PLANIFICAR PRODUCCIÓN (NUEVO SISTEMA V2)
      // ==========================================
      await this.updateProgress('plan_production', 'running', 0, 'Planificando producción y recursos...')
      
      const llmProvider = this.providers.get('llm')
      if (!llmProvider) throw new Error('LLM provider not configured')
      
      const llmProviderWithKey = await getProviderWithKey(llmProvider.id)
      if (!llmProviderWithKey || !llmProviderWithKey.apiKey) {
        throw new Error('Failed to get LLM provider API key')
      }
      
      const creativeDirectorV2 = new CreativeDirectorV2(
        this.supabase,
        llmProviderWithKey.apiKey,
        this.movieId
      )
      
      const productionPlan = await creativeDirectorV2.planProduction(
        this.movie.title,
        this.movie.user_prompt || this.movie.prompt || '',
        this.movie.genre || 'drama'
      )
      
      console.log(`[PIPELINE] Step 0.5: ✅ Production plan created`)
      console.log(`  - ${productionPlan.locations.length} locations planned`)
      console.log(`  - ${productionPlan.characters.length} characters assigned`)
      console.log(`  - ${productionPlan.continuity.filter(c => c.is_continuation).length} continuous scenes`)
      
      // Crear/buscar lugares faltantes
      let imageProviderWithKey: any = null
      const imageProvider = this.providers.get('image')
      if (imageProvider) {
        imageProviderWithKey = await getProviderWithKey(imageProvider.id)
        if (imageProviderWithKey?.apiKey) {
          const locationManager = new LocationManager(this.supabase, imageProviderWithKey.apiKey)
          
          for (const locReq of productionPlan.locations) {
            if (!locReq.found_in_library && locReq.needs_generation) {
              try {
                let locationId: string | undefined = locReq.library_location_id
                
                // Buscar en web primero si es necesario
                if (locReq.needs_web_search) {
                  const webImages = await locationManager.searchWebForLocation(locReq.location_name)
                  if (webImages.length > 0) {
                    locationId = await locationManager.createLocation(
                      locReq.location_name,
                      locReq.location_description,
                      'unknown',
                      webImages
                    )
                  }
                }
                
                // Si no hay imágenes de web, generar
                if (!locationId) {
                  const generatedImages = await locationManager.generateLocationImages(
                    locReq.location_name,
                    locReq.location_description,
                    5
                  )
                  if (generatedImages.length > 0) {
                    locationId = await locationManager.createLocation(
                      locReq.location_name,
                      locReq.location_description,
                      'unknown',
                      generatedImages
                    )
                  }
                }
                
                // Actualizar plan de continuidad con location_id
                if (locationId) {
                  productionPlan.continuity.forEach(c => {
                    if (locReq.scene_numbers.includes(c.scene_number)) {
                      c.location_id = locationId || null
                    }
                  })
                }
              } catch (error) {
                console.error(`[PIPELINE] Error creating location ${locReq.location_name}:`, error)
              }
            }
          }
        }
      }
      
      // Asignar location_id a continuity plan basándose en location_name si no se asignó
      for (const locReq of productionPlan.locations) {
        if (locReq.library_location_id) {
          productionPlan.continuity.forEach(c => {
            // Si la escena usa este lugar, asignar location_id
            if (locReq.scene_numbers.includes(c.scene_number) && !c.location_id) {
              c.location_id = locReq.library_location_id || null
            }
          })
        }
      }
      
      await this.updateProgress('plan_production', 'completed', 100, 'Producción planificada')
      
      // Pequeña pausa para que el frontend actualice
      await this.sleep(500)
      
      // ==========================================
      // PASO 1: CREAR BIBLIA VISUAL (NUEVO SISTEMA)
      // ==========================================
      await this.updateProgress('create_visual_bible', 'running', 0, 'Creando Biblia Visual con Director Creativo...')
      
      // Reutilizar llmProvider y llmProviderWithKey ya obtenidos en paso 0.5
      const creativeDirector = new CreativeDirector(
        this.supabase,
        llmProviderWithKey.apiKey,
        this.movieId
      )
      
      const visualBible = await creativeDirector.createVisualBible(
        this.movie.title,
        this.movie.user_prompt || this.movie.prompt || '',
        this.movie.genre || 'drama',
        this.movie.duration_minutes || this.movie.target_duration_minutes || 60
      )
      
      await this.updateProgress('create_visual_bible', 'completed', 100, 'Biblia Visual completada')
      
      // Pequeña pausa para que el frontend actualice
      await this.sleep(500)
      
      // ==========================================
      // PASO 2: GENERAR GUIÓN CINEMATOGRÁFICO DETALLADO
      // ==========================================
      await this.updateProgress('generate_screenplay', 'running', 0, 'Generando guión cinematográfico detallado...')
      
      const screenwriter = new CinematicScreenwriter(
        this.supabase,
        llmProviderWithKey.apiKey,
        this.movieId,
        visualBible
      )
      
      const detailedScreenplay = await screenwriter.writeScreenplay(
        this.movie.user_prompt || this.movie.prompt || '',
        this.movie.duration_minutes || this.movie.target_duration_minutes || 60
      )
      
      // Convertir a formato legacy para compatibilidad con funciones existentes
      const screenplay = {
        scenes: detailedScreenplay.scenes.map((scene: any) => ({
          scene_number: scene.scene_number,
          location: scene.header?.location || '',
          time_of_day: scene.header?.time || 'DAY',
          characters: scene.characters_in_scene?.map((c: any) => c.character_name) || [],
          action: scene.action_description?.summary || '',
          dialogue: scene.dialogue?.map((d: any) => ({
            character: d.character,
            line: d.line
          })) || [],
          duration_seconds: scene.duration?.screen_time_seconds || 10,
          // Guardar también el objeto completo para uso avanzado
          detailed: scene
        }))
      }
      
      // ⭐ GUARDAR GUIÓN Y ESCENAS EN BD
      await this.saveScreenplay(screenplay)
      
      // También guardar el guión detallado
      const { error: detailedError } = await this.supabase
        .from('movies')
        .update({ 
          metadata: {
            ...(await this.getCurrentMetadata()),
            screenplay_detailed: detailedScreenplay
          }
        })
        .eq('id', this.movieId)
      
      if (detailedError) {
        console.warn('[PIPELINE] Could not save detailed screenplay:', detailedError.message)
      }
      
      await this.updateProgress('generate_screenplay', 'completed', 100, `${screenplay.scenes?.length || 0} escenas generadas`)
      
      // Pequeña pausa para que el frontend actualice
      await this.sleep(500)
      
      // ==========================================
      // PASO 3: ASIGNAR PERSONAJES
      // ==========================================
      await this.updateProgress('assign_characters', 'running', 0, 'Extrayendo personajes del guión...')
      const characters = await this.selectCharacters(screenplay)
      await this.updateProgress('assign_characters', 'running', 50, 'Generando imágenes de personajes...')
      await this.generateCharacterImages(characters)
      await this.updateProgress('assign_characters', 'completed', 100, `${characters.length} personajes asignados`)
      
      // Pequeña pausa para que el frontend actualice
      await this.sleep(500)
      
      // ==========================================
      // PASO 4: GENERAR VIDEOS CON CONTINUIDAD PERFECTA (SISTEMA V2)
      // ==========================================
      await this.updateProgress('generate_videos', 'running', 0, `Generando ${detailedScreenplay.scenes.length} videos con continuidad...`)
      
      const videoProvider = this.providers.get('video')
      if (!videoProvider) throw new Error('Video provider not configured')
      
      const videoProviderWithKey = await getProviderWithKey(videoProvider.id)
      if (!videoProviderWithKey || !videoProviderWithKey.apiKey) {
        throw new Error('Failed to get video provider API key')
      }
      
      // Reutilizar imageProviderWithKey ya obtenido en paso 0.5
      if (!imageProviderWithKey || !imageProviderWithKey.apiKey) {
        throw new Error('Image provider not configured')
      }
      
      // ⭐ ASEGURAR que tenemos continuity plan para TODAS las escenas del guión
      // El plan inicial puede tener menos escenas que el guión final
      for (let i = 0; i < detailedScreenplay.scenes.length; i++) {
        const scene = detailedScreenplay.scenes[i]
        const existingPlan = productionPlan.continuity.find(c => c.scene_number === scene.scene_number)
        
        if (!existingPlan) {
          console.log(`[PIPELINE] Creating continuity plan for scene ${scene.scene_number} (missing from initial plan)`)
          const newPlan: any = {
            scene_number: scene.scene_number,
            is_continuation: i > 0,
            continues_from: i > 0 ? i : null,
            location_id: null,
            needs_reference_frame: i > 0,
            reference_frame_source: i > 0 ? 'previous_scene' : 'generate'
          }
          
          // Intentar encontrar location_id desde el header de la escena
          if (scene.header?.location) {
            const matchingLocation = productionPlan.locations.find(loc => 
              loc.location_name.toLowerCase().includes(scene.header.location.toLowerCase()) ||
              scene.header.location.toLowerCase().includes(loc.location_name.toLowerCase())
            )
            if (matchingLocation?.library_location_id) {
              newPlan.location_id = matchingLocation.library_location_id
            }
          }
          
          productionPlan.continuity.push(newPlan)
        }
      }
      
      console.log(`[PIPELINE] Continuity plans ready for ${productionPlan.continuity.length} scenes`)
      
      // Usar VideoGeneratorV2 con sistema de continuidad mejorado
      // ⭐ Pasar el proveedor completo para usar su configuración (api_url, api_version, config)
      const videoGeneratorV2 = new VideoGeneratorV2(
        this.supabase,
        videoProviderWithKey.apiKey,
        imageProviderWithKey.apiKey,
        this.movieId,
        videoProviderWithKey // Pasar el proveedor completo con configuración
      )
      
      const videos: any[] = []
      let previousEndFrame: string | null = null
      
      // Generar videos escena por escena con continuidad
      for (let i = 0; i < detailedScreenplay.scenes.length; i++) {
        const scene = detailedScreenplay.scenes[i]
        const continuityPlan = productionPlan.continuity.find(
          c => c.scene_number === scene.scene_number
        )
        
        if (!continuityPlan) {
          console.error(`[PIPELINE] Still no continuity plan for scene ${scene.scene_number} after creation, skipping`)
          continue
        }
        
        try {
          console.log(`[PIPELINE] ==========================================`)
          console.log(`[PIPELINE] Generating video for scene ${scene.scene_number}/${detailedScreenplay.scenes.length}`)
          console.log(`[PIPELINE] Scene ID: ${scene.scene_id || 'N/A'}`)
          console.log(`[PIPELINE] Continuity plan:`, JSON.stringify(continuityPlan, null, 2))
          console.log(`[PIPELINE] Previous end frame: ${previousEndFrame ? 'EXISTS' : 'NULL'}`)
          console.log(`[PIPELINE] ==========================================`)
          
          const result = await videoGeneratorV2.generateSceneVideo(
            scene,
            continuityPlan,
            previousEndFrame
          )
          
          console.log(`[PIPELINE] Result from videoGeneratorV2:`, JSON.stringify({
            has_video_url: !!result?.video_url,
            video_url_length: result?.video_url?.length || 0,
            has_end_frame: !!result?.end_frame_url,
            end_frame_length: result?.end_frame_url?.length || 0
          }, null, 2))
          
          // ⭐ VALIDACIÓN CRÍTICA: Verificar que el video URL existe antes de continuar
          if (!result || !result.video_url || result.video_url.trim() === '' || 
              result.video_url === 'null' || result.video_url === 'undefined') {
            console.error(`[PIPELINE] ❌ CRITICAL: Scene ${scene.scene_number} returned invalid video URL!`)
            console.error(`[PIPELINE] Result object:`, JSON.stringify(result, null, 2))
            throw new Error(`Scene ${scene.scene_number}: Invalid video URL returned - ${result?.video_url || 'undefined'}`)
          }
          
          console.log(`[PIPELINE] ✅ Scene ${scene.scene_number} video generated successfully:`)
          console.log(`[PIPELINE]   - Video URL: ${result.video_url.substring(0, 100)}...`)
          console.log(`[PIPELINE]   - End Frame URL: ${result.end_frame_url ? result.end_frame_url.substring(0, 100) + '...' : 'NULL'}`)
          
          previousEndFrame = result.end_frame_url
          
          // ⭐ Los datos ya se guardaron en generateSceneVideo() con saveSceneData()
          // Solo necesitamos verificar que se guardaron correctamente
          console.log(`[PIPELINE] ✅ Scene ${scene.scene_number} data saved by VideoGeneratorV2`)
          console.log(`[PIPELINE]   - Video URL: ${result.video_url.substring(0, 80)}...`)
          console.log(`[PIPELINE]   - Reference source: ${result.reference_source}`)
          console.log(`[PIPELINE]   - End frame: ${result.end_frame_url ? 'YES' : 'NO'}`)
          
          videos.push({
            scene_number: scene.scene_number,
            scene_id: scene.scene_id,
            video_url: result.video_url,
            start_frame_url: result.reference_image_url,
            last_frame_url: result.end_frame_url,
            reference_image_url: result.reference_image_url,
            reference_source: result.reference_source,
            duration: scene.duration?.screen_time_seconds || 10,
            status: 'completed'
          })
          
          console.log(`[PIPELINE] ✅ Scene ${scene.scene_number} added to videos array with URL: ${result.video_url}`)
          
          // Actualizar progreso
          await this.updateProgress(
            'generate_videos',
            'running',
            Math.round((i + 1) / detailedScreenplay.scenes.length * 100),
            `Escena ${i + 1}/${detailedScreenplay.scenes.length} generada`
          )
        } catch (error: any) {
          console.error(`[PIPELINE] ❌ ERROR generating video for scene ${scene.scene_number}:`, error)
          console.error(`[PIPELINE] Error stack:`, error.stack)
          console.error(`[PIPELINE] Error message:`, error.message)
          
          // Marcar como fallida en el array de videos
          videos.push({
            scene_number: scene.scene_number,
            scene_id: scene.scene_id,
            video_url: null, // ⭐ CRÍTICO: null indica que NO hay video
            duration: scene.duration?.screen_time_seconds || 10,
            status: 'failed', // ⭐ CRÍTICO: status debe ser 'failed'
            error: error.message
          })
          
          console.log(`[PIPELINE] ❌ Scene ${scene.scene_number} marked as FAILED in videos array`)
          
          // Guardar error en movie_scenes
          const { data: existingScene } = await this.supabase
            .from('movie_scenes')
            .select('id')
            .eq('movie_id', this.movieId)
            .eq('scene_number', scene.scene_number)
            .maybeSingle()
          
          if (existingScene) {
            const updateResult = await this.supabase
              .from('movie_scenes')
              .update({
                status: 'failed', // ⭐ CRÍTICO: NO 'completed'
                error_message: error.message,
                video_url: null // ⭐ CRÍTICO: NO guardar URL vacía
              } as any)
              .eq('id', existingScene.id)
              .select()
            
            if (updateResult.error) {
              console.error(`[PIPELINE] ❌ Error updating failed scene ${scene.scene_number}:`, updateResult.error)
            } else {
              console.log(`[PIPELINE] ✅ Scene ${scene.scene_number} marked as FAILED in database`)
            }
          } else {
            // Insertar nueva escena con status failed
            const insertResult = await this.supabase
              .from('movie_scenes')
              .insert({
                movie_id: this.movieId,
                scene_number: scene.scene_number,
                scene_id: scene.scene_id || `SC${String(scene.scene_number).padStart(3, '0')}`,
                status: 'failed',
                error_message: error.message,
                video_url: null
              } as any)
              .select()
            
            if (insertResult.error) {
              console.error(`[PIPELINE] ❌ Error inserting failed scene ${scene.scene_number}:`, insertResult.error)
            } else {
              console.log(`[PIPELINE] ✅ Scene ${scene.scene_number} inserted as FAILED in database`)
            }
          }
        }
      }
      
      // Convertir a formato legacy para compatibilidad
      const videosLegacy = videos.map(v => ({
        scene_number: v.scene_number,
        video_url: v.video_url,
        duration: v.duration,
        scene_data: screenplay.scenes.find((s: any) => s.scene_number === v.scene_number),
        status: v.status
      }))
      
      // Videos ya guardados en movie_scenes durante la generación
      
      // Verificar si hay escenas fallidas
      const completedVideos = videos.filter(v => v.status === 'completed')
      const failedVideos = videos.filter(v => v.status === 'failed')
      
      if (failedVideos.length > 0) {
        await this.updateProgress(
          'generate_videos', 
          'completed', 
          100, 
          `${completedVideos.length}/${videos.length} videos generados (${failedVideos.length} fallidos)`
        )
      } else {
        await this.updateProgress('generate_videos', 'completed', 100, `${completedVideos.length} videos generados`)
      }
      
      // Pequeña pausa para que el frontend actualice
      await this.sleep(500)
      
      // ==========================================
      // PASO 5: GENERAR AUDIO Y APLICAR LIP SYNC (SISTEMA V2)
      // ==========================================
      await this.updateProgress('generate_audio', 'running', 0, 'Generando voces y sincronizando labios...')
      
      const audioProvider = this.providers.get('audio')
      if (!audioProvider) throw new Error('Audio provider not configured')
      
      const audioProviderWithKey = await getProviderWithKey(audioProvider.id)
      if (!audioProviderWithKey || !audioProviderWithKey.apiKey) {
        throw new Error('Failed to get audio provider API key')
      }
      
      // Obtener proveedor de lip sync
      const lipSyncProvider = this.providers.get('lip_sync')
      const lipSyncProviderWithKey = lipSyncProvider ? await getProviderWithKey(lipSyncProvider.id) : null
      const syncLabsApiKey = lipSyncProviderWithKey?.apiKey || ''
      
      // Usar AudioProcessor para procesar audio separado y aplicar lip sync
      const audioProcessor = new AudioProcessor(
        this.supabase,
        audioProviderWithKey.apiKey,
        syncLabsApiKey
      )
      
      const dialogueAudioDetailed: any[] = []
      
      // Procesar cada escena
      for (let i = 0; i < detailedScreenplay.scenes.length; i++) {
        const scene = detailedScreenplay.scenes[i]
        
        // Obtener escena de BD
        const { data: movieScene } = await this.supabase
          .from('movie_scenes')
          .select('id, video_url')
          .eq('movie_id', this.movieId)
          .eq('scene_number', scene.scene_number)
          .maybeSingle()
        
        if (!movieScene?.video_url) {
          console.warn(`[PIPELINE] No video URL for scene ${scene.scene_number}, skipping audio`)
          continue
        }
        
        // Extraer diálogos de la escena
        const dialogues = (scene.dialogue || []).map((d: any) => ({
          character: d.character,
          line: d.line || d.text || '',
          emotion: d.emotion,
          delivery: {
            pace: d.delivery?.pace || d.pace,
            volume: d.delivery?.volume || d.volume,
            tone: d.delivery?.tone || d.tone
          },
          timing: {
            start_second: d.timing?.start_second || d.start_second || 0,
            duration_seconds: d.timing?.duration_seconds || d.duration_seconds || 3
          }
        }))
        
        if (dialogues.length > 0) {
          try {
            console.log(`[PIPELINE] Processing ${dialogues.length} dialogues for scene ${scene.scene_number}`)
            
            const finalVideoUrl = await audioProcessor.processSceneDialogues(
              movieScene.id,
              dialogues,
              movieScene.video_url
            )
            
            // Actualizar escena con video final (con lip sync)
            await this.supabase
              .from('movie_scenes')
              .update({ video_url: finalVideoUrl })
              .eq('id', movieScene.id)
            
            // Obtener audios generados
            const { data: sceneAudios } = await this.supabase
              .from('scene_audio')
              .select('*')
              .eq('scene_id', movieScene.id)
            
            dialogueAudioDetailed.push({
              scene_number: scene.scene_number,
              dialogues: (sceneAudios || []).map((sa: any) => ({
                character: sa.character_name,
                line: sa.dialogue_text,
                audio_url: sa.audio_url,
                emotion: sa.emotion,
                delivery: {
                  pace: sa.pace,
                  volume: sa.volume,
                  tone: sa.tone
                },
                timing: {
                  start_second: sa.start_second,
                  duration_seconds: sa.duration_seconds
                }
              }))
            })
            
            // Actualizar progreso
            await this.updateProgress(
              'generate_audio',
              'running',
              Math.round((i + 1) / detailedScreenplay.scenes.length * 100),
              `Audio procesado para escena ${i + 1}/${detailedScreenplay.scenes.length}`
            )
          } catch (error: any) {
            console.error(`[PIPELINE] Error processing audio for scene ${scene.scene_number}:`, error)
          }
        }
      }
      
      // Convertir a formato legacy para compatibilidad
      const dialogueAudio = dialogueAudioDetailed.map((audio: any) => ({
        scene_number: audio.scene_number,
        dialogues: audio.dialogues.map((d: any) => ({
          character: d.character,
          line: d.line,
          audio_url: d.audio_url
        }))
      }))
      
      await this.updateProgress('generate_audio', 'completed', 100, 'Audios y lip sync completados')
      
      // Pequeña pausa para que el frontend actualice
      await this.sleep(500)
      
      // Pequeña pausa para que el frontend actualice
      await this.sleep(500)
      
      // ==========================================
      // PASO 7: GENERAR MÚSICA
      // ==========================================
      await this.updateProgress('generate_music', 'running', 0, 'Generando banda sonora...')
      const music = await this.generateMusic(screenplay)
      await this.updateProgress('generate_music', 'completed', 100, music ? 'Música generada' : 'Música omitida (sin proveedor)')
      
      // Pequeña pausa para que el frontend actualice
      await this.sleep(500)
      
      // ==========================================
      // PASO 8: ENSAMBLAR PELÍCULA PROFESIONALMENTE
      // ==========================================
      await this.updateProgress('assemble_movie', 'running', 0, 'Ensamblando videos con transiciones profesionales...')
      
      // ⭐ VALIDACIÓN CRÍTICA: Verificar que hay videos completados CON URL válida antes de ensamblar
      console.log(`[PIPELINE] Verifying videos before assembly...`)
      console.log(`[PIPELINE] Total videos in array: ${videos.length}`)
      videos.forEach(v => {
        console.log(`[PIPELINE] Scene ${v.scene_number}: status=${v.status}, video_url=${v.video_url ? 'EXISTS' : 'NULL/EMPTY'}`)
      })
      
      // Filtrar solo videos que tienen status='completed' Y video_url válido (no null, no empty, no 'undefined')
      const videosForAssembly = videos.filter(v => {
        const hasValidUrl = v.video_url && 
                           v.video_url.trim() !== '' && 
                           v.video_url !== 'null' && 
                           v.video_url !== 'undefined' &&
                           v.status === 'completed'
        
        if (!hasValidUrl && v.status === 'completed') {
          console.error(`[PIPELINE] ⚠️ Scene ${v.scene_number} marked as completed but has invalid video_url: "${v.video_url}"`)
        }
        
        return hasValidUrl
      })
      
      console.log(`[PIPELINE] Videos for assembly: ${videosForAssembly.length}/${videos.length}`)
      
      if (videosForAssembly.length === 0) {
        const failedCount = videos.filter(v => v.status === 'failed').length
        const invalidCount = videos.filter(v => v.status === 'completed' && (!v.video_url || v.video_url.trim() === '' || v.video_url === 'null')).length
        
        console.error('[PIPELINE] ❌ CRITICAL: No valid videos for assembly!')
        console.error(`[PIPELINE]   - Failed scenes: ${failedCount}`)
        console.error(`[PIPELINE]   - Completed but invalid: ${invalidCount}`)
        console.error(`[PIPELINE]   - Total scenes: ${videos.length}`)
        
        await this.updateProgress(
          'assemble_movie',
          'failed',
          0,
          `No se pueden ensamblar videos: ${failedCount} escenas fallaron y ${invalidCount} escenas marcadas como completadas pero sin video válido. Revisa los logs para ver errores de generación.`
        )
        throw new Error(`No videos to assemble: all scenes failed during video generation. Failed: ${failedCount}, Invalid: ${invalidCount}. Check FAL.AI balance and Runway API.`)
      }
      
      console.log(`[PIPELINE] ✅ ${videosForAssembly.length} valid videos ready for assembly`)
      
      const assembler = new ProfessionalMovieAssembler(
        this.supabase,
        this.movieId,
        visualBible
      )
      
      console.log(`[PIPELINE] Assembling ${videosForAssembly.length} videos...`)
      
      const finalVideoUrl = await assembler.assemble(
        videosForAssembly,
        dialogueAudioDetailed,
        detailedScreenplay,
        music
      )
      
      // Obtener metadata del ensamblaje desde la respuesta (si está disponible)
      // El assembler guarda metadata en la tabla movies, pero también la necesitamos aquí
      const { data: assemblyMovieData } = await this.supabase
        .from('movies')
        .select('metadata')
        .eq('id', this.movieId)
        .maybeSingle()
      
      const assemblyMeta = assemblyMovieData?.metadata || {}
      const assemblyMetadata = assemblyMeta.assembly_duration || assemblyMeta.assembly_size
        ? {
            duration_seconds: assemblyMeta.assembly_duration,
            file_size_bytes: assemblyMeta.assembly_size,
          }
        : {}
      
      // Actualizar película con URL final y metadata
      const updateData: any = {
        video_url: finalVideoUrl,
        ...(assemblyMetadata.duration_seconds && { duration_seconds: assemblyMetadata.duration_seconds }),
        ...(assemblyMetadata.file_size_bytes && { file_size_bytes: assemblyMetadata.file_size_bytes }),
      }
      
      await this.supabase
        .from('movies')
        .update(updateData)
        .eq('id', this.movieId)
      
      console.log(`[PIPELINE] ✅ Movie assembled and saved: ${finalVideoUrl}`)
      if (assemblyMetadata.duration_seconds) {
        console.log(`[PIPELINE]   - Duration: ${assemblyMetadata.duration_seconds}s`)
      }
      if (assemblyMetadata.file_size_bytes) {
        console.log(`[PIPELINE]   - Size: ${(assemblyMetadata.file_size_bytes / 1024 / 1024).toFixed(2)} MB`)
      }
      
      await this.updateProgress('assemble_movie', 'completed', 100, `Película ensamblada: ${finalVideoUrl.substring(0, 80)}...`)
      
      // Pequeña pausa para que el frontend actualice
      await this.sleep(500)
      
      // ==========================================
      // PASO 9: GENERAR PORTADA (si no existe)
      // ==========================================
      await this.updateProgress('generate_cover', 'running', 0, 'Verificando portada de la película...')
      
      // Verificar si ya existe portada
      const { data: movieCheck } = await this.supabase
        .from('movies')
        .select('thumbnail_url, poster_url')
        .eq('id', this.movieId)
        .maybeSingle()
      
      let cover = { poster_url: null, thumbnail_url: null }
      
      if (!movieCheck?.thumbnail_url && !movieCheck?.poster_url) {
        // No hay portada, generarla
        console.log('[PIPELINE] No cover found, generating new one...')
        await this.updateProgress('generate_cover', 'running', 50, 'Generando nueva portada...')
        cover = await this.generateCover()
        await this.updateProgress('generate_cover', 'completed', 100, cover.thumbnail_url ? 'Portada generada' : 'Portada no generada (sin proveedor de imagen)')
      } else {
        // Ya existe portada, usar la existente
        console.log('[PIPELINE] Cover already exists, using existing one')
        cover = {
          poster_url: movieCheck.poster_url || movieCheck.thumbnail_url,
          thumbnail_url: movieCheck.thumbnail_url || movieCheck.poster_url
        }
        await this.updateProgress('generate_cover', 'completed', 100, 'Portada verificada')
      }
      
      // Pequeña pausa para que el frontend actualice
      await this.sleep(500)
      
      // ==========================================
      // PASO 10: SUBIR ARCHIVOS Y FINALIZAR
      // ==========================================
      await this.updateProgress('finalize', 'running', 0, 'Subiendo archivos finales...')
      
      // El video ya está ensamblado, solo necesitamos subir la portada si se generó
      const uploadedUrls = {
        video_url: finalVideoUrl,
        poster_url: cover?.poster_url || null,
        thumbnail_url: cover?.thumbnail_url || cover?.poster_url || null
      }
      
      console.log('[PIPELINE] Uploaded URLs:', {
        video_url: uploadedUrls.video_url,
        poster_url: uploadedUrls.poster_url,
        thumbnail_url: uploadedUrls.thumbnail_url
      })
      
      await this.updateProgress('finalize', 'running', 50, 'Finalizando película...')
      await this.finalize(uploadedUrls)
      await this.updateProgress('finalize', 'completed', 100, '¡Película completada!')
      
      // ==========================================
      // COMPLETADO
      // ==========================================
      
      // ⭐ IMPORTANTE: Verificar si hay escenas fallidas antes de marcar como completado
      console.log('[PIPELINE] Checking for failed scenes before finalizing...')
      
      // Obtener información de escenas fallidas desde metadata
      const { data: movieData } = await this.supabase
        .from('movies')
        .select('metadata')
        .eq('id', this.movieId)
        .single()
      
      const failedScenes = movieData?.metadata?.failed_scenes || []
      const completedScenes = movieData?.metadata?.completed_scenes || 0
      const totalScenes = movieData?.metadata?.total_scenes || 0
      
      // Si hay escenas fallidas, marcar como "failed" o "processing" en vez de "completed"
      let finalStatus = 'completed'
      if (failedScenes.length > 0) {
        // Si todas las escenas fallaron, marcar como "failed"
        if (completedScenes === 0) {
          finalStatus = 'failed'
          console.warn(`[PIPELINE] ⚠️ All scenes failed, marking movie as FAILED`)
        } else {
          // Si solo algunas fallaron, marcar como "processing" o "completed" con advertencia
          finalStatus = 'completed'
          console.warn(`[PIPELINE] ⚠️ Some scenes failed (${failedScenes.length}/${totalScenes}), but movie will be marked as COMPLETED`)
        }
      }
      
      console.log(`[PIPELINE] Updating final status to ${finalStatus.toUpperCase()}...`)
      
      const { error: finalUpdateError } = await this.supabase
        .from('movies')
        .update({
          status: finalStatus,
          progress: 100
          // ⭐ Removido completed_at porque no existe en la tabla
        })
        .eq('id', this.movieId)
      
      if (finalUpdateError) {
        console.error('[PIPELINE] Error updating final status:', finalUpdateError)
      } else {
        console.log(`[PIPELINE] ✅ Movie status updated to ${finalStatus.toUpperCase()}`)
        if (failedScenes.length > 0) {
          console.warn(`[PIPELINE] ⚠️ Note: ${failedScenes.length} scenes failed: ${failedScenes.join(', ')}`)
        }
      }
      
      // Actualizar estado final del progreso (puede no existir la tabla)
      try {
        const { error: progressFinalError } = await this.supabase
          .from('movie_creation_progress')
          .upsert({
            movie_id: this.movieId,
            overall_status: 'completed',
            overall_progress: 100,
            current_step: 'completed',
            current_step_detail: '¡Película completada exitosamente!',
            updated_at: new Date().toISOString()
          }, { onConflict: 'movie_id' })
        
        if (progressFinalError) {
          console.warn(`[PIPELINE] Could not update progress table (non-fatal):`, progressFinalError)
        } else {
          console.log(`[PIPELINE] ✅ Final progress updated to completed (100%)`)
        }
      } catch (e: any) {
        console.warn(`[PIPELINE] Progress table may not exist (non-fatal):`, e.message)
      }
      
      console.log(`[PIPELINE] ========== PIPELINE COMPLETED FOR MOVIE: ${this.movieId} ==========`)
      
    } catch (error: any) {
      console.error(`[PIPELINE] Pipeline failed:`, error)
      
      // Actualizar a FAILED
      await this.supabase
        .from('movies')
        .update({
          status: 'failed',
          progress: 0,
          error_message: error.message
        })
        .eq('id', this.movieId)
      
      await this.updateProgress(
        this.getCurrentStep(),
        'failed',
        0,
        `Error: ${error.message}`
      )
      
      throw error
    }
  }
  
  // ==========================================
  // MÉTODOS DE CADA PASO
  // ==========================================
  
  private async loadMovie(): Promise<void> {
    console.log(`[PIPELINE] [LOAD MOVIE] Fetching movie ${this.movieId}...`)
    const startTime = Date.now()
    
    const { data, error } = await this.supabase
      .from('movies')
      .select('*')
      .eq('id', this.movieId)
      .single()
    
    const elapsed = Date.now() - startTime
    console.log(`[PIPELINE] [LOAD MOVIE] Query took ${elapsed}ms`)
    
    if (error || !data) {
      console.error(`[PIPELINE] [LOAD MOVIE] Error:`, error)
      throw new Error(`Movie not found: ${error?.message || 'Unknown error'}`)
    }
    
    this.movie = data
    console.log(`[PIPELINE] [LOAD MOVIE] ✅ Loaded movie: ${this.movie.title}`)
  }
  
  private async loadProviders(): Promise<void> {
    console.log(`[PIPELINE] [LOAD PROVIDERS] Fetching active providers...`)
    const startTime = Date.now()
    
    const { data: providers, error } = await this.supabase
      .from('api_providers')
      .select('*')
      .eq('is_active', true)
    
    const elapsed = Date.now() - startTime
    console.log(`[PIPELINE] [LOAD PROVIDERS] Query took ${elapsed}ms`)
    
    if (error) {
      console.error(`[PIPELINE] [LOAD PROVIDERS] Error:`, error)
      throw new Error(`Failed to load providers: ${error.message}`)
    }
    
    for (const provider of providers || []) {
      this.providers.set(provider.type, provider)
      console.log(`[PIPELINE] [LOAD PROVIDERS] Added provider: ${provider.name} (${provider.type})`)
    }
    
    console.log(`[PIPELINE] [LOAD PROVIDERS] ✅ Loaded ${this.providers.size} providers`)
  }
  
  // -------------------------------------------
  // PASO 1: EXTRAER UBICACIONES
  // -------------------------------------------
  private async extractLocations(): Promise<string[]> {
    console.log('[PIPELINE] [EXTRACT LOCATIONS] Starting location extraction...')
    
    try {
      const llmProvider = this.providers.get('llm')
      if (!llmProvider) {
        console.error('[PIPELINE] [EXTRACT LOCATIONS] ❌ LLM provider not found in providers map')
        throw new Error('LLM provider not configured')
      }
      
      console.log(`[PIPELINE] [EXTRACT LOCATIONS] Found LLM provider: ${llmProvider.name} (${llmProvider.id})`)
      
      console.log(`[PIPELINE] [EXTRACT LOCATIONS] Getting provider with key...`)
      const providerWithKey = await getProviderWithKey(llmProvider.id)
      if (!providerWithKey || !providerWithKey.apiKey) {
        console.error(`[PIPELINE] [EXTRACT LOCATIONS] ❌ Failed to get API key for provider ${llmProvider.id}`)
        throw new Error('Failed to get LLM provider API key')
      }
      
      console.log(`[PIPELINE] [EXTRACT LOCATIONS] ✅ Got provider with API key (length: ${providerWithKey.apiKey.length})`)
      
      const prompt = this.movie.user_prompt || this.movie.prompt || ''
      console.log(`[PIPELINE] [EXTRACT LOCATIONS] Prompt length: ${prompt.length} chars`)
      
      console.log(`[PIPELINE] [EXTRACT LOCATIONS] Calling OpenAI API...`)
      const response = await this.callOpenAI(
        providerWithKey.apiKey,
        'Extrae todas las ubicaciones mencionadas o implícitas en este prompt de película. Responde SOLO con un array JSON de strings.',
        prompt
      )
      
      console.log(`[PIPELINE] [EXTRACT LOCATIONS] ✅ Got response from OpenAI (length: ${response.length} chars)`)
      
      try {
        const cleaned = response.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()
        const locations = JSON.parse(cleaned)
        console.log(`[PIPELINE] [EXTRACT LOCATIONS] ✅ Extracted ${locations.length} locations:`, locations)
        return Array.isArray(locations) ? locations : ['Location from prompt']
      } catch (parseError: any) {
        console.warn('[PIPELINE] [EXTRACT LOCATIONS] ⚠️ Could not parse locations JSON:', parseError.message)
        console.log('[PIPELINE] [EXTRACT LOCATIONS] Using default location')
        return ['Location from prompt']
      }
    } catch (error: any) {
      console.error(`[PIPELINE] [EXTRACT LOCATIONS] ❌ Error:`, error.message)
      console.error(`[PIPELINE] [EXTRACT LOCATIONS] Stack:`, error.stack)
      throw error
    }
  }
  
  // -------------------------------------------
  // PASO 2: INVESTIGAR UBICACIONES
  // -------------------------------------------
  private async researchLocations(locations: string[]): Promise<any[]> {
    console.log('[PIPELINE] Researching locations visually...')
    
    // Por ahora, crear biblias básicas
    // En producción, esto buscaría imágenes reales
    const bibles = locations.map(loc => ({
      location_name: loc,
      mandatory_elements: [],
      forbidden_elements: [],
      base_prompt: `Scene set in ${loc}`
    }))
    
    return bibles
  }
  
  // -------------------------------------------
  // PASO 3: GENERAR GUIÓN (MEJORADO CON BIBLIA VISUAL)
  // -------------------------------------------
  private async generateScreenplay(visualBibles: any[], visualBible?: VisualBible): Promise<any> {
    console.log('[PIPELINE] Generating screenplay...')
    
    const llmProvider = this.providers.get('llm')
    if (!llmProvider) throw new Error('LLM provider not configured')
    
    const providerWithKey = await getProviderWithKey(llmProvider.id)
    if (!providerWithKey || !providerWithKey.apiKey) {
      throw new Error('Failed to get LLM provider API key')
    }
    
    // Si tenemos Biblia Visual, crear un prompt mejorado
    let systemPrompt = `Eres un guionista profesional de cine. Genera un guión detallado con escenas.
Cada escena debe tener:
- scene_number: número de escena
- location: ubicación exacta
- time_of_day: momento del día
- characters: personajes presentes (array de strings)
- action: descripción de la acción
- dialogue: diálogos (array de {character: string, line: string})
- duration_seconds: duración estimada (5-15 segundos)

Responde SOLO con un array JSON de escenas.`
    
    // Si hay Biblia Visual, incluir información adicional
    if (visualBible) {
      systemPrompt += `\n\nBIBLIA VISUAL DE LA PELÍCULA:
${JSON.stringify(visualBible, null, 2)}

IMPORTANTE: Debes usar SOLO los personajes y ubicaciones definidos en la Biblia Visual.
Mantén la consistencia visual y de continuidad según las reglas establecidas.`
    }

    const prompt = this.movie.user_prompt || this.movie.prompt || ''
    const duration = this.movie.duration_minutes || this.movie.target_duration_minutes || 60
    
    const userPrompt = `Genera un guión para esta película:
Título: ${this.movie.title}
Prompt: ${prompt}
Género: ${this.movie.genre || 'drama'}
Duración objetivo: ${duration} minutos

Ubicaciones disponibles: ${visualBibles.map(b => b.location_name).join(', ')}

Genera aproximadamente ${Math.floor(duration * 6)} escenas (10 segundos promedio cada una).`

    const response = await this.callOpenAI(providerWithKey.apiKey, systemPrompt, userPrompt)
    
    try {
      const cleaned = response.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()
      const screenplay = JSON.parse(cleaned)
      console.log(`[PIPELINE] Generated ${screenplay.length} scenes`)
      return { scenes: Array.isArray(screenplay) ? screenplay : [] }
    } catch (error) {
      console.error('[PIPELINE] Error parsing screenplay:', error)
      throw new Error('Failed to generate screenplay')
    }
  }
  
  // -------------------------------------------
  // PASO 4: SELECCIONAR PERSONAJES
  // -------------------------------------------
  private async selectCharacters(screenplay: any): Promise<any[]> {
    console.log('[PIPELINE] Selecting characters...')
    
    const characterSelection = this.movie.metadata?.character_selection
    
    // Extraer nombres de personajes del guión
    const characterNames = new Set<string>()
    for (const scene of screenplay.scenes || []) {
      for (const char of scene.characters || []) {
        if (typeof char === 'string') {
          characterNames.add(char)
        }
      }
      for (const dialogue of scene.dialogue || []) {
        if (dialogue.character) {
          characterNames.add(dialogue.character)
        }
      }
    }
    
    console.log(`[PIPELINE] Found ${characterNames.size} characters in screenplay`)
    
    // Por ahora, crear personajes básicos
    const characters = Array.from(characterNames).map((name, i) => ({
      id: `char-${i}`,
      name,
      voice_id: null, // Se asignará después
      lora_id: null
    }))
    
    return characters
  }
  
  // -------------------------------------------
  // PASO 5: GENERAR IMÁGENES DE PERSONAJES
  // -------------------------------------------
  private async generateCharacterImages(characters: any[]): Promise<void> {
    console.log('[PIPELINE] Generating character images...')
    
    const imageProvider = this.providers.get('image')
    if (!imageProvider) {
      console.log('[PIPELINE] No image provider, skipping character images')
      return
    }
    
    const providerWithKey = await getProviderWithKey(imageProvider.id)
    if (!providerWithKey || !providerWithKey.apiKey) {
      console.log('[PIPELINE] No API key for image provider, skipping')
      return
    }
    
    for (const character of characters) {
      try {
        // Generar imagen con Fal.ai/Flux
        const imageUrl = await this.generateImageWithFlux(
          providerWithKey.apiKey,
          `Professional photo portrait of ${character.name}, cinematic lighting, 8k quality`
        )
        character.avatar_url = imageUrl
        console.log(`[PIPELINE] Generated image for ${character.name}`)
      } catch (error) {
        console.error(`[PIPELINE] Error generating image for ${character.name}:`, error)
      }
    }
  }
  
  // -------------------------------------------
  // PASO 6: GENERAR VIDEOS DE ESCENAS
  // -------------------------------------------
  private async generateSceneVideos(screenplay: any, characters: any[], visualBibles: any[]): Promise<any[]> {
    console.log('[PIPELINE] Generating scene videos...')
    
    const videoProvider = this.providers.get('video')
    if (!videoProvider) throw new Error('Video provider not configured')
    
    const providerWithKey = await getProviderWithKey(videoProvider.id)
    if (!providerWithKey || !providerWithKey.apiKey) {
      throw new Error('Failed to get video provider API key')
    }
    
    const videos: any[] = []
    const totalScenes = screenplay.scenes?.length || 0
    const MAX_RETRIES = 3
    const failedScenes: number[] = []
    
    for (let i = 0; i < totalScenes; i++) {
      const scene = screenplay.scenes[i]
      let success = false
      let retryCount = 0
      
      while (!success && retryCount < MAX_RETRIES) {
        try {
          await this.updateProgress(
            'generate_videos',
            'running',
            Math.round((i / totalScenes) * 100),
            `Generando escena ${i + 1} de ${totalScenes}${retryCount > 0 ? ` (intento ${retryCount + 1})` : ''}...`
          )
          
          // Obtener el último frame de la escena anterior para continuidad
          const previousVideo = videos.length > 0 ? videos[videos.length - 1] : null
          const lastFrameUrl = previousVideo?.last_frame_url || null
          
          // Construir prompt con contexto completo
          const videoPrompt = this.buildVideoPromptWithContext(
            scene,
            screenplay.scenes,
            i,
            visualBibles,
            characters,
            lastFrameUrl
          )
          
          // Generar imagen de referencia para la escena (necesaria para Runway image-to-video)
          let sceneImageUrl: string
          try {
            const imageProvider = this.providers.get('image')
            if (imageProvider) {
              const imageProviderWithKey = await getProviderWithKey(imageProvider.id)
              if (imageProviderWithKey?.apiKey) {
                sceneImageUrl = await this.generateImageWithFlux(
                  imageProviderWithKey.apiKey,
                  videoPrompt + ', cinematic, 4K quality, professional cinematography, still frame'
                )
                console.log(`[PIPELINE] Generated scene image for scene ${i + 1}`)
              } else {
                throw new Error('No API key for image provider')
              }
            } else {
              throw new Error('No image provider configured')
            }
          } catch (imageError) {
            console.error(`[PIPELINE] Error generating scene image, using placeholder:`, imageError)
            // Usar una imagen placeholder si falla
            sceneImageUrl = lastFrameUrl || 'https://via.placeholder.com/1920x1080?text=Scene+Reference'
          }
          
          // Generar video
          let videoUrl: string
          if (videoProvider.slug === 'runway' || videoProvider.slug?.includes('runway')) {
            videoUrl = await this.generateVideoWithRunway(
              providerWithKey.apiKey,
              videoPrompt,
              sceneImageUrl,
              scene.duration_seconds || 10,
              videoProvider
            )
          } else {
            throw new Error(`Unsupported video provider: ${videoProvider.slug}`)
          }
          
          // ⭐ VALIDACIÓN CRÍTICA: Verificar que tenemos un video URL válido antes de marcar como completado
          if (!videoUrl || videoUrl.trim() === '' || videoUrl === 'null' || videoUrl === 'undefined') {
            console.error(`[PIPELINE] ❌ CRITICAL: No video URL returned for scene ${i + 1}!`)
            console.error(`[PIPELINE] videoUrl value:`, videoUrl)
            throw new Error(`No video URL returned from Runway for scene ${i + 1}`)
          }
          
          console.log(`[PIPELINE] ✅ Scene ${i + 1} video generated successfully with URL: ${videoUrl}`)
          
          // Extraer último frame para la siguiente escena (simplificado por ahora)
          const lastFrame = await this.extractLastFrame(videoUrl)
          
          videos.push({
            scene_number: scene.scene_number || i + 1,
            video_url: videoUrl,
            last_frame_url: lastFrame,
            duration: scene.duration_seconds || 10,
            scene_data: scene,
            status: 'completed',
            prompt_used: videoPrompt
          })
          
          // Guardar progreso en DB después de cada escena exitosa (SOLO si videoUrl es válido)
          await this.saveSceneProgress(scene.scene_number || i + 1, 'completed', videoUrl, null)
          
          success = true
          console.log(`[PIPELINE] ✅ Scene ${i + 1}/${totalScenes} generated successfully`)
          
        } catch (error: any) {
          retryCount++
          console.error(`[PIPELINE] ❌ Error generating scene ${i + 1} (attempt ${retryCount}):`, error.message)
          
          if (retryCount >= MAX_RETRIES) {
            console.error(`[PIPELINE] Scene ${i + 1} failed after ${MAX_RETRIES} attempts`)
            failedScenes.push(i + 1)
            
            // Marcar escena como fallida en DB
            await this.saveSceneProgress(scene.scene_number || i + 1, 'failed', null, error.message)
            
            // Añadir placeholder para mantener el orden
            videos.push({
              scene_number: scene.scene_number || i + 1,
              video_url: null,
              status: 'failed',
              error: error.message,
              scene_data: scene
            })
          } else {
            // Esperar antes de reintentar (backoff exponencial)
            await this.sleep(5000 * retryCount)
          }
        }
      }
      
      // Pausa entre escenas para no saturar la API
      await this.sleep(2000)
    }
    
    // Verificar si hay escenas fallidas
    const completedCount = videos.filter(v => v.status === 'completed').length
    console.log(`[PIPELINE] Generated ${completedCount}/${totalScenes} videos`)
    
    if (failedScenes.length > 0) {
      console.warn(`[PIPELINE] ⚠️ Failed scenes: ${failedScenes.join(', ')}`)
      
      // Guardar información de escenas fallidas en la película (en metadata si existe)
      const { data: currentMovie } = await this.supabase
        .from('movies')
        .select('metadata')
        .eq('id', this.movieId)
        .single()
      
      await this.supabase
        .from('movies')
        .update({
          metadata: {
            ...(currentMovie?.metadata || {}),
            failed_scenes: failedScenes,
            completed_scenes: completedCount,
            total_scenes: totalScenes
          }
        })
        .eq('id', this.movieId)
    }
    
    return videos
  }
  
  // Helper: Construir prompt con contexto completo
  private buildVideoPromptWithContext(
    scene: any,
    allScenes: any[],
    sceneIndex: number,
    visualBibles: any[],
    characters: any[],
    previousFrameUrl: string | null
  ): string {
    // Base prompt
    let prompt = this.buildVideoPrompt(scene, visualBibles)
    
    // Agregar contexto de continuidad si hay escena anterior
    if (previousFrameUrl && sceneIndex > 0) {
      prompt += ', seamless transition from previous scene, maintaining visual consistency'
    }
    
    // Agregar información de personajes si están presentes
    if (scene.characters && scene.characters.length > 0) {
      const characterNames = scene.characters.join(', ')
      prompt += `, featuring ${characterNames}`
    }
    
    return prompt
  }
  
  // Helper: Extraer último frame de un video (simplificado - en producción usar FFmpeg)
  private async extractLastFrame(videoUrl: string): Promise<string | null> {
    try {
      // Por ahora, retornar null o la misma URL como placeholder
      // En producción, esto usaría FFmpeg o un servicio para extraer el frame
      // Por simplicidad, retornamos null y usaremos la imagen generada como referencia
      return null
    } catch (error) {
      console.warn('[PIPELINE] Could not extract last frame:', error)
      return null
    }
  }
  
  // Helper: Guardar progreso de cada escena individualmente
  private async saveSceneProgress(
    sceneNumber: number,
    status: 'pending' | 'processing' | 'completed' | 'failed',
    videoUrl: string | null,
    error: string | null
  ): Promise<void> {
    try {
      // ⭐ VALIDACIÓN CRÍTICA: NO marcar como 'completed' si no hay videoUrl válido
      let finalStatus = status
      if (status === 'completed' && (!videoUrl || videoUrl.trim() === '' || videoUrl === 'null' || videoUrl === 'undefined')) {
        console.error(`[PIPELINE] ❌ Cannot mark scene ${sceneNumber} as completed without valid videoUrl!`)
        console.error(`[PIPELINE] videoUrl value:`, videoUrl)
        finalStatus = 'failed'
        error = error || 'No valid video URL returned'
      }
      
      // Actualizar la escena en la tabla scenes
      const updateData: any = {
        clip_status: finalStatus === 'completed' ? 'completed' : (finalStatus === 'failed' ? 'failed' : 'pending'),
        updated_at: new Date().toISOString()
      }
      
      // ⭐ Solo añadir clip_url si es válido
      if (videoUrl && videoUrl.trim() !== '' && videoUrl !== 'null' && videoUrl !== 'undefined') {
        updateData.clip_url = videoUrl
      }
      
      // Añadir mensaje de error si existe
      if (error) {
        updateData.error_message = error
      }
      
      const { error: updateError } = await this.supabase
        .from('scenes')
        .update(updateData)
        .eq('movie_id', this.movieId)
        .eq('scene_number', sceneNumber)
      
      if (updateError) {
        console.warn(`[PIPELINE] Could not update scene ${sceneNumber} progress:`, updateError.message)
      } else {
        console.log(`[PIPELINE] ✅ Updated scene ${sceneNumber} status: ${status}`)
      }
    } catch (error: any) {
      console.error('[PIPELINE] Error saving scene progress:', error.message)
    }
  }
  
  // -------------------------------------------
  // PASO 7: GENERAR AUDIO DE DIÁLOGOS
  // -------------------------------------------
  private async generateDialogueAudio(screenplay: any, characters: any[]): Promise<any[]> {
    console.log('[PIPELINE] Generating dialogue audio...')
    
    const audioProvider = this.providers.get('audio')
    if (!audioProvider) throw new Error('Audio provider not configured')
    
    const providerWithKey = await getProviderWithKey(audioProvider.id)
    if (!providerWithKey || !providerWithKey.apiKey) {
      throw new Error('Failed to get audio provider API key')
    }
    
    const audioTracks = []
    
    for (const scene of screenplay.scenes || []) {
      const sceneAudio = []
      
      for (const dialogue of scene.dialogue || []) {
        try {
          // Generar audio con ElevenLabs
          const audioUrl = await this.generateAudioWithElevenLabs(
            providerWithKey.apiKey,
            dialogue.line,
            dialogue.character // Usará una voz por defecto si no tiene asignada
          )
          
          // Solo agregar si se generó correctamente (no es null)
          if (audioUrl) {
            sceneAudio.push({
              character: dialogue.character,
              line: dialogue.line,
              audio_url: audioUrl
            })
          } else {
            console.warn(`[PIPELINE] Audio generation skipped for dialogue (quota exceeded or error)`)
          }
          
        } catch (error) {
          console.error(`[PIPELINE] Error generating audio for dialogue:`, error)
          // Continuar sin agregar este audio, no romper el pipeline
        }
      }
      
      audioTracks.push({
        scene_number: scene.scene_number,
        dialogues: sceneAudio
      })
    }
    
    console.log(`[PIPELINE] Generated audio for ${audioTracks.length} scenes`)
    return audioTracks
  }
  
  // -------------------------------------------
  // PASO 8: APLICAR LIP SYNC
  // -------------------------------------------
  private async applyLipSync(videos: any[], audioTracks: any[]): Promise<any[]> {
    console.log('[PIPELINE] Applying lip sync...')
    
    const lipSyncProvider = this.providers.get('lip_sync')
    if (!lipSyncProvider) {
      console.log('[PIPELINE] No lip sync provider, skipping')
      return videos
    }
    
    const providerWithKey = await getProviderWithKey(lipSyncProvider.id)
    if (!providerWithKey || !providerWithKey.apiKey) {
      console.log('[PIPELINE] No API key for lip sync provider, skipping')
      return videos
    }
    
    const lipSyncedVideos = []
    
    for (const video of videos) {
      const sceneAudio = audioTracks.find(a => a.scene_number === video.scene_number)
      
      if (sceneAudio && sceneAudio.dialogues.length > 0) {
        try {
          // Combinar audios de la escena
          // Por ahora usar el primer audio
          const firstAudio = sceneAudio.dialogues[0]
          
          const lipSyncedUrl = await this.applyLipSyncWithSyncLabs(
            providerWithKey.apiKey,
            video.video_url,
            firstAudio.audio_url
          )
          
          lipSyncedVideos.push({
            ...video,
            video_url: lipSyncedUrl,
            lip_synced: true
          })
          
        } catch (error) {
          console.error(`[PIPELINE] Lip sync error for scene ${video.scene_number}:`, error)
          lipSyncedVideos.push(video)
        }
      } else {
        lipSyncedVideos.push(video)
      }
    }
    
    return lipSyncedVideos
  }
  
  // -------------------------------------------
  // PASO 9: GENERAR MÚSICA
  // -------------------------------------------
  private async generateMusic(screenplay: any): Promise<any> {
    console.log('[PIPELINE] Generating music...')
    
    const musicProvider = this.providers.get('music')
    
    if (!musicProvider) {
      console.log('[PIPELINE] ⚠️ No music provider configured, skipping')
      return null
    }
    
    try {
      // Obtener versión configurada
      const apiVersion = musicProvider.api_version || 'v1'
      
      // Por ahora, Beatoven no está funcionando correctamente
      // TODO: Implementar cuando tengamos la documentación correcta
      console.log('[PIPELINE] ⚠️ Music generation temporarily disabled (Beatoven API issues)')
      console.log('[PIPELINE] Music provider configured but skipped to avoid errors')
      
      return null
      
      // Código para cuando Beatoven funcione:
      /*
      const providerWithKey = await getProviderWithKey(musicProvider.id)
      if (!providerWithKey || !providerWithKey.apiKey) {
        console.log('[PIPELINE] No API key for music provider, skipping')
        return null
      }
      
      const response = await this.generateMusicWithBeatoven(
        providerWithKey.apiKey,
        this.movie.genre || 'drama',
        (this.movie.duration_minutes || this.movie.target_duration_minutes || 60) * 60
      )
      return response
      */
      
    } catch (error: any) {
      console.error('[PIPELINE] Error generating music:', error.message)
      return null  // No romper el pipeline por falta de música
    }
  }
  
  // -------------------------------------------
  // PASO 10: ENSAMBLAR PELÍCULA
  // -------------------------------------------
  private async assembleMovie(videos: any[], audioTracks: any[], music: any): Promise<any> {
    console.log('[PIPELINE] Assembling movie...')
    console.log(`[PIPELINE] Total videos received: ${videos.length}`)
    
    // ⭐ VALIDACIÓN CRÍTICA: Filtrar solo videos completados con URL válida
    const validVideos = videos.filter(v => {
      const hasValidUrl = v.video_url && 
                         v.video_url.trim() !== '' && 
                         v.video_url !== 'null' && 
                         v.video_url !== 'undefined'
      const isCompleted = v.status === 'completed' || !v.status || v.status === 'pending'
      
      if (!hasValidUrl || !isCompleted) {
        console.warn(`[PIPELINE] ⚠️ Excluding scene ${v.scene_number}: status=${v.status}, hasUrl=${!!hasValidUrl}`)
        return false
      }
      
      return true
    })
    
    console.log(`[PIPELINE] Valid videos for assembly: ${validVideos.length}/${videos.length}`)
    
    if (validVideos.length === 0) {
      const failedCount = videos.filter(v => v.status === 'failed').length
      const invalidCount = videos.filter(v => !v.video_url || v.video_url.trim() === '' || v.video_url === 'null' || v.video_url === 'undefined').length
      const errorMsg = `No videos to assemble: all scenes failed or invalid. Failed: ${failedCount}, Invalid: ${invalidCount}. Check Runway API.`
      console.error(`[PIPELINE] ❌ ${errorMsg}`)
      throw new Error(errorMsg)
    }
    
    // Ordenar por número de escena
    const sortedVideos = validVideos.sort((a, b) => a.scene_number - b.scene_number)
    
    console.log(`[PIPELINE] Videos to assemble (in order):`, sortedVideos.map(v => ({
      scene: v.scene_number,
      url: v.video_url?.substring(0, 50) + '...',
      duration: v.duration
    })))
    
    // En producción, esto usaría FFmpeg para:
    // 1. Concatenar todos los videos
    // 2. Añadir pistas de audio
    // 3. Añadir música de fondo
    // 4. Aplicar transiciones
    // 5. Exportar en múltiples calidades
    
    // Por ahora, retornar el primer video válido como URL ensamblada
    // En producción esto sería la URL del video concatenado
    return {
      videos: sortedVideos,
      audioTracks,
      music,
      assembled_url: sortedVideos[0]?.video_url || null,
      total_duration: sortedVideos.reduce((sum, v) => sum + (v.duration || 10), 0),
      scene_count: sortedVideos.length
    }
  }
  
  // -------------------------------------------
  // PASO 11: GENERAR PORTADA
  // -------------------------------------------
  private async generateCover(): Promise<any> {
    console.log('[PIPELINE] Generating cover...')
    
    // ⭐ CRÍTICO: Verificar si ya existe portada
    const { data: existingMovie } = await this.supabase
      .from('movies')
      .select('thumbnail_url, poster_url')
      .eq('id', this.movieId)
      .maybeSingle()
    
    if (existingMovie?.thumbnail_url || existingMovie?.poster_url) {
      console.log('[PIPELINE] ✅ Cover already exists, skipping generation')
      return {
        poster_url: existingMovie.poster_url || existingMovie.thumbnail_url,
        thumbnail_url: existingMovie.thumbnail_url || existingMovie.poster_url
      }
    }
    
    const imageProvider = this.providers.get('image')
    if (!imageProvider) {
      console.warn('[PIPELINE] ⚠️ No image provider configured, cannot generate cover')
      return { poster_url: null, thumbnail_url: null }
    }
    
    const providerWithKey = await getProviderWithKey(imageProvider.id)
    if (!providerWithKey || !providerWithKey.apiKey) {
      console.warn('[PIPELINE] ⚠️ Could not get image provider API key')
      return { poster_url: null, thumbnail_url: null }
    }
    
    try {
      const prompt = this.movie.user_prompt || this.movie.prompt || ''
      const posterPrompt = `Movie poster for "${this.movie.title}": ${prompt.slice(0, 200)}, cinematic, professional movie poster, high quality, detailed`
      
      console.log('[PIPELINE] Generating cover with prompt:', posterPrompt.substring(0, 100))
      
      const posterUrl = await this.generateImageWithFlux(
        providerWithKey.apiKey,
        posterPrompt
      )
      
      if (!posterUrl) {
        console.error('[PIPELINE] ❌ Failed to generate cover: no URL returned')
        return { poster_url: null, thumbnail_url: null }
      }
      
      console.log('[PIPELINE] ✅ Cover generated successfully:', posterUrl)
      
      return {
        poster_url: posterUrl,
        thumbnail_url: posterUrl
      }
    } catch (error: any) {
      console.error('[PIPELINE] ❌ Error generating cover:', error.message)
      console.error('[PIPELINE] Error stack:', error.stack)
      // No lanzar error, simplemente retornar null
      return { poster_url: null, thumbnail_url: null }
    }
  }
  
  // -------------------------------------------
  // PASO 12: SUBIR ARCHIVOS FINALES
  // -------------------------------------------
  private async uploadFinalFiles(assembledMovie: any, cover: any): Promise<any> {
    console.log('[PIPELINE] Uploading final files...')
    
    // En producción, subir a Cloudflare R2
    // Por ahora, retornar las URLs directas
    
    return {
      video_url: assembledMovie.assembled_url,
      poster_url: cover.poster_url,
      thumbnail_url: cover.thumbnail_url
    }
  }
  
  // -------------------------------------------
  // PASO 13: FINALIZAR
  // -------------------------------------------
  private async finalize(uploadedUrls: any): Promise<void> {
    console.log('[PIPELINE] Finalizing...')
    console.log('[PIPELINE] Uploaded URLs to save:', {
      video_url: uploadedUrls.video_url,
      poster_url: uploadedUrls.poster_url,
      thumbnail_url: uploadedUrls.thumbnail_url
    })
    
    const updateData: any = {
      status: 'completed',
      progress: 100
    }
    
    // Actualizar video_url (puede ser string o objeto)
    if (uploadedUrls.video_url) {
      // Si es string, guardarlo directamente
      if (typeof uploadedUrls.video_url === 'string') {
        updateData.video_url = uploadedUrls.video_url
      } else {
        // Si es objeto, guardarlo como video_urls
        updateData.video_urls = uploadedUrls.video_url
      }
    }
    
    // Actualizar poster y thumbnail
    if (uploadedUrls.poster_url) {
      updateData.poster_url = uploadedUrls.poster_url
    }
    
    if (uploadedUrls.thumbnail_url) {
      updateData.thumbnail_url = uploadedUrls.thumbnail_url
    } else if (uploadedUrls.poster_url) {
      // Si no hay thumbnail pero sí hay poster, usar el poster como thumbnail
      updateData.thumbnail_url = uploadedUrls.poster_url
    }
    
    console.log('[PIPELINE] Update data:', updateData)
    
    // Intentar actualizar con todos los campos primero
    let { error } = await this.supabase
      .from('movies')
      .update(updateData)
      .eq('id', this.movieId)
    
    if (error) {
      // Si falla por columnas inexistentes, intentar solo con campos básicos
      if (error.message?.includes('column') || error.message?.includes('schema cache') || error.code === 'PGRST204') {
        console.warn(`[PIPELINE] ⚠️ Column error detected: ${error.message}`)
        console.warn(`[PIPELINE] ⚠️ Attempting to update with basic fields only...`)
        
        const basicUpdate: any = {
          status: 'completed',
          progress: 100
        }
        
        // Intentar cada campo por separado para ver cuáles existen
        if (updateData.video_url) {
          try {
            const { error: videoError } = await this.supabase
              .from('movies')
              .update({ video_url: updateData.video_url })
              .eq('id', this.movieId)
            if (!videoError) {
              console.log('[PIPELINE] ✅ video_url updated')
            } else {
              console.warn(`[PIPELINE] ⚠️ Could not update video_url: ${videoError.message}`)
            }
          } catch (e: any) {
            console.warn(`[PIPELINE] ⚠️ video_url column may not exist: ${e.message}`)
          }
        }
        
        if (updateData.poster_url) {
          try {
            const { error: posterError } = await this.supabase
              .from('movies')
              .update({ poster_url: updateData.poster_url })
              .eq('id', this.movieId)
            if (!posterError) {
              console.log('[PIPELINE] ✅ poster_url updated')
            } else {
              console.warn(`[PIPELINE] ⚠️ Could not update poster_url: ${posterError.message}`)
            }
          } catch (e: any) {
            console.warn(`[PIPELINE] ⚠️ poster_url column may not exist: ${e.message}`)
          }
        }
        
        if (updateData.thumbnail_url) {
          try {
            const { error: thumbError } = await this.supabase
              .from('movies')
              .update({ thumbnail_url: updateData.thumbnail_url })
              .eq('id', this.movieId)
            if (!thumbError) {
              console.log('[PIPELINE] ✅ thumbnail_url updated')
            } else {
              console.warn(`[PIPELINE] ⚠️ Could not update thumbnail_url: ${thumbError.message}`)
            }
          } catch (e: any) {
            console.warn(`[PIPELINE] ⚠️ thumbnail_url column may not exist: ${e.message}`)
          }
        }
        
        // Actualizar status y progress (estos deberían existir siempre)
        const { error: statusError } = await this.supabase
          .from('movies')
          .update(basicUpdate)
          .eq('id', this.movieId)
        
        if (statusError) {
          console.error(`[PIPELINE] ❌ Could not update basic status: ${statusError.message}`)
          throw statusError
        } else {
          console.log('[PIPELINE] ✅ Movie basic data updated (some columns may be missing)')
        }
      } else {
        console.error('[PIPELINE] ❌ Error updating movie:', error)
        throw error
      }
    } else {
      console.log('[PIPELINE] ✅ Movie finalized successfully')
    }
  }
  
  // ==========================================
  // MÉTODOS AUXILIARES - LLAMADAS A APIs
  // ==========================================
  
  private async callOpenAI(apiKey: string, systemPrompt: string, userPrompt: string): Promise<string> {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: 'gpt-4-turbo-preview',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        max_tokens: 4000,
        temperature: 0.7
      })
    })
    
    if (!response.ok) {
      const error = await response.text()
      throw new Error(`OpenAI API error: ${error}`)
    }
    
    const data = await response.json()
    return data.choices[0].message.content
  }
  
  /**
   * Optimiza el prompt para Runway (máximo 1000 caracteres)
   * Prioriza información más importante
   */
  private optimizePromptForRunway(fullPrompt: string): string {
    const MAX_LENGTH = 1000
    
    if (fullPrompt.length <= MAX_LENGTH) {
      return fullPrompt
    }
    
    console.log(`[PIPELINE] [RUNWAY] Prompt too long (${fullPrompt.length} chars), optimizing to ${MAX_LENGTH}...`)
    
    // Priorizar líneas con información clave
    const lines = fullPrompt.split('\n')
    const important: string[] = []
    const optional: string[] = []
    
    for (const line of lines) {
      const lower = line.toLowerCase().trim()
      if (
        lower.includes('[action') ||
        lower.includes('[character') ||
        lower.includes('[scene') ||
        lower.includes('[location') ||
        lower.includes('[film style') ||
        lower.includes('[lighting') ||
        lower.includes('[camera') ||
        lower.startsWith('scene:') ||
        lower.startsWith('location:')
      ) {
        important.push(line)
      } else if (line.trim()) {
        optional.push(line)
      }
    }
    
    let optimized = important.join('\n')
    
    // Añadir opcionales si hay espacio
    for (const part of optional) {
      if ((optimized + '\n' + part).length <= MAX_LENGTH - 10) {
        optimized += '\n' + part
      } else {
        break
      }
    }
    
    // Truncar si es necesario
    if (optimized.length > MAX_LENGTH) {
      optimized = optimized.substring(0, MAX_LENGTH - 3) + '...'
    }
    
    console.log(`[PIPELINE] [RUNWAY] ✅ Optimized: ${optimized.length} chars (was ${fullPrompt.length})`)
    return optimized.trim()
  }
  
  private async generateVideoWithRunway(
    apiKey: string,
    prompt: string,
    imageUrl: string,
    duration: number,
    provider?: any
  ): Promise<string> {
    // Obtener la versión configurada del proveedor
    const videoProvider = provider || this.providers.get('video')
    const apiVersion = videoProvider?.api_version || videoProvider?.config?.api_version || '2024-11-06'
    
    console.log(`[PIPELINE] [RUNWAY] Using API version: ${apiVersion}`)
    
    // Usar image_to_video si hay imagen, text_to_video si no
    const endpoint = imageUrl
      ? 'https://api.dev.runwayml.com/v1/image_to_video'
      : 'https://api.dev.runwayml.com/v1/text_to_video'
    
    // Verificar que la URL de imagen sea accesible
    let useImageToVideo = false
    let validImageUrl: string | null = null
    
    if (imageUrl && !imageUrl.includes('placeholder.com') && !imageUrl.startsWith('placeholder://')) {
      try {
        const controller = new AbortController()
        const timeoutId = setTimeout(() => controller.abort(), 5000)
        const testResponse = await fetch(imageUrl, { 
          method: 'HEAD',
          signal: controller.signal
        })
        clearTimeout(timeoutId)
        if (testResponse.ok) {
          useImageToVideo = true
          validImageUrl = imageUrl
        }
      } catch {
        // Si falla, usar text_to_video
      }
    }
    
    const finalEndpoint = useImageToVideo
      ? 'https://api.dev.runwayml.com/v1/image_to_video'
      : 'https://api.dev.runwayml.com/v1/text_to_video'
    
    // ⭐ ESTRATEGIA: Usar SIEMPRE gen3a_turbo tanto para text_to_video como image_to_video (requerido por el usuario)
    const model = 'gen3a_turbo'
    console.log(`[VIDEO] ✅ Using gen3a_turbo for ${useImageToVideo ? 'image_to_video' : 'text_to_video'}`)
    
    // ⭐ CRÍTICO: Ratio y duration para gen3a_turbo
    // image_to_video (gen3a_turbo): ratio "1280:768" (horizontal) o "768:1280" (vertical) | duration: 10
    // text_to_video (gen3a_turbo): ratio específico según modelo
    // ⚠️ Runway NO acepta "16:9" para image_to_video, solo acepta: "1280:768" o "768:1280"
    let ratio: string
    if (useImageToVideo) {
      ratio = '1280:768' // ⭐ CORRECTO para image_to_video (horizontal/landscape)
      console.log(`[VIDEO] Using ratio "1280:768" for image_to_video (required by Runway API)`)
    } else {
      // Para text_to_video, usar también formato específico
      ratio = '1280:768' // Por ahora usar el mismo, ajustar si es necesario
      console.log(`[VIDEO] Using ratio "1280:768" for text_to_video`)
    }
    let videoDuration = 10 // gen3a_turbo siempre usa 10 segundos
    
    console.log(`[VIDEO] Ratio: ${ratio}, Duration: ${videoDuration} (gen3a_turbo configuration)`)
    
    const body: any = {
      model: model,
      promptText: prompt.substring(0, 1000),
      ratio: ratio,
      duration: videoDuration,
      watermark: false
    }
    
    // Solo añadir promptImage si la URL es válida y accesible
    if (useImageToVideo && validImageUrl) {
      body.promptImage = validImageUrl
    }
    
    console.log(`[VIDEO] 🎬 Calling Runway API:`)
    console.log(`[VIDEO] Endpoint: ${finalEndpoint}`)
    console.log(`[VIDEO] Method: POST`)
    console.log(`[VIDEO] Headers: Authorization: Bearer ***, X-Runway-Version: ${apiVersion}`)
    console.log(`[VIDEO] Request body:`, JSON.stringify(body, null, 2))
    
    const response = await fetch(finalEndpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
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
        endpoint: finalEndpoint,
        status: response.status,
        statusText: response.statusText,
        headers: Object.fromEntries(response.headers.entries()),
        body: JSON.stringify(body, null, 2)
      })
      throw new Error(`Runway API error: ${responseText}`)
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
    
    // Polling para obtener resultado
    console.log(`[VIDEO] Starting polling for task ${taskId}...`)
    const videoUrl = await this.pollRunwayTask(apiKey, data.id || data.task_id, apiVersion)
    
    // ⭐ VALIDACIÓN FINAL: Verificar que el video URL es válido antes de retornar
    if (!videoUrl || videoUrl.trim() === '' || videoUrl === 'null' || videoUrl === 'undefined') {
      console.error(`[VIDEO] ❌ CRITICAL: Polling returned invalid video URL!`)
      console.error(`[VIDEO] videoUrl value:`, videoUrl)
      throw new Error(`Runway polling completed but returned invalid video URL: ${videoUrl}`)
    }
    
    console.log(`[VIDEO] ✅ Video URL validated: ${videoUrl}`)
    return videoUrl
  }
  
  private async pollRunwayTask(
    apiKey: string, 
    taskId: string,
    apiVersion: string
  ): Promise<string> {
    const maxAttempts = 120  // 10 minutos máximo (5s × 120)
    let attempts = 0
    
    const pollingUrl = `https://api.dev.runwayml.com/v1/tasks/${taskId}`
    console.log(`[VIDEO] 🔄 Polling Runway task: ${taskId}`)
    console.log(`[VIDEO] Polling URL: ${pollingUrl}`)
    console.log(`[VIDEO] Max attempts: ${maxAttempts} (10 minutes total)`)
    
    while (attempts < maxAttempts) {
      attempts++
      console.log(`[VIDEO] Poll attempt ${attempts}/${maxAttempts} for task ${taskId}...`)
      
      const response = await fetch(pollingUrl, {
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'X-Runway-Version': apiVersion
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
      console.log(`[VIDEO] Poll ${attempts}/${maxAttempts}: status = ${status}`)
      if (status !== 'SUCCEEDED' && status !== 'completed' && status !== 'COMPLETED' && status !== 'FAILED' && status !== 'failed' && status !== 'FAILED') {
        console.log(`[VIDEO] Full polling response:`, JSON.stringify(data, null, 2))
      }
      
      if (status === 'SUCCEEDED' || status === 'completed' || status === 'COMPLETED') {
        // Intentar obtener la URL del video de múltiples campos posibles
        const videoUrl = data.output?.[0] || 
                        data.output_url || 
                        data.url || 
                        data.video_url ||
                        data.result?.output?.[0] ||
                        data.result?.output_url ||
                        (data.output && Array.isArray(data.output) && data.output.length > 0 ? data.output[0] : null) ||
                        ''
        
        console.log(`[VIDEO] ✅ Task completed! Full response:`, JSON.stringify(data, null, 2))
        console.log(`[VIDEO] ✅ Extracted video URL from fields:`, {
          'data.output?.[0]': data.output?.[0],
          'data.output_url': data.output_url,
          'data.url': data.url,
          'data.video_url': data.video_url,
          'data.result?.output?.[0]': data.result?.output?.[0],
          'data.result?.output_url': data.result?.output_url,
          'final': videoUrl
        })
        
        if (!videoUrl || videoUrl.trim() === '' || videoUrl === 'null' || videoUrl === 'undefined') {
          console.error(`[VIDEO] ❌ Task marked as SUCCEEDED but no valid video URL found!`)
          console.error(`[VIDEO] Full response:`, JSON.stringify(data, null, 2))
          throw new Error(`Task completed but no valid video URL in response: ${JSON.stringify(data)}`)
        }
        
        console.log(`[VIDEO] ✅ Valid video URL extracted: ${videoUrl.substring(0, 100)}...`)
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
      
      await this.sleep(5000)  // Esperar 5 segundos antes del siguiente intento
    }
    
    console.error(`[VIDEO] ❌ Timeout after ${maxAttempts} attempts (10 minutes)`)
    throw new Error(`Runway task timeout after ${maxAttempts} attempts (10 minutes)`)
  }
  
  private async generateAudioWithElevenLabs(
    apiKey: string,
    text: string,
    characterName: string
  ): Promise<string | null> {
    // Obtener versión configurada
    const audioProvider = this.providers.get('audio')
    const apiVersion = audioProvider?.api_version || 'v1'
    
    // Voz por defecto (Rachel)
    const voiceId = 'EXAVITQu4vr4xnSDxMaL'
    
    const endpoint = apiVersion === 'v2'
      ? `https://api.elevenlabs.io/v2/text-to-speech/${voiceId}`
      : `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`
    
    console.log(`[PIPELINE] [ELEVENLABS] Generating audio for: "${text.substring(0, 50)}..."`)
    
    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'xi-api-key': apiKey
        },
        body: JSON.stringify({
          text,
          model_id: 'eleven_multilingual_v2',
          voice_settings: {
            stability: 0.5,
            similarity_boost: 0.75
          }
        })
      })
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        
        // ⭐ MANEJAR ERROR DE QUOTA SIN ROMPER EL PIPELINE
        if (errorData.detail?.status === 'quota_exceeded') {
          console.warn(`[PIPELINE] [ELEVENLABS] ⚠️ Quota exceeded, skipping audio generation`)
          console.warn(`[PIPELINE] [ELEVENLABS] Credits remaining: ${errorData.detail.message}`)
          return null  // Retornar null en vez de throw
        }
        
        // Otros errores
        console.error(`[PIPELINE] [ELEVENLABS] Error:`, errorData)
        return null  // También retornar null para no romper el pipeline
      }
      
      // ElevenLabs devuelve el audio directamente como blob
      const audioBlob = await response.blob()
      
      // Subir a storage y retornar URL
      const audioUrl = await this.uploadToStorage(audioBlob, `audio/${Date.now()}.mp3`)
      
      console.log(`[PIPELINE] [ELEVENLABS] ✅ Audio generated: ${audioUrl}`)
      return audioUrl
      
    } catch (error: any) {
      console.error(`[PIPELINE] [ELEVENLABS] Error:`, error.message)
      return null  // No romper el pipeline
    }
  }
  
  private async applyLipSyncWithSyncLabs(apiKey: string, videoUrl: string, audioUrl: string): Promise<string> {
    const response = await fetch('https://api.sync.so/v2/generate', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey
      },
      body: JSON.stringify({
        model: 'sync-1.6.0',
        input: [
          { type: 'video', url: videoUrl },
          { type: 'audio', url: audioUrl }
        ],
        options: {
          output_format: 'mp4',
          active_speaker: true
        }
      })
    })
    
    if (!response.ok) {
      const error = await response.text()
      throw new Error(`SyncLabs API error: ${error}`)
    }
    
    const data = await response.json()
    
    // Polling para obtener resultado
    return await this.pollSyncLabsTask(apiKey, data.id || data.request_id)
  }
  
  private async pollSyncLabsTask(apiKey: string, taskId: string): Promise<string> {
    const maxAttempts = 60
    let attempts = 0
    
    while (attempts < maxAttempts) {
      await this.sleep(5000)
      
      const response = await fetch(`https://api.sync.so/v2/generate/${taskId}`, {
        headers: { 'x-api-key': apiKey }
      })
      
      if (!response.ok) {
        throw new Error(`SyncLabs polling error: ${response.statusText}`)
      }
      
      const data = await response.json()
      
      if (data.status === 'completed' || data.status === 'COMPLETED') {
        return data.output_url || data.output?.url
      } else if (data.status === 'failed' || data.status === 'FAILED') {
        throw new Error('SyncLabs task failed')
      }
      
      attempts++
    }
    
    throw new Error('SyncLabs task timeout')
  }
  
  private async generateImageWithFlux(apiKey: string, prompt: string): Promise<string> {
    const response = await fetch('https://fal.run/fal-ai/flux/dev', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Key ${apiKey}`
      },
      body: JSON.stringify({
        prompt,
        image_size: 'landscape_16_9',
        num_images: 1,
        num_inference_steps: 28,
        guidance_scale: 3.5
      })
    })
    
    if (!response.ok) {
      const error = await response.text()
      throw new Error(`Fal.ai API error: ${error}`)
    }
    
    const data = await response.json()
    
    // FAL.AI puede devolver directamente o necesitar polling
    if (data.images && data.images.length > 0) {
      return data.images[0].url || data.images[0]
    } else if (data.request_id) {
      return await this.pollFalTask(apiKey, data.request_id)
    } else {
      throw new Error('Unexpected FAL.AI response format')
    }
  }
  
  private async pollFalTask(apiKey: string, requestId: string): Promise<string> {
    const maxAttempts = 60
    let attempts = 0
    
    while (attempts < maxAttempts) {
      await this.sleep(2000)
      
      const response = await fetch(`https://fal.run/fal-ai/flux/dev/requests/${requestId}`, {
        headers: { 'Authorization': `Key ${apiKey}` }
      })
      
      if (!response.ok) {
        throw new Error(`FAL.AI polling error: ${response.statusText}`)
      }
      
      const data = await response.json()
      
      if (data.status === 'COMPLETED') {
        if (data.images && data.images.length > 0) {
          return data.images[0].url || data.images[0]
        }
        throw new Error('FAL.AI completed but no images in response')
      } else if (data.status === 'FAILED') {
        throw new Error(`FAL.AI error: ${data.error || 'Unknown error'}`)
      }
      
      attempts++
    }
    
    throw new Error('FAL.AI task timeout')
  }
  
  private async generateMusicWithBeatoven(apiKey: string, genre: string, duration: number): Promise<string> {
    // Implementar llamada a Beatoven.ai
    const response = await fetch('https://www.beatoven.ai/api/v1/music/generate', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        genre,
        duration,
        mood: 'epic'
      })
    })
    
    if (!response.ok) {
      const error = await response.text()
      throw new Error(`Beatoven API error: ${error}`)
    }
    
    const data = await response.json()
    return data.url || data.music_url || 'music_url_placeholder'
  }
  
  // -------------------------------------------
  // GUARDAR DATOS EN BD
  // -------------------------------------------
  
  private async saveScreenplay(screenplay: any): Promise<void> {
    console.log('[PIPELINE] Saving screenplay to database...')
    
    try {
      // Guardar script completo - primero verificar si existe
      const fullText = JSON.stringify(screenplay.scenes || [], null, 2)
      const summary = `Guión con ${screenplay.scenes?.length || 0} escenas generadas automáticamente`
      
      // Verificar si ya existe un script para esta película
      const { data: existingScript } = await this.supabase
        .from('scripts')
        .select('id')
        .eq('movie_id', this.movieId)
        .single()
      
      let scriptError
      if (existingScript) {
        // Actualizar script existente
        const { error } = await this.supabase
          .from('scripts')
          .update({
            full_text: fullText,
            summary: summary,
            total_scenes: screenplay.scenes?.length || 0,
            is_approved: true,
            updated_at: new Date().toISOString()
          })
          .eq('movie_id', this.movieId)
        scriptError = error
      } else {
        // Insertar nuevo script
        const { error } = await this.supabase
          .from('scripts')
          .insert({
            movie_id: this.movieId,
            full_text: fullText,
            summary: summary,
            total_scenes: screenplay.scenes?.length || 0,
            is_approved: true
          })
        scriptError = error
      }
      
      if (scriptError) {
        console.warn('[PIPELINE] Could not save script (non-fatal):', scriptError.message)
      } else {
        console.log('[PIPELINE] ✅ Script saved to database')
      }
      
      // Guardar escenas individuales
      if (screenplay.scenes && screenplay.scenes.length > 0) {
        // Función helper para validar UUID
        const isValidUUID = (str: string): boolean => {
          const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
          return uuidRegex.test(str)
        }
        
        const scenesToInsert = screenplay.scenes.map((scene: any, index: number) => {
          // Filtrar character_ids para solo incluir UUIDs válidos
          let validCharacterIds: string[] = []
          if (Array.isArray(scene.characters)) {
            validCharacterIds = scene.characters.filter((char: any) => {
              if (typeof char === 'string') {
                return isValidUUID(char)
              }
              return false
            })
          }
          
          return {
            movie_id: this.movieId,
            scene_number: scene.scene_number || index + 1,
            description: scene.action || scene.description || '',
            dialogue: Array.isArray(scene.dialogue) 
              ? scene.dialogue.map((d: any) => `${d.character || 'Character'}: ${d.line || ''}`).join('\n')
              : (typeof scene.dialogue === 'string' ? scene.dialogue : ''),
            character_ids: validCharacterIds, // ⭐ Solo UUIDs válidos
            visual_prompt: `${scene.action || ''} in ${scene.location || ''} ${scene.time_of_day || ''}`.trim(),
            audio_prompt: '',
            music_mood: null,
            clip_status: 'pending',
            visual_context: null
          }
        })
        
        // Eliminar escenas existentes y crear nuevas
        await this.supabase.from('scenes').delete().eq('movie_id', this.movieId)
        
        const { error: scenesError } = await this.supabase
          .from('scenes')
          .insert(scenesToInsert)
        
        if (scenesError) {
          console.warn('[PIPELINE] Could not save scenes (non-fatal):', scenesError.message)
          console.warn('[PIPELINE] Scenes error details:', JSON.stringify(scenesError, null, 2))
        } else {
          console.log(`[PIPELINE] ✅ Saved ${scenesToInsert.length} scenes to database`)
        }
      }
    } catch (error: any) {
      console.error('[PIPELINE] Error saving screenplay:', error.message)
      console.error('[PIPELINE] Error stack:', error.stack)
      // No lanzar error para no romper el pipeline
    }
  }
  
  private async saveSceneVideos(videos: any[]): Promise<void> {
    console.log('[PIPELINE] Saving scene videos to database...')
    
    try {
      for (const video of videos) {
        const sceneNumber = video.scene_number || 1
        
        // Verificar si la escena existe
        const { data: existingScene } = await this.supabase
          .from('scenes')
          .select('id')
          .eq('movie_id', this.movieId)
          .eq('scene_number', sceneNumber)
          .single()
        
        if (existingScene) {
          // Actualizar escena existente
          const { error } = await this.supabase
            .from('scenes')
            .update({
              clip_url: video.video_url,
              clip_status: video.video_url ? 'completed' : 'pending',
              updated_at: new Date().toISOString()
            })
            .eq('movie_id', this.movieId)
            .eq('scene_number', sceneNumber)
          
          if (error) {
            console.warn(`[PIPELINE] Could not update scene ${sceneNumber} video:`, error.message)
          } else {
            console.log(`[PIPELINE] ✅ Updated scene ${sceneNumber} with video URL`)
          }
        } else {
          // Crear escena si no existe
          const { error } = await this.supabase
            .from('scenes')
            .insert({
              movie_id: this.movieId,
              scene_number: sceneNumber,
              description: video.scene_data?.action || video.scene_data?.description || `Escena ${sceneNumber}`,
              dialogue: '',
              character_ids: [],
              visual_prompt: '',
              audio_prompt: '',
              music_mood: null,
              clip_url: video.video_url,
              clip_status: video.video_url ? 'completed' : 'pending',
              visual_context: null
            })
          
          if (error) {
            console.warn(`[PIPELINE] Could not create scene ${sceneNumber} with video:`, error.message)
          } else {
            console.log(`[PIPELINE] ✅ Created scene ${sceneNumber} with video URL`)
          }
        }
      }
    } catch (error: any) {
      console.error('[PIPELINE] Error saving scene videos:', error.message)
    }
  }
  
  private async saveSceneAudio(dialogueAudio: any[]): Promise<void> {
    console.log('[PIPELINE] Saving scene audio to database...')
    
    try {
      for (const sceneAudio of dialogueAudio) {
        const sceneNumber = sceneAudio.scene_number || 1
        
        // Obtener el primer audio del diálogo (usar el primero que tenga URL válida)
        let audioUrl: string | null = null
        if (sceneAudio.dialogues && Array.isArray(sceneAudio.dialogues) && sceneAudio.dialogues.length > 0) {
          // Buscar el primer diálogo con audio_url válida
          const dialogueWithAudio = sceneAudio.dialogues.find((d: any) => d.audio_url)
          audioUrl = dialogueWithAudio?.audio_url || null
        }
        
        // Si hay audio, actualizar la escena
        if (audioUrl) {
          const { error } = await this.supabase
            .from('scenes')
            .update({
              audio_dialogue_url: audioUrl,
              updated_at: new Date().toISOString()
            })
            .eq('movie_id', this.movieId)
            .eq('scene_number', sceneNumber)
          
          if (error) {
            console.warn(`[PIPELINE] Could not update scene ${sceneNumber} audio:`, error.message)
          } else {
            console.log(`[PIPELINE] ✅ Updated scene ${sceneNumber} with audio URL`)
          }
        } else {
          console.log(`[PIPELINE] No audio URL available for scene ${sceneNumber}`)
        }
      }
    } catch (error: any) {
      console.error('[PIPELINE] Error saving scene audio:', error.message)
    }
  }
  
  private buildVideoPrompt(scene: any, visualBibles: any[]): string {
    const bible = visualBibles.find(b => 
      scene.location?.toLowerCase().includes(b.location_name.toLowerCase())
    )
    
    let prompt = `${scene.action || 'Scene'} in ${scene.location || 'unknown location'}`
    
    if (scene.time_of_day) {
      prompt += `, ${scene.time_of_day}`
    }
    
    if (bible?.base_prompt) {
      prompt = `${bible.base_prompt}. ${prompt}`
    }
    
    prompt += ', cinematic, 4K quality, professional cinematography'
    
    return prompt
  }
  
  // ==========================================
  // MÉTODOS DE UTILIDAD
  // ==========================================
  
  private currentStep: string = 'initializing'
  
  private getCurrentStep(): string {
    return this.currentStep
  }
  
  private async getCurrentMetadata(): Promise<any> {
    const { data } = await this.supabase
      .from('movies')
      .select('metadata')
      .eq('id', this.movieId)
      .single()
    
    return data?.metadata || {}
  }
  
  private async updateProgress(
    step: string,
    status: 'pending' | 'running' | 'completed' | 'failed',
    progress: number,
    detail?: string
  ): Promise<void> {
    this.currentStep = step
    
    console.log(`[PIPELINE] ${step}: ${status} (${progress}%) - ${detail || ''}`)
    
    try {
      // Calcular progreso total (debe sumar 100)
      const stepWeights: Record<string, number> = {
        validate_providers: 2,
        research_locations: 5,
        generate_screenplay: 10,
        assign_characters: 8,
        generate_videos: 35,
        generate_audio: 10,
        apply_lip_sync: 10,
        generate_music: 5,
        assemble_movie: 10,
        generate_cover: 3,
        finalize: 2
      }
      
      // Obtener progreso actual (con manejo de errores)
      let steps: any = {}
      try {
        const { data: progressData } = await this.supabase
          .from('movie_creation_progress')
          .select('steps')
          .eq('movie_id', this.movieId)
          .maybeSingle() // Usar maybeSingle para no fallar si no existe
        
        steps = progressData?.steps || {}
      } catch (e) {
        console.warn(`[PIPELINE] Could not fetch progress, initializing empty steps:`, e)
        steps = {}
      }
      
      // Si hay pasos existentes, preservar sus estados (no resetear)
      // Solo actualizar el paso actual
      
      // Actualizar el paso actual
      steps[step] = { 
        status, 
        progress: Math.max(0, Math.min(100, progress)), // Asegurar que esté entre 0-100
        detail: detail || '', 
        updated_at: new Date().toISOString() 
      }
      
      // Calcular progreso total acumulativo
      let overallProgress = 0
      for (const [stepName, weight] of Object.entries(stepWeights)) {
        const stepData = steps[stepName]
        const stepProgress = stepData?.progress || 0
        const stepStatus = stepData?.status
        
        // Si el paso está completado, sumar el peso completo
        if (stepStatus === 'completed') {
          overallProgress += weight
        } 
        // Si el paso está en ejecución, sumar el porcentaje del peso
        else if (stepStatus === 'running') {
          overallProgress += (Math.max(0, Math.min(100, stepProgress)) / 100) * weight
        }
        // Si el paso está pendiente o no existe, no suma nada (0)
      }
      
      // Asegurar que el progreso total esté entre 0-100
      overallProgress = Math.max(0, Math.min(100, Math.round(overallProgress * 10) / 10))
      
      // Actualizar en DB (con manejo de errores)
      try {
        const progressUpdate = {
          steps,
          current_step: step,
          current_step_detail: detail || '',
          overall_progress: Math.round(overallProgress),
          overall_status: status === 'failed' ? 'failed' : (status === 'completed' && overallProgress === 100 ? 'completed' : 'processing'),
          updated_at: new Date().toISOString()
        }
        
        console.log(`[PIPELINE] Updating progress:`, {
          movie_id: this.movieId,
          step,
          status,
          overall_progress: Math.round(overallProgress)
        })
        
        // Intentar upsert (insert o update) - más seguro si la tabla existe o no
        const { error: progressError } = await this.supabase
          .from('movie_creation_progress')
          .upsert({
            movie_id: this.movieId,
            ...progressUpdate
          }, {
            onConflict: 'movie_id'
          })
        
        // PRIMERO actualizar la película (más crítico, siempre debe funcionar)
        const movieStatus = status === 'failed' ? 'failed' : (status === 'completed' && overallProgress === 100 ? 'completed' : 'processing')
        const { error: movieError } = await this.supabase
          .from('movies')
          .update({
            progress: Math.round(overallProgress),
            status: movieStatus
          })
          .eq('id', this.movieId)
        
        if (movieError) {
          console.error(`[PIPELINE] Error updating movies table:`, movieError)
          // No lanzar error para movies, pero es más crítico que la tabla de progreso
        } else {
          console.log(`[PIPELINE] ✅ Movie updated: ${step} -> ${status} (${Math.round(overallProgress)}%)`)
        }
        
        // LUEGO intentar actualizar la tabla de progreso (puede no existir)
        if (progressError) {
          // Si el error es que la tabla no existe, solo loguear y continuar
          if (progressError.code === 'PGRST205' || progressError.message?.includes('not found') || progressError.message?.includes('schema cache')) {
            console.warn(`[PIPELINE] ⚠️ Progress table doesn't exist, skipping progress update. Movie table was updated successfully.`)
            console.warn(`[PIPELINE] Hint: Run the migration: supabase-migrations/create-movie-creation-progress.sql`)
          } else {
            console.error(`[PIPELINE] Error updating movie_creation_progress:`, progressError)
            // No lanzar error para que el pipeline continúe
          }
        } else {
          console.log(`[PIPELINE] ✅ Progress table updated successfully`)
        }
      } catch (e: any) {
        console.error(`[PIPELINE] ❌ Error updating progress in DB:`, e?.message || e)
        console.error(`[PIPELINE] Error details:`, e)
        // No lanzar error para que el pipeline continúe, pero loguear
        // Si es crítico, el error se capturará en el nivel superior
      }
    } catch (error) {
      console.error(`[PIPELINE] Unexpected error in updateProgress:`, error)
      // No lanzar error para que el pipeline continúe ejecutándose
    }
  }
  
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms))
  }
  
  // ==========================================
  // MÉTODO DE UTILIDAD: SUBIR A STORAGE
  // ==========================================
  
  private async uploadToStorage(blob: Blob, filePath: string): Promise<string> {
    try {
      // Convertir blob a buffer
      const arrayBuffer = await blob.arrayBuffer()
      const buffer = new Uint8Array(arrayBuffer)
      
      // Determinar content type
      const contentType = blob.type || 'audio/mpeg'
      
      // Usar bucket 'movies' para archivos de películas
      const bucketName = 'movies'
      
      // Construir path completo con movieId
      const fullPath = `${this.movieId}/${filePath}`
      
      console.log(`[PIPELINE] [UPLOAD] Uploading to storage: ${bucketName}/${fullPath} (${blob.size} bytes, ${contentType})`)
      
      // Intentar crear bucket si no existe (con manejo de errores)
      try {
        const { data: buckets } = await this.supabase.storage.listBuckets()
        const bucketExists = buckets?.some(b => b.name === bucketName)
        
        if (!bucketExists) {
          console.log(`[PIPELINE] [UPLOAD] Bucket '${bucketName}' does not exist, attempting to create...`)
          await this.supabase.storage.createBucket(bucketName, {
            public: true,
            fileSizeLimit: 100 * 1024 * 1024 // 100MB
          })
        }
      } catch (bucketError) {
        console.warn(`[PIPELINE] [UPLOAD] Could not create bucket (may already exist):`, bucketError)
      }
      
      // Subir archivo
      const { data: uploadData, error: uploadError } = await this.supabase.storage
        .from(bucketName)
        .upload(fullPath, buffer, {
          contentType,
          upsert: true, // Permitir sobrescribir
          cacheControl: '3600'
        })
      
      if (uploadError) {
        console.error(`[PIPELINE] [UPLOAD] Error uploading:`, uploadError)
        throw new Error(`Failed to upload to storage: ${uploadError.message}`)
      }
      
      // Obtener URL pública
      const { data: urlData } = this.supabase.storage
        .from(bucketName)
        .getPublicUrl(fullPath)
      
      if (!urlData?.publicUrl) {
        throw new Error('Failed to get public URL for uploaded file')
      }
      
      console.log(`[PIPELINE] [UPLOAD] ✅ File uploaded: ${urlData.publicUrl}`)
      return urlData.publicUrl
      
    } catch (error: any) {
      console.error(`[PIPELINE] [UPLOAD] Error uploading to storage:`, error.message)
      // Si falla el upload, retornar un placeholder para no romper el pipeline
      return `placeholder://audio/${Date.now()}.mp3`
    }
  }
  
  private buildVideoPromptFromScene(scene: any): string {
    // Construir prompt corto para video desde la escena detallada
    const parts: string[] = []
    
    // Estilo base
    parts.push('Cinematic scene, natural movement, 4K quality')
    
    // Ubicación y tiempo
    if (scene.header?.location) {
      parts.push(`Location: ${scene.header.location}`)
    }
    if (scene.header?.time) {
      parts.push(`Time: ${scene.header.time}`)
    }
    
    // Acción principal (SIN diálogos)
    if (scene.action_description?.summary) {
      parts.push(scene.action_description.summary)
    }
    
    // Personajes y posiciones (sin diálogos)
    if (scene.characters_in_scene) {
      const charDesc = scene.characters_in_scene
        .map((c: any) => `${c.character_name} ${c.action || ''}`.trim())
        .filter((s: string) => s.length > 0)
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
}
