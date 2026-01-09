// ============================================
// SCENE PACKET - ESTRUCTURA DE COMUNICACIÓN
// ============================================

import { VisualBible } from './visual-research'

/**
 * Scene Packet: Estructura OBLIGATORIA que el guionista debe rellenar
 * para CADA escena. El editor de video lee esto para generar el video.
 * 
 * El guionista NO puede omitir ningún campo.
 * El guionista NO puede escribir texto ambiguo.
 * El guionista DEBE ser explícito en todo.
 */
export interface ScenePacket {
  // ========================================
  // IDENTIFICACIÓN
  // ========================================
  scene_id: string
  scene_number: number
  sequence_id: string              // A qué secuencia pertenece
  
  // ========================================
  // 🚨 CAMBIO DE UBICACIÓN (CRÍTICO)
  // ========================================
  location_change: {
    has_changed: boolean           // ¿Ha cambiado la ubicación respecto a la escena anterior?
    
    // Si ha cambiado, DEBE explicar:
    change_details?: {
      from: string                 // "Playa de Levante, Benidorm, exterior, día"
      to: string                   // "Habitación Hotel Bali, Benidorm, interior, noche"
      transition_type: 'cut' | 'fade' | 'dissolve' | 'time_jump' | 'location_jump'
      time_passed?: string         // "3 horas después", "Al día siguiente"
      narrative_reason: string     // "El detective vuelve al hotel tras la persecución"
    }
  }
  
  // ========================================
  // 📍 UBICACIÓN ACTUAL (SIEMPRE OBLIGATORIO)
  // ========================================
  location: {
    // Identificación completa
    name: string                   // "Habitación 1502, Hotel Bali"
    parent_location: string        // "Hotel Bali, Benidorm, España"
    
    // Tipo
    type: 'interior' | 'exterior' | 'vehicle' | 'mixed'
    subtype: string                // "habitación de hotel", "playa", "coche", "oficina"
    
    // Descripción para el editor
    visual_description: string     // "Habitación moderna de hotel de 4 estrellas, decoración 
                                   //  minimalista en tonos blancos y beige, cama king size,
                                   //  ventanal grande con cortinas semitransparentes"
    
    // Elementos que DEBEN verse
    mandatory_elements: string[]   // ["cama doble", "ventana con vistas", "mesita de noche", 
                                   //  "lámpara", "puerta de entrada"]
    
    // Elementos que NO deben verse
    forbidden_elements: string[]   // ["baño", "cocina", "balcón"]
    
    // Referencia a biblia visual
    visual_bible_id?: string       // Si existe biblia visual para esta ubicación
    
    // Para ubicaciones nuevas sin biblia, referencia visual
    reference_images?: string[]    // URLs de imágenes de referencia
  }
  
  // ========================================
  // 🕐 TIEMPO (SIEMPRE OBLIGATORIO)
  // ========================================
  time: {
    // Momento del día
    time_of_day: 'dawn' | 'early_morning' | 'morning' | 'midday' | 'afternoon' | 
                 'late_afternoon' | 'sunset' | 'dusk' | 'evening' | 'night' | 'late_night'
    
    // Hora específica (para coherencia)
    specific_time?: string         // "22:15"
    
    // Descripción de la luz
    lighting_description: string   // "Luz artificial de lámpara de mesita, cálida y tenue,
                                   //  con algo de luz de la ciudad entrando por la ventana"
    
    // ¿Ha pasado tiempo desde la escena anterior?
    time_continuity: 'continuous' | 'minutes_later' | 'hours_later' | 'next_day' | 'days_later'
    time_elapsed?: string          // "15 minutos después"
  }
  
  // ========================================
  // 💡 ILUMINACIÓN (SIEMPRE OBLIGATORIO)
  // ========================================
  lighting: {
    // Fuentes de luz
    primary_source: string         // "Lámpara de mesita"
    secondary_sources: string[]    // ["Luz de ciudad por ventana", "LED de TV apagada"]
    
    // Características
    intensity: 'very_low' | 'low' | 'medium' | 'high' | 'very_high'
    color_temperature: 'warm' | 'neutral' | 'cool'
    color_temperature_kelvin?: string  // "2700K"
    
    // Calidad
    quality: 'hard' | 'soft' | 'mixed'
    direction: string              // "Desde la izquierda, lateral"
    
    // Sombras
    shadows: string                // "Sombras suaves y difusas"
    
    // Ambiente
    mood: string                   // "Íntimo, ligeramente tenso"
  }
  
