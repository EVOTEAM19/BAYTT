// ============================================
// BAYTT - Provider Types
// ============================================

// ============================================
// Provider Types
// ============================================

export type ProviderType = "video" | "audio" | "music" | "llm" | "storage" | "image" | "lora_training" | "lip_sync";

export const PROVIDER_TYPES: Record<ProviderType, { label: string; icon: string; description: string }> = {
  video: {
    label: "Video",
    icon: "🎬",
    description: "Generación de video y clips",
  },
  audio: {
    label: "Audio",
    icon: "🎤",
    description: "Síntesis de voz y diálogos",
  },
  music: {
    label: "Música",
    icon: "🎵",
    description: "Generación de música y bandas sonoras",
  },
  llm: {
    label: "LLM",
    icon: "🤖",
    description: "Modelos de lenguaje para guiones",
  },
  storage: {
    label: "Almacenamiento",
    icon: "☁️",
    description: "Almacenamiento de archivos y videos",
  },
  image: {
    label: "Imagen",
    icon: "🖼️",
    description: "Generación de imágenes hiperrealistas para personajes",
  },
  lora_training: {
    label: "Entrenamiento LoRA",
    icon: "🎓",
    description: "Entrenamiento de modelos LoRA personalizados",
  },
  lip_sync: {
    label: "Lip Sync",
    icon: "👄",
    description: "Sincronización de labios con audio",
  },
};

// ============================================
// Auth Methods
// ============================================

export type AuthMethod = "bearer" | "api_key" | "basic" | "custom" | "none";

export const AUTH_METHODS: Record<AuthMethod, { label: string; description: string }> = {
  bearer: {
    label: "Bearer Token",
    description: "Autenticación con token Bearer en header",
  },
  api_key: {
    label: "API Key",
    description: "Autenticación con clave API en header o query",
  },
  basic: {
    label: "Basic Auth",
    description: "Autenticación básica usuario/contraseña",
  },
  custom: {
    label: "Personalizado",
    description: "Método de autenticación personalizado",
  },
  none: {
    label: "Sin autenticación",
    description: "No requiere autenticación",
  },
};

// ============================================
// Preset Providers
// ============================================

export interface PresetProvider {
  id: string;
  name: string;
  slug: string;
  type: ProviderType;
  api_url: string | null;
  auth_method: AuthMethod;
  config: Record<string, unknown> | null;
  is_active: boolean;
  is_default: boolean;
  priority: number;
  cost_per_second: number | null;
  cost_per_request: number | null;
}

