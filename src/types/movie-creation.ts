// ============================================
// TIPOS PARA CREACIÓN DE PELÍCULAS
// ============================================

/**
 * Estados del proceso de creación
 */
export type MovieCreationStatus = 
  | 'draft'           // Borrador, no iniciado
  | 'validating'      // Validando proveedores
  | 'researching'     // Investigando ubicaciones
  | 'writing'         // Generando guión
  | 'casting'         // Asignando personajes
  | 'generating_video'// Generando clips de video
  | 'generating_audio'// Generando voces
  | 'lip_syncing'     // Sincronizando labios
  | 'generating_music'// Generando música
  | 'assembling'      // Ensamblando película
  | 'generating_cover'// Generando portada
  | 'finalizing'      // Finalizando
  | 'completed'       // Completado
  | 'failed'          // Error
  | 'paused'          // Pausado

/**
 * Paso del proceso de creación
 */
export interface CreationStep {
  id: string
  name: string
  description: string
  status: 'pending' | 'running' | 'completed' | 'failed' | 'skipped'
  progress: number  // 0-100
  started_at?: Date | string
  completed_at?: Date | string
  error?: string
  details?: string
  updated_at?: Date | string
}

/**
 * Progreso completo de la creación
 */
export interface MovieCreationProgress {
  movie_id: string
  overall_status: MovieCreationStatus
  overall_progress: number  // 0-100
  current_step: string
  current_step_detail: string
  
  steps: {
    validate_providers: CreationStep
    research_locations: CreationStep
    generate_screenplay: CreationStep
    assign_characters: CreationStep
    generate_videos: CreationStep
    generate_audio: CreationStep
    apply_lip_sync: CreationStep
    generate_music: CreationStep
    assemble_movie: CreationStep
    generate_cover: CreationStep
    finalize: CreationStep
  }
  
  // Estadísticas
  stats: {
    total_scenes: number
    scenes_completed: number
    estimated_time_remaining: number  // segundos
    started_at: Date | string
    elapsed_time: number  // segundos
  }
  
  // Errores
  errors: Array<{
    step: string
    message: string
    timestamp: Date | string
    recoverable: boolean
  }>
}

/**
 * Verificación de proveedores
 */
export interface ProviderValidation {
  is_valid: boolean
  missing_providers: Array<{
    type: string
    name: string
    required: boolean
    reason: string
  }>
  configured_providers: Array<{
    type: string
    name: string
    status: 'active' | 'inactive' | 'error'
  }>
  warnings: string[]
}

/**
 * Opciones de selección de personajes
 */
export interface CharacterSelectionOptions {
  mode: 'random' | 'select' | 'mixed'
  
  // Para modo 'select' o 'mixed'
  selected_characters?: Array<{
    character_id: string
    role: string  // "protagonist", "antagonist", "supporting"
    role_name?: string  // Nombre del personaje en la película
  }>
  
  // Para modo 'random' o 'mixed'
  random_config?: {
    count: number
    from_library: 'baytt' | 'user' | 'both'
    gender_preference?: 'any' | 'male' | 'female' | 'mixed'
    age_range?: { min: number; max: number }
  }
}

/**
 * Formulario completo de creación
 */
export interface MovieCreationForm {
  // Información básica
  title: string
  prompt: string
  description?: string
  
  // Configuración
  genre: string
  sub_genres?: string[]
  target_duration_minutes: number
  style: string
  tone: string
  age_rating: string
  
  // Personajes
  character_selection: CharacterSelectionOptions
  
  // Opciones avanzadas
  options?: {
    auto_research_locations: boolean
    use_reference_images: boolean
    generate_trailer: boolean
    quality_preset: 'draft' | 'standard' | 'high' | 'ultra'
  }
  
  // Premium
  is_premium: boolean
}

