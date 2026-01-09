// ============================================
// TIPOS PARA PRODUCCIÓN DE VIDEO
// ============================================

export interface Scene {
  id: string
  scene_number: number
  description: string
  dialogue: string | null
  character_ids: string[]
  duration_seconds: number
  
  // Prompts para generación
  visual_prompt: string
  audio_prompt: string
  
  // Contexto visual (para continuidad)
  visual_context: string  // Descripción del estado visual al final de la escena
  
  // Referencias generadas
  video_url?: string
  audio_url?: string
  lip_synced_url?: string  // Video con labios sincronizados
  
  // Frames de referencia (para continuidad)
  first_frame_url?: string
  last_frame_url?: string
  
  // Metadatos
  transition_to_next: 'cut' | 'crossfade' | 'fade_black' | 'fade_white' | 'morph'
  transition_duration_ms: number
}

export interface VideoGenerationRequest {
  scene: Scene
  previous_scene?: Scene  // Para continuidad
  
  // Opciones de generación
  options: {
    resolution: '720p' | '1080p' | '4k'
    fps: 24 | 30 | 60
    duration_seconds: number
    use_reference_frame: boolean  // Usar último frame de escena anterior
  }
}

export interface LipSyncRequest {
  video_url: string
  audio_url: string
  character_id: string
  
  options: {
    quality: 'fast' | 'balanced' | 'high'
    face_detection_threshold: number
    sync_offset_ms: number
  }
}

export interface AssemblyRequest {
  movie_id: string
  scenes: Scene[]
  
  audio: {
    dialogue_tracks: AudioTrack[]
    music_track: AudioTrack
    sfx_tracks: AudioTrack[]
  }
  
  output: {
    qualities: ('480p' | '720p' | '1080p' | '4k')[]
    format: 'mp4' | 'webm'
    codec: 'h264' | 'h265' | 'vp9' | 'av1'
  }
}

export interface AudioTrack {
  url: string
  type: 'dialogue' | 'music' | 'sfx'
  start_time_ms: number
  end_time_ms: number
  volume: number  // 0-1
  fade_in_ms?: number
  fade_out_ms?: number
  ducking?: {
    trigger: 'dialogue'  // Bajar volumen cuando hay diálogo
    reduction_db: number
  }
}

export interface VideoQualityPreset {
  name: string
  resolution: { width: number; height: number }
  bitrate: string
  fps: number
  codec: string
  profile: string
}

export const VIDEO_QUALITY_PRESETS: Record<string, VideoQualityPreset> = {
  '480p': {
    name: '480p SD',
    resolution: { width: 854, height: 480 },
    bitrate: '2M',
    fps: 24,
    codec: 'libx264',
    profile: 'main'
  },
  '720p': {
    name: '720p HD',
    resolution: { width: 1280, height: 720 },
    bitrate: '5M',
    fps: 24,
    codec: 'libx264',
    profile: 'high'
  },
  '1080p': {
    name: '1080p Full HD',
    resolution: { width: 1920, height: 1080 },
    bitrate: '10M',
    fps: 24,
    codec: 'libx264',
    profile: 'high'
  },
  '4k': {
    name: '4K UHD',
    resolution: { width: 3840, height: 2160 },
    bitrate: '35M',
    fps: 24,
    codec: 'libx265',
    profile: 'main10'
  }
}

