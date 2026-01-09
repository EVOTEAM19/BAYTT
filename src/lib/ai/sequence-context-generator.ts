import { SequenceContext, MovieContext } from '@/types/scene-context'
import { getAIConfig, getProviderWithKey } from './config'
import { callLLMProvider, type LLMGenerationParams } from './providers'
import type { ApiProvider } from '@/types/database'

// ============================================
// GENERADOR DE CONTEXTO DE SECUENCIA
// ============================================

/**
 * Genera el contexto completo de una secuencia
 * Este contexto se aplicará a TODAS las escenas de la secuencia
 */
export async function generateSequenceContext(
  movieContext: MovieContext,
  sequenceDescription: string,
  previousSequence?: SequenceContext
): Promise<SequenceContext> {
  
  const config = await getAIConfig()
  
  // Mock mode
  if (config.mockMode || !config.llmProvider) {
    return generateMockSequenceContext(movieContext, sequenceDescription)
  }
  
  const provider = config.llmProvider
  const providerWithKey = await getProviderWithKey(provider.id)
  
  if (!providerWithKey || !providerWithKey.apiKey) {
    throw new Error('Failed to get provider API key')
  }
  
  const systemPrompt = `Eres un director de fotografía de Hollywood con 30 años de experiencia.
Tu trabajo es definir el contexto visual EXACTO de una secuencia de película.

REGLAS CRÍTICAS:
1. TODOS los elementos que definas DEBEN mantenerse CONSTANTES durante toda la secuencia
2. Si la escena es en un desierto, NUNCA puede aparecer agua, árboles, edificios, etc.
3. La iluminación debe ser CONSISTENTE - si es atardecer, todas las escenas tienen luz de atardecer
4. El clima NO puede cambiar bruscamente - si está despejado, sigue despejado
5. Los elementos del fondo SIEMPRE deben ser los mismos

Responde SOLO con JSON válido, sin markdown ni explicaciones.`

  const userPrompt = `
CONTEXTO DE LA PELÍCULA:
- Título: ${movieContext.title}
- Era: ${movieContext.visual_style.era}
- Estética: ${movieContext.visual_style.aesthetic}
- Paleta de colores: ${movieContext.visual_style.color_palette.join(', ')}

${previousSequence ? `
SECUENCIA ANTERIOR (para mantener coherencia si es necesario):
- Ubicación: ${previousSequence.location.name}
- Hora: ${previousSequence.time.time_of_day}
` : ''}

NUEVA SECUENCIA A DEFINIR:
${sequenceDescription}

Genera el contexto completo en este formato JSON exacto:
{
  "location": {
    "type": "interior|exterior|mixed",
    "name": "nombre descriptivo del lugar",
    "description": "descripción detallada de 2-3 frases",
    "fixed_elements": ["lista", "de", "elementos", "que", "SIEMPRE", "están", "presentes"],
    "forbidden_elements": ["lista", "de", "elementos", "que", "NUNCA", "deben", "aparecer"],
    "boundaries": "descripción de los límites del espacio"
  },
  "time": {
    "time_of_day": "dawn|morning|noon|afternoon|sunset|dusk|night|late_night",
    "time_can_progress": true/false,
    "max_time_progression": "X minutos",
    "time_description": "descripción específica del momento del día"
  },
  "lighting": {
    "primary_source": "fuente principal de luz",
    "direction": "de dónde viene la luz",
    "quality": "características de la luz",
    "shadows": "cómo son las sombras",
    "color_temperature": "temperatura en Kelvin y descripción",
    "ambient_color": "color ambiental dominante"
  },
  "weather": {
    "condition": "condición climática",
    "intensity": "intensidad",
    "atmospheric_effects": ["efectos", "atmosféricos"],
    "weather_locked": true
  },
  "visual_constants": {
    "dominant_colors": ["colores", "dominantes"],
    "textures": ["texturas", "presentes"],
    "depth_of_field": "descripción de profundidad de campo",
    "camera_movement": "estilo de movimiento de cámara"
  },
  "base_prompt": "prompt completo que se añadirá a TODAS las escenas de esta secuencia",
  "negative_prompt_additions": "elementos que NUNCA deben aparecer en ninguna escena"
}`

  const llmParams: LLMGenerationParams = {
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt },
    ],
    model: (provider.config as any)?.model,
    temperature: 0.3, // Baja temperatura para consistencia
    maxTokens: 3000,
  }

  const response = await callLLMProvider(provider, llmParams)
  
  // Parsear y validar respuesta
  const content = (response as any).content || (response as any).text || JSON.stringify(response)
  const cleanResponse = content
    .replace(/```json/g, '')
    .replace(/```/g, '')
    .trim()
  
  // Intentar extraer JSON si está dentro de texto
  const jsonMatch = cleanResponse.match(/\{[\s\S]*\}/)
  const jsonString = jsonMatch ? jsonMatch[0] : cleanResponse
  
  const contextData = JSON.parse(jsonString)
  
  // Construir el base_prompt completo
  const basePrompt = buildSequenceBasePrompt(contextData, movieContext)
  
  return {
    id: crypto.randomUUID(),
    sequence_number: previousSequence ? previousSequence.sequence_number + 1 : 1,
    movie_id: movieContext.id,
    ...contextData,
    base_prompt: basePrompt,
    scene_ids: [],
    starts_at_scene: 0,
    ends_at_scene: 0
  }
}

