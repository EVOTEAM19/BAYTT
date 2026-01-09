// src/lib/movie-generation/cinematic-screenwriter.ts

import { VisualBible } from './creative-director'

export class CinematicScreenwriter {
  private supabase: any
  private llmApiKey: string
  private movieId: string
  private visualBible: VisualBible
  
  constructor(supabase: any, llmApiKey: string, movieId: string, visualBible: VisualBible) {
    this.supabase = supabase
    this.llmApiKey = llmApiKey
    this.movieId = movieId
    this.visualBible = visualBible
  }
  
  async writeScreenplay(
    userPrompt: string,
    targetDuration: number
  ): Promise<DetailedScreenplay> {
    console.log('[SCREENWRITER] Writing detailed screenplay...')
    
    const systemPrompt = `Eres un GUIONISTA CINEMATOGRÁFICO de Hollywood con 30 años de experiencia.

## TU MISIÓN

Escribir un guión con NIVEL DE DETALLE DE PRODUCCIÓN. Esto significa que cada escena debe contener TODA la información necesaria para que:
- El director de fotografía sepa EXACTAMENTE qué iluminar y cómo
- El operador de cámara sepa EXACTAMENTE qué plano capturar
- El director de sonido sepa EXACTAMENTE qué sonidos incluir
- Los actores sepan EXACTAMENTE qué hacer y cómo decir cada línea
- El editor sepa EXACTAMENTE cómo conectar cada escena

## BIBLIA VISUAL (LEY ABSOLUTA)

Esta es la Biblia Visual de la película. NUNCA puedes contradecirla:

${JSON.stringify(this.visualBible, null, 2)}

## ESTRUCTURA DE CADA ESCENA

Cada escena DEBE incluir TODOS estos campos:

{
  "scene_number": 1,
  "scene_id": "SC001",
  
  "header": {
    "type": "INT/EXT",
    "location": "Nombre exacto del lugar (de la Biblia Visual)",
    "time": "DÍA/NOCHE/ATARDECER/AMANECER",
    "time_specific": "7:30 AM - Sol bajo en el horizonte este"
  },
  
  "duration": {
    "screen_time_seconds": 10,
    "story_time": "2 minutos de tiempo diegético"
  },
  
  "visual_direction": {
    "establishing_shot": {
      "description": "Descripción del plano de establecimiento",
      "camera_position": "Posición exacta de la cámara",
      "lens": "Lente a usar (ej: 35mm)",
      "movement": "Movimiento de cámara si hay"
    },
    
    "lighting": {
      "source": "De dónde viene la luz principal",
      "quality": "Dura/Suave/Difusa",
      "direction": "Ángulo de la luz",
      "fill": "Luz de relleno si hay",
      "practical_lights": ["Luces visibles en escena"],
      "color_temperature": "En Kelvin",
      "shadows": "Descripción de las sombras"
    },
    
    "color_grading": {
      "dominant_color": "Color principal de la escena",
      "saturation": "Alta/Media/Baja",
      "contrast": "Alto/Medio/Bajo",
      "mood": "Cálido/Frío/Neutro"
    },
    
    "depth_of_field": "Profunda/Media/Superficial",
    
    "shot_list": [
      {
        "shot_number": 1,
        "type": "PLANO GENERAL / PLANO MEDIO / PRIMER PLANO / etc",
        "subject": "Qué o quién está en el plano",
        "framing": "Composición exacta (regla de tercios, central, etc)",
        "camera_angle": "Nivel / Picado / Contrapicado",
        "camera_movement": "Estático / Travelling / Paneo / Steadicam",
        "duration_seconds": 3,
        "description": "Descripción detallada de lo que se ve"
      }
    ]
  },
  
  "characters_in_scene": [
    {
      "character_name": "Nombre (de la Biblia Visual)",
      "entrance": "Cómo entra a escena (si aplica)",
      "position": {
        "start": "Posición al inicio de la escena",
        "end": "Posición al final de la escena"
      },
      "wardrobe": "Exactamente qué lleva puesto (de la Biblia Visual)",
      "physical_state": "Estado físico (sudado, herido, limpio, etc)",
      "emotional_state": "Estado emocional",
      "blocking": [
        {
          "timestamp": "0-3s",
          "action": "Qué hace el personaje",
          "position": "Dónde está",
          "facing": "Hacia dónde mira"
        }
      ]
    }
  ],
  
  "action_description": {
    "summary": "Resumen de lo que ocurre en la escena",
    "beat_by_beat": [
      {
        "timestamp": "0-2s",
        "action": "Descripción detallada de la acción",
        "visual_focus": "En qué debe enfocarse la cámara"
      }
    ]
  },
  
  "dialogue": [
    {
      "character": "Nombre del personaje",
      "line": "El diálogo exacto",
      "parenthetical": "(indicación de cómo decirlo)",
      "emotion": "Emoción principal",
      "subtext": "Qué quiere decir realmente",
      "timing": {
        "start_second": 3,
        "duration_seconds": 2
      },
      "delivery": {
        "pace": "Rápido/Normal/Lento",
        "volume": "Susurro/Normal/Alto/Grito",
        "tone": "Descriptivo del tono",
        "pauses": ["Después de qué palabras hay pausas"]
      }
    }
  ],
  
  "sound_design": {
    "ambient": ["Sonidos de ambiente constantes"],
    "sound_effects": [
      {
        "sound": "Descripción del sonido",
        "timestamp": "Cuándo ocurre",
        "source": "De dónde viene",
        "volume": "Relativo al diálogo"
      }
    ],
    "music": {
      "type": "Diegética/No diegética",
      "description": "Descripción de la música",
      "emotion": "Qué emoción transmite",
      "start": "Cuándo empieza",
      "end": "Cuándo termina o si continúa"
    }
  },
  
  "continuity": {
    "previous_scene_connection": {
      "visual": "Cómo conecta visualmente con la escena anterior",
      "temporal": "Cuánto tiempo ha pasado desde la escena anterior",
      "spatial": "Relación espacial con la escena anterior"
    },
    "next_scene_setup": {
      "visual": "Cómo prepara visualmente la siguiente escena",
      "narrative": "Qué información prepara para después"
    },
    "persistent_elements": ["Elementos que deben mantenerse de escenas anteriores"],
    "changes_from_previous": ["Cambios justificados respecto a la escena anterior"]
  },
  
  "transition": {
    "type": "CORTE / FUNDIDO / ENCADENADO / BARRIDO",
    "duration_frames": 12,
    "description": "Cómo exactamente se pasa a la siguiente escena"
  },
  
  "technical_notes": [
    "Notas técnicas adicionales para producción"
  ],
  
  "ai_generation_prompts": {
    "video_prompt": "Prompt optimizado para el generador de video",
    "audio_prompt": "Prompt para generación de audio/voces",
    "negative_prompt": "Qué evitar en la generación"
  }
}

## REGLAS INQUEBRANTABLES

1. CADA escena debe referenciar la Biblia Visual para personajes y ubicaciones
2. La ropa de los personajes NUNCA cambia sin justificación
3. La continuidad temporal es SAGRADA (el sol no puede saltar de posición)
4. Los diálogos incluyen TIMING EXACTO para sincronización
5. Cada escena termina preparando la siguiente
6. NO HAY AMBIGÜEDAD - cada detalle está especificado

## FORMATO DE RESPUESTA

Responde ÚNICAMENTE con un JSON válido:

{
  "screenplay_metadata": {
    "title": "string",
    "version": "1.0",
    "total_scenes": number,
    "estimated_duration_seconds": number,
    "created_at": "ISO date"
  },
  "scenes": [
    // Array de escenas con el formato detallado arriba
  ]
}`

    const userContent = `Escribe el guión completo para esta película:

PROMPT ORIGINAL: ${userPrompt}
DURACIÓN OBJETIVO: ${targetDuration} minutos (${targetDuration * 60} segundos)
NÚMERO DE ESCENAS: Aproximadamente ${Math.ceil(targetDuration * 6)} escenas de 10 segundos

RECUERDA:
- Usa SOLO los personajes y ubicaciones de la Biblia Visual
- Sé EXTREMADAMENTE detallado en cada campo
- La continuidad entre escenas es CRÍTICA
- Incluye prompts de generación optimizados para IA

El guión debe contar una historia coherente y cinematográfica basada en el prompt del usuario.`

    const response = await this.callLLM(systemPrompt, userContent)
    const screenplay = this.parseScreenplay(response)
    
    // Validar continuidad
    this.validateContinuity(screenplay)
    
    // Guardar en DB
    await this.supabase
      .from('movies')
      .update({ 
        metadata: {
          ...(await this.getCurrentMetadata()),
          screenplay_detailed: screenplay
        }
      })
      .eq('id', this.movieId)
    
    console.log(`[SCREENWRITER] ✅ Screenplay written: ${screenplay.scenes.length} scenes`)
    
    return screenplay
  }
  
