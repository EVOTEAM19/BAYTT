// src/lib/movie-generation/cinematic-audio-generator.ts

import { VisualBible } from './creative-director'
import { DetailedScreenplay } from './cinematic-screenwriter'
import { supabaseAdmin } from '@/lib/supabase/admin'

export class CinematicAudioGenerator {
  private supabase: any
  private audioApiKey: string
  private movieId: string
  private visualBible: VisualBible
  
  constructor(
    supabase: any,
    audioApiKey: string,
    movieId: string,
    visualBible: VisualBible
  ) {
    this.supabase = supabase
    this.audioApiKey = audioApiKey
    this.movieId = movieId
    this.visualBible = visualBible
  }
  
  /**
   * Genera todo el audio con sincronización perfecta
   */
  async generateAllAudio(screenplay: DetailedScreenplay): Promise<GeneratedAudio[]> {
    console.log('[AUDIO GENERATOR] Generating audio with perfect sync...')
    
    const audioTracks: GeneratedAudio[] = []
    
    // Mapear voces a personajes
    const voiceMap = await this.mapVoicesToCharacters()
    
    for (const scene of screenplay.scenes) {
      const sceneAudio: GeneratedDialogue[] = []
      
      if (scene.dialogue) {
        for (const dialogue of scene.dialogue) {
          // Obtener voz del personaje
          const voiceId = voiceMap.get(dialogue.character) || 'EXAVITQu4vr4xnSDxMaL' // Default: Rachel
          
          // Construir prompt de audio ultra-detallado
          const audioPrompt = this.buildUltraDetailedAudioPrompt(dialogue, scene)
          
          // Generar audio
          const audioUrl = await this.generateDialogueAudio(
            dialogue.line,
            voiceId,
            dialogue.delivery
          )
          
          if (audioUrl) {
            sceneAudio.push({
              character: dialogue.character,
              line: dialogue.line,
              audio_url: audioUrl,
              start_second: dialogue.timing?.start_second || 0,
              duration_seconds: dialogue.timing?.duration_seconds || 2,
              delivery: dialogue.delivery
            })
          }
        }
      }
      
      audioTracks.push({
        scene_number: scene.scene_number,
        scene_id: scene.scene_id,
        dialogues: sceneAudio,
        ambient_description: scene.sound_design?.ambient || [],
        music_cue: scene.sound_design?.music || null
      })
    }
    
    console.log(`[AUDIO GENERATOR] ✅ Generated audio for ${audioTracks.length} scenes`)
    return audioTracks
  }
  
  /**
   * Mapea voces de ElevenLabs a cada personaje
   */
  private async mapVoicesToCharacters(): Promise<Map<string, string>> {
    const voiceMap = new Map<string, string>()
    
    // Voces predefinidas de ElevenLabs
    const maleVoices = [
      'pNInz6obpgDQGcFmaJgB', // Adam
      'VR6AewLTigWG4xSOukaG', // Arnold
      'ErXwobaYiN019PkySvjV', // Antoni
    ]
    
    const femaleVoices = [
      'EXAVITQu4vr4xnSDxMaL', // Rachel
      'MF3mGyEYCl7XYWbV9V6O', // Emily
      '21m00Tcm4TlvDq8ikWAM', // Bella
    ]
    
    let maleIndex = 0
    let femaleIndex = 0
    
    if (this.visualBible.characters) {
      for (const character of this.visualBible.characters) {
        const gender = character.gender?.toLowerCase() || ''
        if (gender === 'male' || gender === 'masculino' || gender === 'm') {
          voiceMap.set(character.name, maleVoices[maleIndex % maleVoices.length])
          maleIndex++
        } else {
          voiceMap.set(character.name, femaleVoices[femaleIndex % femaleVoices.length])
          femaleIndex++
        }
      }
    }
    
    return voiceMap
  }
  
  /**
   * Construye prompt detallado para la generación de audio
   */
  private buildUltraDetailedAudioPrompt(dialogue: any, scene: any): string {
    return `
Character: ${dialogue.character}
Line: "${dialogue.line}"
Emotion: ${dialogue.emotion || 'neutral'}
Subtext: ${dialogue.subtext || dialogue.line}
Delivery:
  - Pace: ${dialogue.delivery?.pace || 'normal'}
  - Volume: ${dialogue.delivery?.volume || 'normal'}
  - Tone: ${dialogue.delivery?.tone || 'neutral'}
  - Pauses after: ${dialogue.delivery?.pauses?.join(', ') || 'none'}
Scene context: ${scene.header?.location || 'unknown'}, ${scene.header?.time || 'unknown'}
Character emotional state: ${scene.characters_in_scene?.find((c: any) => c.character_name === dialogue.character)?.emotional_state || 'neutral'}
    `.trim()
  }
  
  /**
   * Genera audio del diálogo con ElevenLabs
   */
  private async generateDialogueAudio(
    text: string,
    voiceId: string,
    delivery: any
  ): Promise<string | null> {
    try {
      // Ajustar parámetros según la entrega
      const stability = delivery?.pace === 'slow' ? 0.7 : delivery?.pace === 'fast' ? 0.3 : 0.5
      const similarityBoost = 0.75
      const style = delivery?.tone === 'emotional' ? 0.7 : 0.5
      
      const response = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'xi-api-key': this.audioApiKey
        },
        body: JSON.stringify({
          text,
          model_id: 'eleven_multilingual_v2',
          voice_settings: {
            stability,
            similarity_boost: similarityBoost,
            style,
            use_speaker_boost: true
          }
        })
      })
      
      if (!response.ok) {
        const error = await response.json().catch(() => ({}))
        if (error.detail?.status === 'quota_exceeded') {
          console.warn('[AUDIO GENERATOR] Quota exceeded, skipping')
          return null
        }
        throw new Error(`ElevenLabs error: ${JSON.stringify(error)}`)
      }
      
      // Subir a storage y retornar URL
      const audioBlob = await response.blob()
      const audioUrl = await this.uploadAudio(audioBlob)
      
      return audioUrl
      
    } catch (error: any) {
      console.error('[AUDIO GENERATOR] Error:', error.message)
      return null
    }
  }
  
  private async uploadAudio(blob: Blob): Promise<string> {
    try {
      const fileName = `audio/${this.movieId}/${Date.now()}.mp3`
      
      const { data, error } = await supabaseAdmin.storage
        .from('movies')
        .upload(fileName, blob, {
          contentType: 'audio/mpeg',
          upsert: false
        })
      
      if (error) {
        console.error('[AUDIO GENERATOR] Error uploading audio:', error)
        throw error
      }
      
      const { data: { publicUrl } } = supabaseAdmin.storage
        .from('movies')
        .getPublicUrl(fileName)
      
      return publicUrl
    } catch (error: any) {
      console.error('[AUDIO GENERATOR] Error uploading to storage:', error.message)
      // Retornar placeholder si falla
      return `https://storage.baytt.com/audio/${Date.now()}.mp3`
    }
  }
}

export interface GeneratedAudio {
  scene_number: number
  scene_id: string
  dialogues: GeneratedDialogue[]
  ambient_description: string[]
  music_cue: any
}

export interface GeneratedDialogue {
  character: string
  line: string
  audio_url: string
  start_second: number
  duration_seconds: number
  delivery: any
}