export const PRESET_PROVIDERS: PresetProvider[] = [
  // Video Providers
  {
    id: "runway",
    name: "Runway ML",
    slug: "runway",
    type: "video",
    api_url: "https://api.runwayml.com",
    auth_method: "bearer",
    config: {
      model: "gen3a",
      aspect_ratio: "16:9",
    },
    is_active: true,
    is_default: true,
    priority: 1,
    cost_per_second: 0.05,
    cost_per_request: null,
  },
  {
    id: "kling",
    name: "Kling AI",
    slug: "kling",
    type: "video",
    api_url: "https://api.klingai.com",
    auth_method: "bearer",
    config: {
      model: "kling-v1",
      quality: "high",
    },
    is_active: true,
    is_default: false,
    priority: 2,
    cost_per_second: 0.04,
    cost_per_request: null,
  },
  {
    id: "luma",
    name: "Luma Dream Machine",
    slug: "luma",
    type: "video",
    api_url: "https://api.lumalabs.ai",
    auth_method: "bearer",
    config: {
      model: "dream-machine",
    },
    is_active: true,
    is_default: false,
    priority: 3,
    cost_per_second: 0.03,
    cost_per_request: null,
  },
  {
    id: "veo",
    name: "Google Veo",
    slug: "veo",
    type: "video",
    api_url: "https://api.google.com/veo",
    auth_method: "bearer",
    config: {
      model: "veo-2",
    },
    is_active: true,
    is_default: false,
    priority: 4,
    cost_per_second: 0.06,
    cost_per_request: null,
  },
  {
    id: "video-mock",
    name: "Video Mock",
    slug: "video-mock",
    type: "video",
    api_url: null,
    auth_method: "none",
    config: {
      mock: true,
      delay_seconds: 2,
    },
    is_active: true,
    is_default: false,
    priority: 999,
    cost_per_second: 0,
    cost_per_request: 0,
  },
  
  // Audio Providers
  {
    id: "elevenlabs",
    name: "ElevenLabs",
    slug: "elevenlabs",
    type: "audio",
    api_url: "https://api.elevenlabs.io",
    auth_method: "api_key",
    config: {
      model: "eleven_multilingual_v2",
      stability: 0.5,
      similarity_boost: 0.75,
    },
    is_active: true,
    is_default: true,
    priority: 1,
    cost_per_second: 0.18,
    cost_per_request: null,
  },
  {
    id: "playht",
    name: "PlayHT",
    slug: "playht",
    type: "audio",
    api_url: "https://api.play.ht",
    auth_method: "bearer",
    config: {
      voice: "default",
      quality: "high",
    },
    is_active: true,
    is_default: false,
    priority: 2,
    cost_per_second: 0.15,
    cost_per_request: null,
  },
  {
    id: "openai-tts",
    name: "OpenAI TTS",
    slug: "openai-tts",
    type: "audio",
    api_url: "https://api.openai.com/v1/audio/speech",
    auth_method: "bearer",
    config: {
      model: "tts-1-hd",
      voice: "alloy",
    },
    is_active: true,
    is_default: false,
    priority: 3,
    cost_per_second: 0.015,
    cost_per_request: null,
  },
  {
    id: "audio-mock",
    name: "Audio Mock",
    slug: "audio-mock",
    type: "audio",
    api_url: null,
    auth_method: "none",
    config: {
      mock: true,
      delay_seconds: 1,
    },
    is_active: true,
    is_default: false,
    priority: 999,
    cost_per_second: 0,
    cost_per_request: 0,
  },
  
  // Music Providers
  {
    id: "suno",
    name: "Suno AI",
    slug: "suno",
    type: "music",
    api_url: "https://api.suno.ai",
    auth_method: "bearer",
    config: {
      model: "chirp-v3",
      duration: 30,
    },
    is_active: true,
    is_default: true,
    priority: 1,
    cost_per_second: 0.02,
    cost_per_request: null,
  },
  {
    id: "udio",
    name: "Udio",
    slug: "udio",
    type: "music",
    api_url: "https://api.udio.com",
    auth_method: "bearer",
    config: {
      model: "udio-v1",
    },
    is_active: true,
    is_default: false,
    priority: 2,
    cost_per_second: 0.025,
    cost_per_request: null,
  },
  {
    id: "music-mock",
    name: "Music Mock",
    slug: "music-mock",
    type: "music",
    api_url: null,
    auth_method: "none",
    config: {
      mock: true,
      delay_seconds: 3,
    },
    is_active: true,
    is_default: false,
    priority: 999,
    cost_per_second: 0,
    cost_per_request: 0,
  },
  
  // LLM Providers
  {
    id: "openai-gpt4",
    name: "OpenAI GPT-4",
    slug: "openai-gpt4",
    type: "llm",
    api_url: "https://api.openai.com/v1/chat/completions",
    auth_method: "bearer",
    config: {
      model: "gpt-4-turbo-preview",
      temperature: 0.7,
      max_tokens: 4000,
    },
    is_active: true,
    is_default: true,
    priority: 1,
    cost_per_second: null,
    cost_per_request: 0.03,
  },
  {
    id: "claude",
    name: "Anthropic Claude",
    slug: "claude",
    type: "llm",
    api_url: "https://api.anthropic.com/v1/messages",
    auth_method: "bearer",
    config: {
      model: "claude-3-opus-20240229",
      max_tokens: 4096,
    },
    is_active: true,
    is_default: false,
    priority: 2,
    cost_per_second: null,
    cost_per_request: 0.015,
  },
  {
    id: "llm-mock",
    name: "LLM Mock",
    slug: "llm-mock",
    type: "llm",
    api_url: null,
    auth_method: "none",
    config: {
      mock: true,
      delay_seconds: 2,
    },
    is_active: true,
    is_default: false,
    priority: 999,
    cost_per_second: null,
    cost_per_request: 0,
  },
  
  // Storage Providers
  {
    id: "cloudflare-r2",
    name: "Cloudflare R2",
    slug: "cloudflare-r2",
    type: "storage",
    api_url: "https://api.cloudflare.com/client/v4",
    auth_method: "bearer",
    config: {
      bucket: "baytt-videos",
      region: "auto",
    },
    is_active: true,
    is_default: true,
    priority: 1,
    cost_per_second: null,
    cost_per_request: 0.0001,
  },
  {
    id: "aws-s3",
    name: "AWS S3",
    slug: "aws-s3",
    type: "storage",
    api_url: "https://s3.amazonaws.com",
    auth_method: "api_key",
    config: {
      bucket: "baytt-videos",
      region: "us-east-1",
    },
    is_active: true,
    is_default: false,
    priority: 2,
    cost_per_second: null,
    cost_per_request: 0.0001,
  },
  {
    id: "supabase-storage",
    name: "Supabase Storage",
    slug: "supabase-storage",
    type: "storage",
    api_url: null,
    auth_method: "bearer",
    config: {
      bucket: "movies",
    },
    is_active: true,
    is_default: false,
    priority: 3,
    cost_per_second: null,
    cost_per_request: 0,
  },
  
  // Image Providers
  {
    id: "flux-pro-ultra",
    name: "Flux 1.1 Pro Ultra",
    slug: "flux_pro_ultra",
    type: "image",
    api_url: "https://api.bfl.ml/v1/flux-pro-1.1-ultra",
    auth_method: "api_key",
    config: {
      width: 1024,
      height: 1024,
      steps: 50,
      guidance: 3.5,
      safety_tolerance: 2,
      output_format: "png",
    },
    is_active: true,
    is_default: true,
    priority: 1,
    cost_per_second: null,
    cost_per_request: 0.06,
  },
  {
    id: "flux-replicate",
    name: "Flux 1.1 Pro (Replicate)",
    slug: "flux_replicate",
    type: "image",
    api_url: "https://api.replicate.com/v1/predictions",
    auth_method: "bearer",
    config: {
      model: "black-forest-labs/flux-1.1-pro",
      width: 1024,
      height: 1024,
    },
    is_active: true,
    is_default: false,
    priority: 2,
    cost_per_second: null,
    cost_per_request: 0.05,
  },
  {
    id: "midjourney",
    name: "Midjourney (via API)",
    slug: "midjourney",
    type: "image",
    api_url: "https://api.midjourney.com/v1",
    auth_method: "bearer",
    config: null,
    is_active: true,
    is_default: false,
    priority: 3,
    cost_per_second: null,
    cost_per_request: 0.08,
  },
  {
    id: "dalle3",
    name: "DALL-E 3",
    slug: "dalle3",
    type: "image",
    api_url: "https://api.openai.com/v1/images/generations",
    auth_method: "bearer",
    config: {
      model: "dall-e-3",
      size: "1024x1024",
      quality: "standard",
    },
    is_active: true,
    is_default: false,
    priority: 4,
    cost_per_second: null,
    cost_per_request: 0.04,
  },
  {
    id: "image-mock",
    name: "Mock Image (Desarrollo)",
    slug: "mock_image",
    type: "image",
    api_url: null,
    auth_method: "none",
    config: {
      mock: true,
      delay_seconds: 2,
    },
    is_active: true,
    is_default: false,
    priority: 999,
    cost_per_second: null,
    cost_per_request: 0,
  },
  
  // LoRA Training Providers
  {
    id: "replicate-lora",
    name: "Replicate LoRA Training",
    slug: "replicate_lora",
    type: "lora_training",
    api_url: "https://api.replicate.com/v1/trainings",
    auth_method: "bearer",
    config: {
      base_model: "black-forest-labs/flux-dev",
      steps: 1000,
      learning_rate: 0.0001,
    },
    is_active: true,
    is_default: true,
    priority: 1,
    cost_per_second: null,
    cost_per_request: 2.5,
  },
  {
    id: "fal-lora",
    name: "Fal.ai LoRA Training",
    slug: "fal_lora",
    type: "lora_training",
    api_url: "https://fal.ai/models/fal-ai/flux-lora-fast-training",
    auth_method: "api_key",
    config: null,
    is_active: true,
    is_default: false,
    priority: 2,
    cost_per_second: null,
    cost_per_request: 2.0,
  },
  
  // Lip Sync Providers
  {
    id: "sync-labs",
    name: "Sync Labs",
    slug: "sync_labs",
    type: "lip_sync",
    api_url: "https://api.sync.so/v2/generate",
    auth_method: "api_key",
    config: {
      model: "sync-1.6.0",
      output_format: "mp4",
      active_speaker: true,
    },
    is_active: true,
    is_default: true,
    priority: 1,
    cost_per_second: null,
    cost_per_request: 0.10,
  },
  {
    id: "wav2lip",
    name: "Wav2Lip (Replicate)",
    slug: "wav2lip",
    type: "lip_sync",
    api_url: "https://api.replicate.com/v1/predictions",
    auth_method: "bearer",
    config: {
      version: "devxpy/wav2lip",
      fps: 25,
      smooth: true,
    },
    is_active: true,
    is_default: false,
    priority: 2,
    cost_per_second: null,
    cost_per_request: 0.05,
  },
  {
    id: "sadtalker",
    name: "SadTalker (Replicate)",
    slug: "sadtalker",
    type: "lip_sync",
    api_url: "https://api.replicate.com/v1/predictions",
    auth_method: "bearer",
    config: {
      version: "cjwbw/sadtalker",
      enhancer: "gfpgan",
      preprocess: "full",
    },
    is_active: true,
    is_default: false,
    priority: 3,
    cost_per_second: null,
    cost_per_request: 0.07,
  },
  {
    id: "heygen",
    name: "HeyGen",
    slug: "heygen",
    type: "lip_sync",
    api_url: "https://api.heygen.com/v2/video/translate",
    auth_method: "api_key",
    config: {
      output_format: "mp4",
      resolution: "1080p",
    },
    is_active: true,
    is_default: false,
    priority: 4,
    cost_per_second: null,
    cost_per_request: 0.15,
  },
];