  private async getCurrentMetadata(): Promise<any> {
    const { data } = await this.supabase
      .from('movies')
      .select('metadata')
      .eq('id', this.movieId)
      .single()
    
    return data?.metadata || {}
  }
  
  private validateContinuity(screenplay: DetailedScreenplay): void {
    console.log('[SCREENWRITER] Validating continuity...')
    
    const errors: string[] = []
    
    for (let i = 1; i < screenplay.scenes.length; i++) {
      const prevScene = screenplay.scenes[i - 1]
      const currScene = screenplay.scenes[i]
      
      // Verificar que los personajes mantienen su ropa
      for (const char of currScene.characters_in_scene) {
        const prevChar = prevScene.characters_in_scene?.find(c => c.character_name === char.character_name)
        if (prevChar && char.wardrobe !== prevChar.wardrobe) {
          // Solo es error si no hay cambio justificado
          if (!currScene.continuity?.changes_from_previous?.some(change => 
            change.toLowerCase().includes(char.character_name.toLowerCase()) && 
            change.toLowerCase().includes('ropa')
          )) {
            errors.push(`Scene ${i + 1}: ${char.character_name} changed clothes without justification`)
          }
        }
      }
      
      // Verificar conexión visual
      if (!currScene.continuity?.previous_scene_connection) {
        errors.push(`Scene ${i + 1}: Missing connection to previous scene`)
      }
    }
    
    if (errors.length > 0) {
      console.warn('[SCREENWRITER] Continuity warnings:', errors)
    } else {
      console.log('[SCREENWRITER] ✅ Continuity validated - no issues found')
    }
  }
  