/**
 * Construye el prompt base que se añade a TODAS las escenas de la secuencia
 */
function buildSequenceBasePrompt(contextData: any, movieContext: MovieContext): string {
  return `
CONTEXTO VISUAL OBLIGATORIO (NUNCA ignorar):

UBICACIÓN: ${contextData.location.name}
${contextData.location.description}
Elementos SIEMPRE presentes: ${contextData.location.fixed_elements.join(', ')}
Límites del espacio: ${contextData.location.boundaries}

MOMENTO DEL DÍA: ${contextData.time.time_description}
Hora: ${contextData.time.time_of_day}

ILUMINACIÓN:
- Fuente: ${contextData.lighting.primary_source}
- Dirección: ${contextData.lighting.direction}
- Calidad: ${contextData.lighting.quality}
- Sombras: ${contextData.lighting.shadows}
- Color: ${contextData.lighting.ambient_color}

CLIMA: ${contextData.weather.condition}, ${contextData.weather.intensity}
${contextData.weather.atmospheric_effects.length > 0 ? `Efectos: ${contextData.weather.atmospheric_effects.join(', ')}` : ''}

COLORES DOMINANTES: ${contextData.visual_constants.dominant_colors.join(', ')}
TEXTURAS: ${contextData.visual_constants.textures.join(', ')}

ESTILO VISUAL: ${movieContext.visual_style.aesthetic}, ${movieContext.visual_style.lighting_style}
`.trim()
}

/**
 * Genera el negative prompt para la secuencia
 */
export function buildSequenceNegativePrompt(sequence: SequenceContext): string {
  const forbidden = sequence.location.forbidden_elements.join(', ')
  const additions = sequence.negative_prompt_additions
  
  return `
${forbidden},
${additions},
inconsistent lighting, wrong time of day, different location,
mismatched colors, broken continuity, jarring transition,
elements from different environment, anachronistic elements,
cartoon, anime, illustration, painting, 3d render, CGI,
fake, artificial, low quality, blurry, deformed
`.trim()
}

/**
 * Mock para desarrollo
 */
function generateMockSequenceContext(
  movieContext: MovieContext,
  sequenceDescription: string
): SequenceContext {
  return {
    id: crypto.randomUUID(),
    sequence_number: 1,
    movie_id: movieContext.id,
    location: {
      type: 'exterior',
      name: 'Lugar Mock',
      description: sequenceDescription,
      fixed_elements: ['elemento1', 'elemento2'],
      forbidden_elements: ['agua', 'árboles'],
      boundaries: 'horizonte visible'
    },
    time: {
      time_of_day: 'afternoon',
      time_can_progress: true,
      max_time_progression: '30 minutos',
      time_description: 'tarde soleada'
    },
    lighting: {
      primary_source: 'sol',
      direction: 'lateral',
      quality: 'natural',
      shadows: 'suaves',
      color_temperature: '5600K neutro',
      ambient_color: 'blanco cálido'
    },
    weather: {
      condition: 'despejado',
      intensity: 'leve',
      atmospheric_effects: [],
      weather_locked: true
    },
    visual_constants: {
      dominant_colors: ['azul', 'verde'],
      textures: ['piedra', 'hierba'],
      depth_of_field: 'profunda',
      camera_movement: 'estable'
    },
    base_prompt: 'Contexto mock de secuencia',
    negative_prompt_additions: 'elementos prohibidos',
    scene_ids: [],
    starts_at_scene: 0,
    ends_at_scene: 0
  }
}

