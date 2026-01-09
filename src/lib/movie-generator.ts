// ============================================
// GENERADOR DE PELÍCULA CON CONTEXTO
// ============================================
// Ejemplo de uso del sistema de contexto persistente

import { ContextualVideoGenerator } from './ai/contextual-video-generator'
import { generateSequenceContext } from './ai/sequence-context-generator'
import { ProfessionalVideoAssembler } from './video/professional-assembler'
import { MovieContext, SequenceContext, SceneContext } from '@/types/scene-context'
import type { Movie, Scene } from '@/types/database'
import type { Character } from '@/types/database'

// ============================================
// TIPOS
// ============================================

interface Screenplay {
  title: string
  setting: {
    era: string
    year: number
  }
  style: string
  color_palette: string[]
  mood: string
  sequences: Array<{
    description: string
    scenes: Array<{
      scene_number: number
      description: string
      dialogue: string | null
      characters: Character[]
    }>
    next_sequence_id?: string
  }>
}

// ============================================
// FUNCIÓN PRINCIPAL
// ============================================

export async function generateMovieWithContext(screenplay: Screenplay): Promise<Movie> {
  
  // 1. Crear contexto de película
  const movieContext: MovieContext = {
    id: crypto.randomUUID(),
    title: screenplay.title,
    visual_style: {
      era: screenplay.setting.era,
      aesthetic: screenplay.style,
      color_palette: screenplay.color_palette,
      lighting_style: 'cinematográfico',
      camera_style: 'estable'
    },
    time_period: {
      year: screenplay.setting.year,
      season: 'verano',
      general_time: 'variado'
    },
    tone: {
      mood: screenplay.mood,
      pacing: 'medio'
    }
  }
  
  console.log(`\n🎬 Iniciando generación de película: ${movieContext.title}`)
  console.log(`   Estilo: ${movieContext.visual_style.aesthetic}`)
  console.log(`   Era: ${movieContext.visual_style.era}`)
  
  // 2. Crear generador con contexto
  const generator = new ContextualVideoGenerator(movieContext)
  
  const allScenes: Scene[] = []
  let previousSequence: SequenceContext | undefined = undefined
  
  // 3. Procesar cada secuencia del guión
  for (const sequenceDesc of screenplay.sequences) {
    
    console.log(`\n📋 Procesando secuencia: ${sequenceDesc.description}`)
    
    // Generar contexto de la secuencia
    const sequenceContext = await generateSequenceContext(
      movieContext,
      sequenceDesc.description,
      previousSequence
    )
    
    generator.registerSequence(sequenceContext)
    
    console.log(`📍 NUEVA SECUENCIA: ${sequenceContext.location.name}`)
    console.log(`   Elementos fijos: ${sequenceContext.location.fixed_elements.join(', ')}`)
    console.log(`   Prohibidos: ${sequenceContext.location.forbidden_elements.join(', ')}`)
    console.log(`   Hora: ${sequenceContext.time.time_description}`)
    console.log(`   Iluminación: ${sequenceContext.lighting.quality}`)
    
    // 4. Generar cada escena de la secuencia
    for (const sceneData of sequenceDesc.scenes) {
      
      // Crear contexto de escena
      const sceneContext: SceneContext = {
        id: crypto.randomUUID(),
        scene_number: sceneData.scene_number,
        sequence_id: sequenceContext.id,
        action: {
          description: sceneData.description,
          characters_present: sceneData.characters.map(c => c.id),
          dialogue: sceneData.dialogue,
          emotion: 'neutral'
        },
        camera: {
          shot_type: 'medium',
          angle: 'eye_level',
          movement: 'static'
        },
        allowed_variations: {
          lighting_variation: null,
          temporary_elements: []
        },
        transition: {
          type: 'cut',
          duration_ms: 0,
          next_scene_same_sequence: true
        }
      }
      
      console.log(`\n   🎬 Generando escena ${sceneData.scene_number}...`)
      
      const result = await generator.generateScene(
        sceneContext,
        sceneData.characters,
        3 // max retries
      )
      
      // Guardar resultado como Scene
      const scene: Scene = {
        id: sceneContext.id,
        movie_id: movieContext.id,
        scene_number: sceneData.scene_number,
        description: sceneData.description,
        dialogue: sceneData.dialogue,
        character_ids: sceneData.characters.map(c => c.id),
        visual_prompt: '', // Se genera internamente
        audio_prompt: '',
        music_mood: null,
        clip_url: result.video_url,
        clip_status: 'completed',
        audio_dialogue_url: null,
        last_frame_url: result.last_frame_url,
        first_frame_url: result.first_frame_url,
        visual_context: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }
      
      allScenes.push(scene)
      
      // Mostrar resumen de contexto
      console.log(generator.getContextSummary())
      
      // Si hay problemas de continuidad, mostrarlos
      if (!result.validation.is_valid) {
        console.log(`   ⚠️ Problemas detectados pero continuando...`)
      }
    }
    
    previousSequence = sequenceContext
    
    // Si hay cambio de secuencia
    if (sequenceDesc.next_sequence_id) {
      generator.handleSequenceChange(sequenceDesc.next_sequence_id)
    }
  }
  
  console.log(`\n✅ Generación de escenas completada`)
  console.log(`   Total de escenas: ${allScenes.length}`)
  
  // 5. Ensamblar película final
  console.log(`\n🔀 Ensamblando película final...`)
  
  const assembler = new ProfessionalVideoAssembler()
  
  // Preparar request de ensamblaje
  const assemblyRequest = {
    movie_id: movieContext.id,
    scenes: allScenes.map(s => ({
      id: s.id,
      scene_number: s.scene_number,
      description: s.description,
      dialogue: s.dialogue,
      character_ids: s.character_ids,
      duration_seconds: 10,
      visual_prompt: s.visual_prompt,
      audio_prompt: s.audio_prompt || '',
      visual_context: (s.visual_context as any)?.description || '',
      video_url: s.clip_url || '',
      lip_synced_url: s.clip_url || '',
      first_frame_url: s.first_frame_url || '',
      last_frame_url: s.last_frame_url || '',
      transition_to_next: 'cut' as const,
      transition_duration_ms: 500
    })),
    audio: {
      dialogue_tracks: allScenes.map((s, i) => ({
        url: s.audio_dialogue_url || '',
        type: 'dialogue' as const,
        start_time_ms: i * 10000,
        end_time_ms: (i + 1) * 10000,
        volume: 1.0
      })),
      music_track: {
        url: '', // Se generaría la música
        type: 'music' as const,
        start_time_ms: 0,
        end_time_ms: allScenes.length * 10000,
        volume: 0.6
      },
      sfx_tracks: []
    },
    output: {
      qualities: ['720p', '1080p', '4k'] as const,
      format: 'mp4' as const,
      codec: 'h264' as const
    }
  }
  
  const assembledUrls = await assembler.assemble(assemblyRequest)
  
  console.log(`\n🎉 Película ensamblada exitosamente`)
  console.log(`   URLs generadas:`, Object.keys(assembledUrls))
  
  // Retornar película (en producción, se guardaría en DB)
  return {
    id: movieContext.id,
    user_id: '', // Se asignaría del usuario actual
    title: movieContext.title,
    description: null,
    genre: '',
    duration_minutes: Math.ceil(allScenes.length * 10 / 60),
    user_prompt: '',
    user_plot: null,
    user_ending: null,
    ending_type: 'ai',
    status: 'completed',
    progress: 100,
    thumbnail_url: null,
    video_url_720p: assembledUrls['720p'] || null,
    video_url_1080p: assembledUrls['1080p'] || null,
    video_url_4k: assembledUrls['4k'] || null,
    is_published: false,
    rental_price: null,
    views_count: 0,
    rentals_count: 0,
    average_rating: null,
    available_plans: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  } as Movie
}

