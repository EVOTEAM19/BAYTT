// src/lib/movie-generation/audio-processor.ts

import { SupabaseClient } from '@supabase/supabase-js'

interface Dialogue {
  character: string
  line: string
  emotion?: string
  delivery?: {
    pace?: string
    volume?: string
    tone?: string
  }
  timing?: {
    start_second: number
    duration_seconds: number
  }
}

export class AudioProcessor {
  private supabase: SupabaseClient
  private elevenLabsApiKey: string
  private syncLabsApiKey: string
  
  constructor(
    supabase: SupabaseClient,
    elevenLabsApiKey: string,
    syncLabsApiKey: string
  ) {
    this.supabase = supabase
    this.elevenLabsApiKey = elevenLabsApiKey
    this.syncLabsApiKey = syncLabsApiKey
  }
  
  /**
   * Procesar TODOS los diálogos de una escena
   * Separado del video para no sobrecargar el prompt
   */
  async processSceneDialogues(
    sceneId: string,
    dialogues: Dialogue[],
    videoUrl: string
  ): Promise<string> {
    console.log(`[AUDIO] Processing ${dialogues.length} dialogues for scene`)
    
    // 1. Generar audio para cada diálogo
    const audioUrls: string[] = []
    
    for (const dialogue of dialogues) {
      const audioUrl = await this.generateDialogueAudio(dialogue)
      
      if (audioUrl) {
        audioUrls.push(audioUrl)
        
        // Guardar en scene_audio
        await this.supabase
          .from('scene_audio')
          .insert({
            scene_id: sceneId,
            character_name: dialogue.character,
            dialogue_text: dialogue.line,
            emotion: dialogue.emotion,
            pace: dialogue.delivery?.pace,
            volume: dialogue.delivery?.volume,
            tone: dialogue.delivery?.tone,
            start_second: dialogue.timing?.start_second,
            duration_seconds: dialogue.timing?.duration_seconds,
            audio_url: audioUrl,
            status: 'generated'
          } as any)
      }
    }
    
    if (audioUrls.length === 0) {
      console.warn('[AUDIO] No audio generated, returning original video')
      return videoUrl
    }
    
    // 2. Aplicar lip sync al video con todos los audios
    // Por ahora usar el primer audio, TODO: Combinar audios con timing correcto
    const lipSyncedVideoUrl = await this.applyLipSync(sceneId, videoUrl, audioUrls[0])
    
    return lipSyncedVideoUrl || videoUrl
  }
  
  /**
   * Generar audio de un diálogo con ElevenLabs
   */
  private async generateDialogueAudio(dialogue: Dialogue): Promise<string | null> {
    try {
      console.log(`[AUDIO] Generating audio for: "${dialogue.line.substring(0, 50)}..."`)
      
      // Buscar voice ID del personaje (simplificado)
      // TODO: Obtener voice_id real del personaje desde la DB
      const voiceId = 'default-voice-id' // Placeholder
      
      const response = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'xi-api-key': this.elevenLabsApiKey
        },
        body: JSON.stringify({
          text: dialogue.line,
          model_id: 'eleven_multilingual_v2',
          voice_settings: {
            stability: 0.5,
            similarity_boost: 0.75,
            style: dialogue.emotion ? 0.5 : 0.0,
            use_speaker_boost: true
          }
        })
      })
      
      if (!response.ok) {
        const error = await response.text()
        console.error(`[AUDIO] ElevenLabs error: ${error}`)
        return null
      }
      
      // Convertir respuesta a blob y subir a storage
      const audioBlob = await response.blob()
      const audioUrl = await this.uploadAudioToStorage(audioBlob, dialogue.character)
      
      return audioUrl
      
    } catch (error) {
      console.error('[AUDIO] Error generating dialogue audio:', error)
      return null
    }
  }
  
  /**
   * Subir audio a Supabase Storage
   */
  private async uploadAudioToStorage(audioBlob: Blob, characterName: string): Promise<string> {
    const fileName = `audio-${Date.now()}-${characterName.replace(/[^a-z0-9]/gi, '-')}.mp3`
    const filePath = `movies/audio/${fileName}`
    
    const { data, error } = await this.supabase.storage
      .from('movies')
      .upload(filePath, audioBlob, {
        contentType: 'audio/mpeg',
        upsert: false
      })
    
    if (error) {
      console.error('[AUDIO] Error uploading audio:', error)
      throw error
    }
    
    // Obtener URL pública
    const { data: { publicUrl } } = this.supabase.storage
      .from('movies')
      .getPublicUrl(filePath)
    
    return publicUrl
  }
  
  /**
   * Aplicar lip sync con Sync Labs
   */
  private async applyLipSync(
    sceneId: string,
    videoUrl: string,
    audioUrl: string
  ): Promise<string | null> {
    try {
      console.log('[AUDIO] Applying lip sync...')
      
      const response = await fetch('https://api.sync.so/v2/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': this.syncLabsApiKey
        },
        body: JSON.stringify({
          video_url: videoUrl,
          audio_url: audioUrl,
          model: 'sync-1.7.1'
        })
      })
      
      if (!response.ok) {
        const error = await response.text()
        console.error('[AUDIO] Lip sync failed:', error)
        return null
      }
      
      const data = await response.json()
      const taskId = data.id || data.task_id
      
      // Polling para resultado
      const lipSyncedUrl = await this.pollSyncLabs(taskId)
      
      if (lipSyncedUrl) {
        // Actualizar escena con video con lip sync
        await this.supabase
          .from('scene_audio')
          .update({
            lip_sync_applied: true,
            lip_synced_video_url: lipSyncedUrl
          } as any)
          .eq('scene_id', sceneId)
          .eq('audio_url', audioUrl)
      }
      
      return lipSyncedUrl || null
      
    } catch (error) {
      console.error('[AUDIO] Error applying lip sync:', error)
      return null
    }
  }
  
  private async pollSyncLabs(taskId: string): Promise<string | null> {
    const maxAttempts = 120
    let attempts = 0
    
    while (attempts < maxAttempts) {
      const response = await fetch(`https://api.sync.so/v2/generate/${taskId}`, {
        headers: {
          'x-api-key': this.syncLabsApiKey
        }
      })
      
      if (!response.ok) {
        console.error('[AUDIO] Sync Labs polling error')
        return null
      }
      
      const data = await response.json()
      
      if (data.status === 'COMPLETED' || data.status === 'SUCCEEDED') {
        return data.output?.url || data.video_url || null
      } else if (data.status === 'FAILED') {
        console.error('[AUDIO] Sync Labs task failed')
        return null
      }
      
      await new Promise(r => setTimeout(r, 5000))
      attempts++
    }
    
    console.error('[AUDIO] Sync Labs timeout')
    return null
  }
}
