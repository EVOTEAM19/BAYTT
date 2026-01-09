// ============================================
// SISTEMA DE CONTEXTO DE ESCENA
// ============================================

/**
 * Contexto global de la película
 * Se mantiene durante TODA la película
 */
export interface MovieContext {
  id: string
  title: string
  
  // Estilo visual global
  visual_style: {
    era: string              // "contemporáneo", "años 80", "futurista", "medieval"
    aesthetic: string        // "realista", "noir", "colorido", "desaturado"
    color_palette: string[]  // Colores dominantes de la película
    lighting_style: string   // "natural", "cinematográfico", "alto contraste"
    camera_style: string     // "estable", "handheld", "steadicam"
  }
  
  // Información temporal
  time_period: {
    year: number
    season: string
    general_time: string     // "día", "noche", "variado"
  }
  
  // Tono
  tone: {
    mood: string             // "tenso", "romántico", "acción", "comedia"
    pacing: string           // "lento", "medio", "rápido"
  }
}

/**
 * Contexto de SECUENCIA (grupo de escenas en misma ubicación)
 * ⭐ CRÍTICO: Este contexto se HEREDA a todas las escenas de la secuencia
 */
export interface SequenceContext {
  id: string
  sequence_number: number
  movie_id: string
  
  // ========================================
  // UBICACIÓN (NO PUEDE CAMBIAR EN LA SECUENCIA)
  // ========================================
  location: {
    type: 'interior' | 'exterior' | 'mixed'
    name: string                    // "Desierto de Arizona", "Oficina del detective"
    description: string             // Descripción detallada del lugar
    
    // Elementos fijos del escenario (SIEMPRE presentes)
    fixed_elements: string[]        // ["arena", "cactus", "montañas al fondo", "cielo despejado"]
    
    // Elementos que NO deben aparecer
    forbidden_elements: string[]    // ["agua", "árboles", "edificios", "nieve"]
    
    // Límites espaciales
    boundaries: string              // "horizonte desértico en todas direcciones"
  }
  
  // ========================================
  // TIEMPO (NO PUEDE CAMBIAR BRUSCAMENTE)
  // ========================================
  time: {
    time_of_day: 'dawn' | 'morning' | 'noon' | 'afternoon' | 'sunset' | 'dusk' | 'night' | 'late_night'
    
    // Progresión permitida dentro de la secuencia
    time_can_progress: boolean      // true = el tiempo puede avanzar gradualmente
    max_time_progression: string    // "30 minutos" - cuánto puede avanzar el tiempo
    
    // Descripción específica
    time_description: string        // "atardecer dorado, sol bajo en el horizonte"
  }
  
  // ========================================
  // ILUMINACIÓN (DEBE SER CONSISTENTE)
  // ========================================
  lighting: {
    primary_source: string          // "sol de atardecer", "luz de oficina fluorescente"
    direction: string               // "lateral desde el oeste", "cenital"
    quality: string                 // "cálida y dorada", "fría y dura"
    shadows: string                 // "largas hacia el este", "suaves y difusas"
    
    // Colores de la luz
    color_temperature: string       // "3200K cálido", "5600K neutro", "7000K frío"
    ambient_color: string           // "naranja dorado", "azul frío"
  }
  
  // ========================================
  // CLIMA Y AMBIENTE
  // ========================================
  weather: {
    condition: string               // "despejado", "nublado", "lluvioso", "nevando"
    intensity: string               // "leve", "moderado", "intenso"
    
    // Efectos atmosféricos
    atmospheric_effects: string[]   // ["polvo en el aire", "neblina ligera", "calima"]
    
    // NO puede cambiar bruscamente
    weather_locked: boolean         // true = el clima no puede cambiar en esta secuencia
  }
  
  // ========================================
  // ELEMENTOS VISUALES CONSTANTES
  // ========================================
  visual_constants: {
    // Colores dominantes de esta secuencia
    dominant_colors: string[]       // ["naranja", "marrón", "dorado"]
    
    // Texturas presentes
    textures: string[]              // ["arena", "roca", "metal oxidado"]
    
    // Profundidad de campo típica
    depth_of_field: string          // "profunda - todo en foco", "shallow - fondo desenfocado"
    
    // Estilo de cámara para esta secuencia
    camera_movement: string         // "lenta y contemplativa", "dinámica y nerviosa"
  }
  
  // ========================================
  // PROMPT BASE (Se añade a TODAS las escenas)
  // ========================================
  base_prompt: string               // Prompt que se concatena a cada escena
  
  // ========================================
  // ANTI-PROMPT (Lo que NUNCA debe aparecer)
  // ========================================
  negative_prompt_additions: string // Añadido al negative prompt de cada escena
  
  // Escenas que pertenecen a esta secuencia
  scene_ids: string[]
  
  // Metadatos
  starts_at_scene: number
  ends_at_scene: number
}

/**
 * Contexto de ESCENA individual
 * Hereda TODO de la secuencia y añade detalles específicos
 */
export interface SceneContext {
  id: string
  scene_number: number
  sequence_id: string              // ⭐ Referencia a la secuencia padre
  
  // Acción específica de esta escena
  action: {
    description: string            // "El detective camina hacia la izquierda"
    characters_present: string[]   // IDs de personajes en escena
    dialogue: string | null
    emotion: string                // "tensión", "calma", "tristeza"
  }
  
  // Cámara para esta escena específica
  camera: {
    shot_type: 'extreme_wide' | 'wide' | 'medium' | 'close_up' | 'extreme_close_up'
    angle: 'eye_level' | 'low' | 'high' | 'birds_eye' | 'worms_eye'
    movement: 'static' | 'pan_left' | 'pan_right' | 'tilt_up' | 'tilt_down' | 'dolly_in' | 'dolly_out' | 'tracking'
  }
  
  // Variaciones PERMITIDAS del contexto de secuencia
  // (pequeños cambios que no rompen la continuidad)
  allowed_variations: {
    // Puede haber ligera variación en la luz (ej: nube pasando)
    lighting_variation: string | null    // "ligera sombra de nube pasajera"
    
    // Elementos temporales (ej: pájaro volando)
    temporary_elements: string[]         // ["águila cruzando el cielo"]
  }
  
  // Transición a la siguiente escena
  transition: {
    type: 'cut' | 'crossfade' | 'fade_black' | 'fade_white' | 'wipe'
    duration_ms: number
    
    // ¿La siguiente escena es de la misma secuencia?
    next_scene_same_sequence: boolean
    
    // Si cambia de secuencia, info del cambio
    sequence_change?: {
      new_sequence_id: string
      transition_justification: string   // "Corte a 3 horas después, en la ciudad"
    }
  }
}

/**
 * Estado del contexto durante la generación
 * Se actualiza después de cada escena generada
 */
export interface ContextState {
  movie_id: string
  current_sequence_id: string
  current_scene_number: number
  
  // Frame de referencia actual (último frame generado)
  reference_frame_url: string
  
  // Elementos visuales detectados en el último frame
  detected_elements: string[]
  
  // Historial de contexto (para debugging)
  context_history: Array<{
    scene_number: number
    sequence_id: string
    timestamp: Date
  }>
}

