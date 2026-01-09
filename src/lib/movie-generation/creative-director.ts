// src/lib/movie-generation/creative-director.ts

import { getProviderWithKey } from '@/lib/ai/providers'

export class CreativeDirector {
  private supabase: any
  private llmApiKey: string
  private movieId: string
  
  constructor(supabase: any, llmApiKey: string, movieId: string) {
    this.supabase = supabase
    this.llmApiKey = llmApiKey
    this.movieId = movieId
  }
  
  /**
   * Crea la Biblia Visual completa para la película
   */
  async createVisualBible(
    title: string,
    userPrompt: string,
    genre: string,
    targetDuration: number
  ): Promise<VisualBible> {
    console.log('[CREATIVE DIRECTOR] Creating Visual Bible...')
    
    const systemPrompt = `Eres el DIRECTOR CREATIVO de una productora cinematográfica de élite.

Tu trabajo es crear la BIBLIA VISUAL de una película. Este documento será la LEY ABSOLUTA que todo el equipo debe seguir. NINGÚN detalle puede contradecir esta biblia.

## QUÉ ES UNA BIBLIA VISUAL

Es un documento maestro que define:
1. El ESTILO VISUAL completo de la película
2. La PALETA DE COLORES exacta (códigos hex)
3. El ESTILO DE ILUMINACIÓN para cada tipo de escena
4. Las REFERENCIAS CINEMATOGRÁFICAS (películas similares)
5. Los PERFILES COMPLETOS de cada personaje
6. Las REGLAS DE CONTINUIDAD inquebrantables
7. El DISEÑO SONORO (tipo de voces, ambiente)

## FORMATO DE SALIDA

Responde ÚNICAMENTE con un JSON válido con esta estructura exacta:

{
  "movie_identity": {
    "title": "string",
    "logline": "Una línea que resume la película",
    "genre": "string",
    "tone": "string (ej: dramático, tenso, romántico)",
    "era": "string (ej: contemporáneo, años 80, futuro cercano)",
    "visual_style": "string (ej: realismo cinematográfico, noir, saturado)"
  },
  
  "color_palette": {
    "primary": {
      "name": "string",
      "hex": "#XXXXXX",
      "usage": "Dónde se usa este color"
    },
    "secondary": {
      "name": "string",
      "hex": "#XXXXXX",
      "usage": "string"
    },
    "accent": {
      "name": "string",
      "hex": "#XXXXXX",
      "usage": "string"
    },
    "shadows": {
      "name": "string",
      "hex": "#XXXXXX",
      "usage": "string"
    },
    "highlights": {
      "name": "string",
      "hex": "#XXXXXX",
      "usage": "string"
    }
  },
  
  "lighting_rules": {
    "day_exterior": {
      "type": "string (ej: luz natural suave)",
      "direction": "string (ej: lateral desde el este)",
      "intensity": "string (ej: alta, media, baja)",
      "shadows": "string (ej: suaves y difusas)",
      "color_temperature": "string (ej: cálida 5500K)"
    },
    "day_interior": {},
    "night_exterior": {},
    "night_interior": {},
    "golden_hour": {},
    "blue_hour": {}
  },
  
  "camera_style": {
    "default_lens": "string (ej: 35mm)",
    "aspect_ratio": "string (ej: 2.39:1 cinemascope)",
    "movement_style": "string (ej: steadicam fluido, trípode estático)",
    "depth_of_field": "string (ej: profunda para paisajes, superficial para retratos)",
    "typical_shots": ["Plano general establecedor", "Plano medio para diálogos"]
  },
  
  "cinematic_references": [
    {
      "movie": "Nombre de película de referencia",
      "director": "Director",
      "what_to_take": "Qué elemento visual copiar de esta película"
    }
  ],
  
  "characters": [
    {
      "name": "string",
      "role": "string (protagonista, antagonista, secundario)",
      "age": number,
      "gender": "string",
      
      "physical_appearance": {
        "height": "string",
        "build": "string",
        "skin_tone": "string con código hex aproximado",
        "hair": {
          "color": "string",
          "style": "string",
          "length": "string"
        },
        "eyes": {
          "color": "string",
          "shape": "string"
        },
        "face": {
          "shape": "string",
          "distinctive_features": ["string"]
        }
      },
      
      "wardrobe": {
        "default_outfit": {
          "top": "Descripción detallada",
          "bottom": "Descripción detallada",
          "footwear": "Descripción detallada",
          "accessories": ["string"]
        },
        "color_scheme": "Colores que usa este personaje",
        "style": "string (casual, formal, etc)"
      },
      
      "voice_profile": {
        "tone": "string (grave, agudo, medio)",
        "pace": "string (rápido, pausado, variable)",
        "accent": "string",
        "emotional_range": "string",
        "speech_patterns": ["Muletillas o formas de hablar características"]
      },
      
      "mannerisms": ["Gestos o comportamientos característicos"],
      
      "character_prompt": "Prompt completo para generar imágenes de este personaje"
    }
  ],
  
  "locations": [
    {
      "name": "string",
      "type": "string (interior/exterior)",
      "description": "Descripción detallada del lugar",
      "key_elements": ["Elementos que SIEMPRE deben aparecer"],
      "color_dominant": "Color dominante del lugar",
      "lighting_default": "Tipo de iluminación por defecto",
      "atmosphere": "string",
      "location_prompt": "Prompt completo para generar este lugar"
    }
  ],
  
  "continuity_rules": {
    "absolute_rules": [
      "Los personajes NUNCA cambian de ropa sin escena de cambio explícita",
      "La hora del día SIEMPRE progresa de forma lógica",
      "Los elementos del fondo son CONSISTENTES en cada ubicación",
      "Las heridas o marcas físicas PERSISTEN hasta que sanen",
      "El clima es CONSISTENTE dentro de la misma secuencia"
    ],
    "visual_consistency": [
      "Misma paleta de colores en toda la película",
      "Mismo estilo de iluminación por tipo de escena",
      "Mismo nivel de saturación y contraste"
    ],
    "audio_consistency": [
      "Cada personaje mantiene su voz asignada",
      "El ambiente sonoro es coherente por ubicación",
      "La música mantiene el mismo estilo"
    ]
  },
  
  "sound_design": {
    "music_style": "string (orquestal, electrónica, minimalista)",
    "ambient_sounds": {
      "exterior_day": ["Sonidos típicos"],
      "exterior_night": ["Sonidos típicos"],
      "interior": ["Sonidos típicos"]
    },
    "emotional_cues": {
      "tension": "Tipo de sonido para tensión",
      "romance": "Tipo de sonido para romance",
      "action": "Tipo de sonido para acción"
    }
  },
  
  "forbidden_elements": [
    "Elementos que NUNCA deben aparecer en esta película"
  ],
  
  "mandatory_elements": [
    "Elementos que SIEMPRE deben estar presentes"
  ]
}

## INSTRUCCIONES

1. Analiza profundamente el prompt del usuario
2. Extrae TODOS los personajes mencionados o implícitos
3. Identifica TODAS las ubicaciones
4. Define un estilo visual COHERENTE y CINEMATOGRÁFICO
5. Crea perfiles de personaje TAN DETALLADOS que dos artistas diferentes dibujarían la misma persona
6. Las reglas de continuidad son SAGRADAS

IMPORTANTE: Este documento se usará para generar CADA frame de la película. Sé EXTREMADAMENTE específico.`

    const userContent = `Crea la Biblia Visual para esta película:

TÍTULO: ${title}
GÉNERO: ${genre}
DURACIÓN: ${targetDuration} minutos
PROMPT DEL USUARIO: ${userPrompt}

Analiza el prompt y crea una Biblia Visual COMPLETA y DETALLADA.
Recuerda: cada detalle que definas aquí se mantendrá consistente en TODA la película.

CRÍTICO: Responde SOLO con JSON válido, sin texto adicional antes o después. 
Asegúrate de que:
- Todos los strings estén entre comillas dobles
- Todas las comas estén en el lugar correcto
- Todos los arrays y objetos estén correctamente cerrados
- No haya comas finales (trailing commas) en arrays u objetos
- Todos los caracteres especiales estén escapados correctamente`

    const response = await this.callLLM(systemPrompt, userContent)
    
    // Parsear respuesta
    const visualBible = this.parseVisualBible(response)
    
    // Guardar en DB
    const { error } = await this.supabase
      .from('movies')
      .update({ 
        metadata: {
          ...(await this.getCurrentMetadata()),
          visual_bible: visualBible
        }
      })
      .eq('id', this.movieId)
    
    if (error) {
      console.warn('[CREATIVE DIRECTOR] Could not save Visual Bible to DB:', error.message)
    }
    
    console.log('[CREATIVE DIRECTOR] ✅ Visual Bible created')
    console.log(`[CREATIVE DIRECTOR] - ${visualBible.characters?.length || 0} characters defined`)
    console.log(`[CREATIVE DIRECTOR] - ${visualBible.locations?.length || 0} locations defined`)
    console.log(`[CREATIVE DIRECTOR] - ${visualBible.continuity_rules?.absolute_rules?.length || 0} continuity rules`)
    
    return visualBible
  }
  