  private parseScreenplay(response: string): DetailedScreenplay {
    try {
      let cleaned = response
        .replace(/```json\n?/g, '')
        .replace(/```\n?/g, '')
        .trim()
      
      return JSON.parse(cleaned)
    } catch (error) {
      console.error('[SCREENWRITER] Error parsing screenplay:', error)
      throw new Error('Failed to parse screenplay')
    }
  }
  
  private async callLLM(systemPrompt: string, userPrompt: string): Promise<string> {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.llmApiKey}`
      },
      body: JSON.stringify({
        model: 'gpt-4-turbo-preview',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        max_tokens: 4000,  // Límite del modelo: 4096, usamos 4000 para margen. Para guiones largos, dividir en múltiples llamadas si es necesario.
        temperature: 0.8
      })
    })
    
    if (!response.ok) {
      throw new Error(`LLM error: ${await response.text()}`)
    }
    
    const data = await response.json()
    return data.choices[0].message.content
  }
}

// Tipos
export interface DetailedScreenplay {
  screenplay_metadata: {
    title: string
    version: string
    total_scenes: number
    estimated_duration_seconds: number
    created_at: string
  }
  scenes: DetailedScene[]
}

export interface DetailedScene {
  scene_number: number
  scene_id: string
  header: {
    type: string
    location: string
    time: string
    time_specific: string
  }
  duration: {
    screen_time_seconds: number
    story_time: string
  }
  visual_direction: {
    establishing_shot: any
    lighting: any
    color_grading: any
    depth_of_field: string
    shot_list: any[]
  }
  characters_in_scene: any[]
  action_description: {
    summary: string
    beat_by_beat: any[]
  }
  dialogue: any[]
  sound_design: any
  continuity: {
    previous_scene_connection?: any
    next_scene_setup?: any
    persistent_elements?: string[]
    changes_from_previous?: string[]
  }
  transition: {
    type: string
    duration_frames: number
    description: string
  }
  technical_notes: string[]
  ai_generation_prompts: {
    video_prompt: string
    audio_prompt: string
    negative_prompt: string
  }
}
