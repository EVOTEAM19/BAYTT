// ============================================
// SISTEMA DE INVESTIGACIÓN VISUAL
// ============================================

/**
 * Solicitud de investigación de una ubicación
 */
export interface LocationResearchRequest {
  location_name: string           // "Benidorm, España"
  location_type: 'city' | 'nature' | 'interior' | 'fictional' | 'historical'
  specific_places?: string[]      // ["Playa de Levante", "Hotel Bali"]
  time_period?: string            // "actual", "años 80", "medieval"
  mood?: string                   // "verano turístico", "invierno desolado"
}

/**
 * Imagen de referencia descargada
 */
export interface ReferenceImage {
  id: string
  url: string
  local_path: string              // Guardada localmente
  source: 'google' | 'unsplash' | 'pexels' | 'wikipedia' | 'streetview' | 'uploaded'
  
  // Metadatos
  description: string
  tags: string[]
  
  // Análisis visual (generado por Vision AI)
  analysis?: ImageAnalysis
}

/**
 * Análisis de una imagen por Vision AI
 */
export interface ImageAnalysis {
  // Elementos identificados
  elements: {
    architecture: string[]        // ["rascacielos", "edificios blancos", "hotel bali"]
    nature: string[]              // ["playa", "mar mediterráneo", "palmeras"]
    infrastructure: string[]      // ["paseo marítimo", "carretera costera"]
    people_activities: string[]   // ["turistas", "bañistas", "terrazas"]
    vehicles: string[]            // ["coches", "motos", "barcos"]
    signage: string[]             // ["carteles en español", "neones"]
  }
  
  // Características visuales
  visual_characteristics: {
    dominant_colors: string[]     // ["azul mediterráneo", "blanco", "turquesa"]
    color_palette: string[]       // Códigos hex
    lighting: string              // "luz mediterránea intensa"
    atmosphere: string            // "ambiente turístico veraniego"
    time_of_day: string           // "mediodía soleado"
    weather: string               // "despejado, cielo azul"
  }
  
  // Perspectiva
  perspective: {
    view_type: string             // "panorámica", "nivel calle", "aérea"
    focal_point: string           // "skyline de rascacielos"
  }
  
  // Prompt sugerido para recrear esta imagen
  suggested_prompt: string
}

/**
 * Biblia Visual de una ubicación
 * Documento completo que el guionista usa como referencia
 */
export interface VisualBible {
  id: string
  location_name: string
  created_at: Date
  
  // ========================================
  // RESUMEN EJECUTIVO
  // ========================================
  summary: {
    one_line: string              // "Ciudad costera española con skyline de rascacielos"
    description: string           // Descripción de 2-3 párrafos
    unique_characteristics: string[]  // Lo que hace único este lugar
  }
  
  // ========================================
  // ELEMENTOS VISUALES OBLIGATORIOS
  // ========================================
  mandatory_elements: {
    // Elementos que SIEMPRE deben aparecer para que sea reconocible
    always_present: string[]      // ["rascacielos en el fondo", "mar azul"]
    
    // Elementos icónicos del lugar
    iconic_landmarks: Array<{
      name: string                // "Hotel Bali"
      description: string         // "Rascacielos más alto de Benidorm"
      when_to_include: string     // "En planos amplios de la ciudad"
      reference_images: string[]  // URLs de imágenes de referencia
    }>
    
    // Elementos de ambiente
    atmosphere_elements: string[] // ["ambiente turístico", "terrazas", "sombrillas"]
  }
  
  // ========================================
  // ELEMENTOS PROHIBIDOS
  // ========================================
  forbidden_elements: {
    // Elementos que NUNCA deben aparecer
    never_include: string[]       // ["montañas nevadas", "rascacielos de cristal modernos tipo Dubai"]
    
    // Anacronismos
    anachronisms: string[]        // ["coches antiguos si es época actual"]
    
    // Confusiones comunes
    common_mistakes: string[]     // ["confundir con Miami", "poner palmeras tipo Caribe"]
  }
  
  // ========================================
  // PALETA DE COLORES
  // ========================================
  color_palette: {
    primary: Array<{
      name: string                // "Azul Mediterráneo"
      hex: string                 // "#0077B6"
      usage: string               // "Mar y cielo"
    }>
    secondary: Array<{
      name: string
      hex: string
      usage: string
    }>
    accent: Array<{
      name: string
      hex: string
      usage: string
    }>
  }
  
  // ========================================
  // ILUMINACIÓN TÍPICA
  // ========================================
  typical_lighting: {
    daytime: {
      description: string         // "Luz mediterránea intensa, alto contraste"
      color_temperature: string   // "5600K-6500K"
      shadows: string             // "Sombras duras y definidas"
    }
    sunset: {
      description: string
      color_temperature: string
      shadows: string
    }
    night: {
      description: string
      artificial_lights: string[] // ["neones de hoteles", "farolas del paseo"]
    }
  }
  
  // ========================================
  // ARQUITECTURA
  // ========================================
  architecture: {
    style: string                 // "Moderna turística años 70-2000"
    building_types: string[]      // ["rascacielos de apartamentos", "hoteles", "casco antiguo"]
    materials: string[]           // ["hormigón blanco", "cristal azulado"]
    heights: string               // "Varía de 3 pisos (casco antiguo) a 52 pisos (Hotel Bali)"
  }
  
  // ========================================
  // VEGETACIÓN
  // ========================================
  vegetation: {
    types: string[]               // ["palmeras mediterráneas", "buganvillas", "plantas suculentas"]
    density: string               // "Moderada en paseos, escasa en playa"
    seasonal_changes: string      // "Poca variación, siempre verde"
  }
  
  // ========================================
  // PROMPTS BASE PARA DIFERENTES MOMENTOS
  // ========================================
  base_prompts: {
    day_beach: string             // Prompt para escena de día en la playa
    day_city: string              // Prompt para escena de día en la ciudad
    night_promenade: string       // Prompt para escena nocturna en el paseo
    sunset_panoramic: string      // Prompt para atardecer panorámico
  }
  
  // ========================================
  // IMÁGENES DE REFERENCIA
  // ========================================
  reference_images: ReferenceImage[]
  
  // ========================================
  // NEGATIVE PROMPT BASE
  // ========================================
  negative_prompt: string
}

/**
 * Investigación completa para una película
 */
export interface MovieVisualResearch {
  movie_id: string
  
  // Ubicaciones investigadas
  locations: VisualBible[]
  
  // Personajes y sus referencias
  characters: Array<{
    character_id: string
    reference_images: ReferenceImage[]
  }>
  
  // Época/era de la película
  era: {
    period: string
    visual_references: ReferenceImage[]
    style_guide: string
  }
  
  // Referencias de estilo (otras películas, fotografías, arte)
  style_references: Array<{
    name: string
    type: 'movie' | 'photography' | 'art' | 'other'
    images: ReferenceImage[]
    what_to_take: string          // "La iluminación neo-noir"
  }>
}