  private async getCurrentMetadata(): Promise<any> {
    const { data } = await this.supabase
      .from('movies')
      .select('metadata')
      .eq('id', this.movieId)
      .single()
    
    return data?.metadata || {}
  }
  
  private parseVisualBible(response: string): VisualBible {
    try {
      // Limpiar respuesta - extraer solo el JSON
      let cleaned = response
        // Remover markdown code blocks
        .replace(/```json\n?/gi, '')
        .replace(/```\n?/g, '')
        // Remover texto antes del primer {
        .replace(/^[^{]*/, '')
        // Remover texto después del último }
        .replace(/[^}]*$/, '')
        // Añadir el } final si se perdió
        .trim()
      
      // Intentar extraer JSON si está dentro de texto
      const jsonMatch = cleaned.match(/\{[\s\S]*\}/)
      if (jsonMatch) {
        cleaned = jsonMatch[0]
      }
      
      // Intentar reparar JSON común problemas
      cleaned = this.fixJsonSyntax(cleaned)
      
      console.log('[CREATIVE DIRECTOR] Attempting to parse cleaned JSON (length:', cleaned.length, ')')
      
      const parsed = JSON.parse(cleaned)
      
      // Validar estructura básica
      if (!parsed.movie_identity) {
        throw new Error('Parsed JSON missing required field: movie_identity')
      }
      
      return parsed as VisualBible
    } catch (error: any) {
      console.error('[CREATIVE DIRECTOR] Error parsing Visual Bible:', error)
      console.error('[CREATIVE DIRECTOR] Response length:', response.length)
      console.error('[CREATIVE DIRECTOR] Response preview:', response.substring(0, 500))
      console.error('[CREATIVE DIRECTOR] Response near error position:', 
        response.substring(Math.max(0, 3100), Math.min(response.length, 3250)))
      
      // Intentar crear una Biblia Visual básica como fallback
      console.warn('[CREATIVE DIRECTOR] Attempting to create fallback Visual Bible...')
      return this.createFallbackVisualBible(response)
    }
  }
  