  // ========================================
  // 🌤️ CLIMA/ATMÓSFERA (Si es exterior)
  // ========================================
  weather?: {
    condition: 'clear' | 'partly_cloudy' | 'cloudy' | 'overcast' | 'rainy' | 
               'stormy' | 'foggy' | 'snowy' | 'windy'
    intensity?: string             // "Lluvia ligera"
    atmospheric_effects: string[]  // ["Brisa marina", "Humedad en el aire"]
    visibility: string             // "Buena, cielo nocturno despejado"
  }
  
  // ========================================
  // 👥 PERSONAJES (SIEMPRE OBLIGATORIO)
  // ========================================
  characters: {
    // Lista de personajes en escena
    present: Array<{
      character_id: string
      name: string                 // "Detective Marcos"
      
      // Posición en la escena
      position: string             // "De pie junto a la puerta"
      
      // Acción inicial
      initial_state: string        // "Acaba de entrar, mira hacia la cama"
      
      // Vestuario (si es diferente al default)
      outfit?: string              // "Mismo traje gris, corbata aflojada, camisa desabrochada"
      
      // Estado emocional
      emotional_state: string      // "Cansado pero alerta, preocupado"
      
      // ¿Habla en esta escena?
      has_dialogue: boolean
    }>
    
    // Personaje principal de la escena (para foco de cámara)
    focus_character?: string       // ID del personaje principal
  }
  
  // ========================================
  // 🎬 ACCIÓN (SIEMPRE OBLIGATORIO)
  // ========================================
  action: {
    // Descripción completa de lo que ocurre
    description: string            // "Marcos entra en la habitación. Se detiene en la puerta
                                   //  al ver a Laura sentada en la cama. Ella levanta la 
                                   //  vista, sus ojos muestran que ha estado llorando."
    
    // Desglose en beats (micro-acciones)
    beats: Array<{
      beat_number: number
      duration_seconds: number     // Duración aproximada de este beat
      action: string               // "Marcos abre la puerta y entra"
      character_id?: string        // Quién realiza la acción
      camera_suggestion?: string   // "Plano desde dentro de la habitación"
    }>
    
    // Movimiento general
    movement_intensity: 'static' | 'minimal' | 'moderate' | 'dynamic' | 'intense'
    
    // Ritmo
    pacing: 'very_slow' | 'slow' | 'medium' | 'fast' | 'very_fast'
  }
  
  // ========================================
  // 🎙️ DIÁLOGO (Si hay)
  // ========================================
  dialogue?: {
    lines: Array<{
      character_id: string
      character_name: string
      line: string                 // El texto del diálogo
      
      // Dirección de actuación
      delivery: string             // "Voz baja, cansada, con un suspiro"
      emotion: string              // "Preocupación, alivio de verla bien"
      
      // Timing
      starts_at_beat?: number      // En qué beat empieza este diálogo
    }>
    
    // ¿Hay pausas significativas?
    significant_pauses?: Array<{
      after_line_index: number
      duration: 'short' | 'medium' | 'long'
      description: string          // "Pausa tensa mientras se miran"
    }>
  }
  
  // ========================================
  // 📹 CÁMARA (Sugerencias para el editor)
  // ========================================
  camera: {
    // Plano principal sugerido
    primary_shot: {
      type: 'extreme_wide' | 'wide' | 'medium_wide' | 'medium' | 'medium_close' | 
            'close_up' | 'extreme_close_up' | 'over_shoulder' | 'pov'
      angle: 'eye_level' | 'low' | 'high' | 'dutch' | 'birds_eye' | 'worms_eye'
      description: string          // "Plano medio de Marcos entrando, Laura en foco al fondo"
    }
    
    // Movimiento de cámara
    movement: {
      type: 'static' | 'pan' | 'tilt' | 'dolly' | 'tracking' | 'crane' | 'handheld' | 'steadicam'
      direction?: string           // "Ligero dolly in hacia Laura"
      speed?: 'very_slow' | 'slow' | 'medium' | 'fast'
      description?: string
    }
    
    // Profundidad de campo
    depth_of_field: 'deep' | 'medium' | 'shallow' | 'very_shallow'
    focus_point: string            // "Laura en la cama"
    
    // Composición
    composition_notes?: string     // "Marcos en el tercio izquierdo, Laura en el derecho"
  }
  