// ============================================
// AIProvider Interface (for database schema)
// ============================================

export interface AIProvider {
  id: string
  name: string
  provider_type: 'llm' | 'video' | 'audio' | 'image' | 'lip_sync' | 'music' | 'storage' | 'lora_training'
  
  // Configuración de API
  api_endpoint: string
  api_key?: string
  api_key_encrypted?: string
  
  // ⭐ NUEVO: Versión de API
  api_version?: string
  available_versions?: string[]
  
  // Estado
  is_active: boolean
  is_default: boolean
  
  // Configuración adicional
  config?: Record<string, any>
  
  // Metadata
  created_at: string
  updated_at: string
}

// ============================================
// Provider Versions
// ============================================

// Versiones disponibles por proveedor (hardcoded para referencia)
export const PROVIDER_VERSIONS: Record<string, { versions: string[]; default: string; description: Record<string, string> }> = {
  'runway': {
    versions: ['2024-11-06', '2024-09-13', '2024-06-14'],
    default: '2024-11-06',
    description: {
      '2024-11-06': 'Gen-3 Alpha Turbo (más reciente)',
      '2024-09-13': 'Gen-3 Alpha',
      '2024-06-14': 'Gen-2 (legacy)'
    }
  },
  'openai': {
    versions: ['gpt-4-turbo-preview', 'gpt-4-turbo', 'gpt-4o', 'gpt-4o-mini', 'gpt-3.5-turbo'],
    default: 'gpt-4-turbo-preview',
    description: {
      'gpt-4-turbo-preview': 'GPT-4 Turbo Preview (128K context)',
      'gpt-4-turbo': 'GPT-4 Turbo (128K context)',
      'gpt-4o': 'GPT-4o (más rápido)',
      'gpt-4o-mini': 'GPT-4o Mini (económico)',
      'gpt-3.5-turbo': 'GPT-3.5 Turbo (más económico)'
    }
  },
  'elevenlabs': {
    versions: ['v1', 'v2'],
    default: 'v1',
    description: {
      'v1': 'API v1 (estable)',
      'v2': 'API v2 (beta)'
    }
  },
  'fal-image': {
    versions: ['flux-pro/v1.1-ultra', 'flux-pro/v1.1', 'flux-pro', 'flux-dev', 'flux-schnell'],
    default: 'flux-pro/v1.1-ultra',
    description: {
      'flux-pro/v1.1-ultra': 'Flux Pro 1.1 Ultra (máxima calidad)',
      'flux-pro/v1.1': 'Flux Pro 1.1',
      'flux-pro': 'Flux Pro',
      'flux-dev': 'Flux Dev (desarrollo)',
      'flux-schnell': 'Flux Schnell (rápido, menor calidad)'
    }
  },
  'fal-lora': {
    versions: ['flux-lora-fast-training', 'flux-lora-training'],
    default: 'flux-lora-fast-training',
    description: {
      'flux-lora-fast-training': 'Entrenamiento rápido (~15 min)',
      'flux-lora-training': 'Entrenamiento estándar (~30 min)'
    }
  },
  'synclabs': {
    versions: ['sync-1.7.1', 'sync-1.6.0', 'sync-1.5.0'],
    default: 'sync-1.7.1',
    description: {
      'sync-1.7.1': 'Sync 1.7.1 (más reciente)',
      'sync-1.6.0': 'Sync 1.6.0',
      'sync-1.5.0': 'Sync 1.5.0 (legacy)'
    }
  },
  'beatoven': {
    versions: ['v1', 'v2-beta'],
    default: 'v1',
    description: {
      'v1': 'API v1 (estable)',
      'v2-beta': 'API v2 Beta'
    }
  }
}