  /**
   * Repara errores comunes de sintaxis JSON
   */
  private fixJsonSyntax(json: string): string {
    let fixed = json
    
    // Remover cualquier texto antes del primer {
    const firstBrace = fixed.indexOf('{')
    if (firstBrace > 0) {
      fixed = fixed.substring(firstBrace)
    }
    
    // Encontrar el último } balanceado para cortar texto después
    let braceCount = 0
    let lastValidBrace = -1
    for (let i = 0; i < fixed.length; i++) {
      if (fixed[i] === '{') braceCount++
      if (fixed[i] === '}') {
        braceCount--
        if (braceCount === 0) {
          lastValidBrace = i
        }
      }
    }
    if (lastValidBrace > 0 && lastValidBrace < fixed.length - 1) {
      fixed = fixed.substring(0, lastValidBrace + 1)
    }
    
    // Reparar comas faltantes antes de } (solo si no hay coma ya)
    fixed = fixed.replace(/([^,\s\]\}])\s*\n\s*\}/g, '$1\n}')
    fixed = fixed.replace(/([^,\s\]\}])\s*\}/g, '$1 }')
    
    // Reparar comas faltantes antes de ] (solo si no hay coma ya)
    fixed = fixed.replace(/([^,\s\]\}])\s*\n\s*\]/g, '$1\n]')
    fixed = fixed.replace(/([^,\s\]\}])\s*\]/g, '$1 ]')
    
    // Reparar comas múltiples
    fixed = fixed.replace(/,\s*,+/g, ',')
    
    // Reparar comas después del último elemento en arrays y objetos (trailing commas)
    fixed = fixed.replace(/,(\s*[}\]])/g, '$1')
    
    // Reparar arrays mal formados: [item1, item2, ] -> [item1, item2]
    fixed = fixed.replace(/,\s*(\s*\])/g, '$1')
    
    // Reparar arrays sin comas: ["a" "b"] -> ["a", "b"]
    fixed = fixed.replace(/"\s+"\s*(?=[^"]*\])/g, '", "')
    
    // Reparar strings no cerrados (añadir comilla final si falta)
    // Esto es más complejo, solo lo hacemos para casos simples
    const openQuotes = (fixed.match(/"/g) || []).length
    if (openQuotes % 2 !== 0) {
      // Número impar de comillas, intentar cerrar la última
      const lastQuoteIndex = fixed.lastIndexOf('"')
      if (lastQuoteIndex > 0) {
        const afterLastQuote = fixed.substring(lastQuoteIndex + 1)
        if (!afterLastQuote.match(/[,}\]]/)) {
          // No hay coma o cierre después, añadir comilla
          fixed = fixed + '"'
        }
      }
    }
    
    return fixed
  }
  
  /**
   * Crea una Biblia Visual básica cuando el parsing falla
   */
  private createFallbackVisualBible(response: string): VisualBible {
    // Intentar extraer información básica del texto aunque el JSON esté malformado
    const titleMatch = response.match(/"title"\s*:\s*"([^"]+)"/i)
    const genreMatch = response.match(/"genre"\s*:\s*"([^"]+)"/i)
    const toneMatch = response.match(/"tone"\s*:\s*"([^"]+)"/i)
    
    console.log('[CREATIVE DIRECTOR] Creating fallback Visual Bible with extracted data')
    
    // Crear estructura básica válida
    return {
      movie_identity: {
        title: titleMatch?.[1] || 'Untitled',
        logline: 'A cinematic story',
        genre: genreMatch?.[1] || 'drama',
        tone: toneMatch?.[1] || 'neutral',
        era: 'contemporary',
        visual_style: 'cinematic'
      },
      color_palette: {
        primary: { name: 'Primary', hex: '#2C3E50', usage: 'Main scenes' },
        secondary: { name: 'Secondary', hex: '#3498DB', usage: 'Accent scenes' },
        accent: { name: 'Accent', hex: '#E74C3C', usage: 'Highlights' },
        shadows: { name: 'Shadows', hex: '#1A1A1A', usage: 'Dark areas' },
        highlights: { name: 'Highlights', hex: '#ECF0F1', usage: 'Bright areas' }
      },
      lighting_rules: {
        day: {
          intensity: 'bright',
          color_temp: 'daylight',
          direction: 'natural',
          shadows: 'soft'
        },
        night: {
          intensity: 'low',
          color_temp: 'warm',
          direction: 'artificial',
          shadows: 'hard'
        }
      },
      camera_style: {
        movement: 'smooth',
        framing: 'medium',
        angles: ['eye-level'],
        transitions: ['cut']
      },
      cinematic_references: [],
      characters: [],
      locations: [],
      continuity_rules: {
        absolute_rules: ['Maintain consistent visual style', 'Preserve character appearances'],
        visual_consistency: ['Color grading must be consistent', 'Lighting should match time of day'],
        audio_consistency: ['Background sounds should match location']
      },
      sound_design: {
        music_style: 'ambient',
        sfx_intensity: 'realistic',
        dialogue_clarity: 'clear'
      },
      forbidden_elements: [],
      mandatory_elements: []
    }
  }
  
  private async callLLM(systemPrompt: string, userPrompt: string): Promise<string> {
    // Añadir instrucción explícita de formato JSON válido al prompt
    const enhancedUserPrompt = `${userPrompt}

IMPORTANTE: Responde SOLO con JSON válido, sin texto adicional antes o después. 
Asegúrate de que:
- Todos los strings estén entre comillas dobles
- Todas las comas estén en el lugar correcto
- Todos los arrays y objetos estén correctamente cerrados
- No haya comas finales en arrays u objetos
- Todos los caracteres especiales estén escapados`

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.llmApiKey}`
      },
      body: JSON.stringify({
        model: 'gpt-4-turbo-preview',
        messages: [
          { role: 'system', content: systemPrompt + '\n\nCRÍTICO: Debes responder SOLO con JSON válido. No incluyas explicaciones ni texto adicional.' },
          { role: 'user', content: enhancedUserPrompt }
        ],
        // Nota: response_format puede no estar soportado en gpt-4-turbo-preview
        // Si falla, el LLM aún debería generar JSON válido con las instrucciones del prompt
        max_tokens: 4000, // Límite del modelo: 4096, usamos 4000 para margen
        temperature: 0.3 // Reducir temperatura para respuestas más consistentes
      })
    })
    
    if (!response.ok) {
      const errorText = await response.text()
      console.error('[CREATIVE DIRECTOR] LLM API error:', errorText)
      throw new Error(`LLM error: ${errorText}`)
    }
    
    const data = await response.json()
    const content = data.choices[0]?.message?.content
    
    if (!content) {
      throw new Error('No content in LLM response')
    }
    
    console.log('[CREATIVE DIRECTOR] LLM response received, length:', content.length)
    
    return content
  }
}

// Tipos
export interface VisualBible {
  movie_identity: {
    title: string
    logline: string
    genre: string
    tone: string
    era: string
    visual_style: string
  }
  color_palette: {
    primary: ColorDefinition
    secondary: ColorDefinition
    accent: ColorDefinition
    shadows: ColorDefinition
    highlights: ColorDefinition
  }
  lighting_rules: Record<string, LightingRule>
  camera_style: CameraStyle
  cinematic_references: CinematicReference[]
  characters: CharacterProfile[]
  locations: LocationProfile[]
  continuity_rules: {
    absolute_rules: string[]
    visual_consistency: string[]
    audio_consistency: string[]
  }
  sound_design: SoundDesign
  forbidden_elements: string[]
  mandatory_elements: string[]
}

export interface ColorDefinition {
  name: string
  hex: string
  usage: string
}

export interface LightingRule {
  type: string
  direction: string
  intensity: string
  shadows: string
  color_temperature: string
}

export interface CameraStyle {
  default_lens: string
  aspect_ratio: string
  movement_style: string
  depth_of_field: string
  typical_shots: string[]
}

export interface CinematicReference {
  movie: string
  director: string
  what_to_take: string
}

export interface CharacterProfile {
  name: string
  role: string
  age: number
  gender: string
  physical_appearance: any
  wardrobe: any
  voice_profile: any
  mannerisms: string[]
  character_prompt: string
}

export interface LocationProfile {
  name: string
  type: string
  description: string
  key_elements: string[]
  color_dominant: string
  lighting_default: string
  atmosphere: string
  location_prompt: string
}

export interface SoundDesign {
  music_style: string
  ambient_sounds: Record<string, string[]>
  emotional_cues: Record<string, string>
}