  // ========================================
  // 🔊 AUDIO (Ambiente)
  // ========================================
  audio: {
    // Sonido ambiente
    ambient_sounds: string[]       // ["Silencio de habitación", "Leve ruido de ciudad lejano"]
    
    // Música sugerida
    music?: {
      style: string                // "Piano suave, melancólico"
      intensity: 'subtle' | 'present' | 'prominent'
      starts_at?: string           // "Desde el inicio"
      emotion: string              // "Tristeza, tensión contenida"
    }
    
    // Efectos de sonido específicos
    sfx?: Array<{
      sound: string                // "Puerta abriéndose"
      at_beat: number
    }>
  }
  
  // ========================================
  // 🔗 TRANSICIÓN (A la siguiente escena)
  // ========================================
  transition_to_next: {
    type: 'cut' | 'fade_out' | 'fade_to_black' | 'fade_to_white' | 'dissolve' | 'wipe'
    duration_ms: number            // Duración de la transición
    
    // ¿La siguiente escena es en el mismo lugar?
    next_scene_same_location: boolean
    
    // Si cambia, anticipar el cambio
    if_location_changes?: {
      next_location_preview: string  // "Siguiente: Comisaría de policía, mañana siguiente"
      transition_style: string       // "Fundido a negro, indica paso de tiempo"
    }
  }
  
  // ========================================
  // 📝 NOTAS PARA EL EDITOR
  // ========================================
  editor_notes?: {
    // Notas importantes
    important: string[]            // ["Mantener la tensión visual", "Laura ha estado llorando"]
    
    // Referencias visuales
    visual_references?: string[]   // ["Escena similar en 'Heat' de Michael Mann"]
    
    // Lo que NO hacer
    avoid: string[]                // ["No mostrar el baño", "No iluminar demasiado"]
  }
  
  // ========================================
  // ✅ VALIDACIÓN (El sistema verifica)
  // ========================================
  validation: {
    is_complete: boolean           // ¿Todos los campos obligatorios están llenos?
    consistency_check: boolean     // ¿Es coherente con la escena anterior?
    location_verified: boolean     // ¿La ubicación coincide con la secuencia?
    characters_verified: boolean   // ¿Los personajes están definidos?
  }
}


/**
 * Sequence Header: Se envía al inicio de cada secuencia nueva
 * para que el editor sepa que ha cambiado el contexto
 */
export interface SequenceHeader {
  sequence_id: string
  sequence_number: number
  
  // ========================================
  // 🚨 DECLARACIÓN DE NUEVA UBICACIÓN
  // ========================================
  location_declaration: {
    // Nombre completo
    full_name: string              // "Hotel Bali, Habitación 1502, Benidorm, España"
    
    // Tipo
    type: 'interior' | 'exterior' | 'mixed'
    
    // Descripción exhaustiva
    description: string            // Párrafo completo describiendo el lugar
    
    // Referencia a biblia visual
    visual_bible_id?: string
    
    // Si no hay biblia, descripción visual completa
    visual_guide: {
      architecture: string
      colors: string[]
      textures: string[]
      lighting_default: string
      atmosphere: string
      
      // Elementos que SIEMPRE deben verse
      mandatory_elements: string[]
      
      // Elementos que NUNCA deben verse
      forbidden_elements: string[]
    }
    
    // Imágenes de referencia
    reference_images: string[]
  }
  
  // ========================================
  // 🕐 CONTEXTO TEMPORAL
  // ========================================
  time_context: {
    time_of_day: string
    can_progress: boolean          // ¿El tiempo puede avanzar en esta secuencia?
    max_progression: string        // "Máximo 2 horas"
  }
  
  // ========================================
  // 📋 ESCENAS EN ESTA SECUENCIA
  // ========================================
  scenes_in_sequence: number[]     // [15, 16, 17, 18] - números de escena
  
  // ========================================
  // 📝 INSTRUCCIONES PARA EL EDITOR
  // ========================================
  editor_instructions: string      // "Mantener consistencia visual en todas las escenas.
                                   //  La iluminación no cambia. Los elementos de fondo
                                   //  deben ser idénticos en cada plano."
}

/**
 * Contexto de la película para el guionista
 */
export interface MovieContext {
  title: string
  genre: string
  tone: {
    mood: string
    style: string
  }
  visual_style: {
    aesthetic: string
    color_palette: string[]
    references: string[]
  }
  characters: Array<{
    id: string
    name: string
    description: string
  }>
}

