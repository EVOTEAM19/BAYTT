import { VisualBible, ReferenceImage, LocationResearchRequest } from '@/types/visual-research'
import { searchLocationImages, getStreetViewImages, getWikipediaImages } from './image-search'
import { analyzeMultipleImages } from './image-analyzer'
import { getAIConfig, getProviderWithKey } from './config'
import { callLLMProvider, type LLMGenerationParams } from './providers'
import type { ApiProvider } from '@/types/database'

// ============================================
// GENERADOR DE BIBLIA VISUAL
// ============================================

/**
 * Genera una Biblia Visual completa para una ubicación
 * Este proceso puede tardar varios minutos
 */
export async function generateVisualBible(
  request: LocationResearchRequest
): Promise<VisualBible> {
  console.log(`📚 Generando Biblia Visual para: ${request.location_name}`)
  
  // ========================================
  // FASE 1: RECOPILAR IMÁGENES
  // ========================================
  console.log('🔍 Fase 1: Buscando imágenes de referencia...')
  
  // Buscar imágenes de diferentes fuentes
  const [searchResults, streetViewResults, wikipediaResults] = await Promise.all([
    searchLocationImages(request.location_name, {
      num_images: 30,
      specific_queries: request.specific_places
    }),
    getStreetViewImages(request.location_name, 8),
    getWikipediaImages(request.location_name)
  ])
  
  // Combinar todas las imágenes
  const allImages: ReferenceImage[] = [
    ...searchResults.map(img => ({
      id: crypto.randomUUID(),
      url: img.url,
      local_path: '',
      source: img.source as any,
      description: img.title,
      tags: []
    })),
    ...streetViewResults.map(img => ({
      id: crypto.randomUUID(),
      url: img.url,
      local_path: '',
      source: 'streetview' as any,
      description: img.title,
      tags: []
    })),
    ...wikipediaResults.map(img => ({
      id: crypto.randomUUID(),
      url: img.url,
      local_path: '',
      source: 'wikipedia' as any,
      description: img.title,
      tags: []
    }))
  ]
  
  console.log(`   Encontradas ${allImages.length} imágenes`)
  
  // ========================================
  // FASE 2: ANALIZAR IMÁGENES
  // ========================================
  console.log('🔬 Fase 2: Analizando imágenes con Vision AI...')
  
  // Analizar un subconjunto representativo (máx 15 para no tardar mucho)
  const imagesToAnalyze = allImages.slice(0, 15)
  const { analyses, consolidated } = await analyzeMultipleImages(imagesToAnalyze)
  
  console.log(`   Analizadas ${analyses.length} imágenes`)
  
  // ========================================
  // FASE 3: GENERAR BIBLIA CON LLM
  // ========================================
  console.log('📖 Fase 3: Generando Biblia Visual...')
  
  const bibleContent = await generateBibleContent(
    request,
    consolidated,
    analyses
  )
  
  // ========================================
  // FASE 4: CONSTRUIR BIBLIA FINAL
  // ========================================
  console.log('✅ Fase 4: Construyendo documento final...')
  
  const visualBible: VisualBible = {
    id: crypto.randomUUID(),
    location_name: request.location_name,
    created_at: new Date(),
    
    ...bibleContent,
    
    reference_images: allImages,
    
    // Negative prompt basado en análisis
    negative_prompt: generateNegativePrompt(bibleContent)
  }
  
  console.log(`📚 Biblia Visual generada para: ${request.location_name}`)
  
  return visualBible
}

/**
 * Genera el contenido de la biblia usando LLM
 */
async function generateBibleContent(
  request: LocationResearchRequest,
  consolidated: any,
  analyses: any[]
): Promise<Partial<VisualBible>> {
  
  const config = await getAIConfig()
  
  // Mock mode
  if (config.mockMode || !config.llmProvider) {
    return generateMockBibleContent(request)
  }
  
  const provider = config.llmProvider
  const providerWithKey = await getProviderWithKey(provider.id)
  
  if (!providerWithKey || !providerWithKey.apiKey) {
    throw new Error('Failed to get provider API key')
  }
  
  const systemPrompt = `Eres un diseñador de producción de Hollywood con 30 años de experiencia.
Tu trabajo es crear una "Biblia Visual" completa para una ubicación de película.

Esta biblia será usada por el equipo de generación de video con IA para mantener
PERFECTA CONSISTENCIA visual en todas las escenas filmadas en esta ubicación.

Sé EXTREMADAMENTE ESPECÍFICO y DETALLADO. Esta biblia es crítica para la producción.

Responde SOLO con JSON válido, sin markdown ni explicaciones.`

  const userPrompt = `Crea una Biblia Visual completa para: ${request.location_name}
Tipo: ${request.location_type}
${request.time_period ? `Época: ${request.time_period}` : ''}
${request.mood ? `Ambiente: ${request.mood}` : ''}

ANÁLISIS DE IMÁGENES REALES:
${JSON.stringify(consolidated, null, 2)}

MUESTRAS DE ANÁLISIS INDIVIDUALES:
${JSON.stringify(analyses.slice(0, 3), null, 2)}

Genera la biblia en este formato JSON exacto:
{
  "summary": {
    "one_line": "descripción en una línea",
    "description": "descripción detallada de 2-3 párrafos",
    "unique_characteristics": ["lista de características únicas"]
  },
  "mandatory_elements": {
    "always_present": ["elementos que SIEMPRE deben aparecer"],
    "iconic_landmarks": [
      {
        "name": "nombre del lugar icónico",
        "description": "descripción",
        "when_to_include": "cuándo incluirlo",
        "reference_images": []
      }
    ],
    "atmosphere_elements": ["elementos de ambiente"]
  },
  "forbidden_elements": {
    "never_include": ["elementos que NUNCA deben aparecer"],
    "anachronisms": ["anacronismos a evitar"],
    "common_mistakes": ["errores comunes a evitar"]
  },
  "color_palette": {
    "primary": [{"name": "", "hex": "", "usage": ""}],
    "secondary": [{"name": "", "hex": "", "usage": ""}],
    "accent": [{"name": "", "hex": "", "usage": ""}]
  },
  "typical_lighting": {
    "daytime": {
      "description": "",
      "color_temperature": "",
      "shadows": ""
    },
    "sunset": {
      "description": "",
      "color_temperature": "",
      "shadows": ""
    },
    "night": {
      "description": "",
      "artificial_lights": []
    }
  },
  "architecture": {
    "style": "",
    "building_types": [],
    "materials": [],
    "heights": ""
  },
  "vegetation": {
    "types": [],
    "density": "",
    "seasonal_changes": ""
  },
  "base_prompts": {
    "day_beach": "prompt para escena de día en la playa",
    "day_city": "prompt para escena de día en la ciudad",
    "night_promenade": "prompt para escena nocturna en el paseo",
    "sunset_panoramic": "prompt para atardecer panorámico"
  }
}`

  try {
    const llmParams: LLMGenerationParams = {
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      model: (provider.config as any)?.model,
      temperature: 0.3, // Baja temperatura para consistencia
      maxTokens: 4000,
    }

    const response = await callLLMProvider(provider, llmParams)
    const content = (response as any).content || (response as any).text || JSON.stringify(response)
    
    // Limpiar respuesta
    const cleanResponse = content
      .replace(/```json/g, '')
      .replace(/```/g, '')
      .trim()
    
    // Extraer JSON
    const jsonMatch = cleanResponse.match(/\{[\s\S]*\}/)
    const jsonString = jsonMatch ? jsonMatch[0] : cleanResponse
    
    return JSON.parse(jsonString)
  } catch (error) {
    console.error('Error generating bible content:', error)
    // Retornar contenido mock en caso de error
    return generateMockBibleContent(request)
  }
}

/**
 * Genera negative prompt basado en la biblia
 */
function generateNegativePrompt(bible: Partial<VisualBible>): string {
  const forbidden = bible.forbidden_elements?.never_include || []
  const anachronisms = bible.forbidden_elements?.anachronisms || []
  const mistakes = bible.forbidden_elements?.common_mistakes || []
  
  return `
${forbidden.join(', ')},
${anachronisms.join(', ')},
${mistakes.join(', ')},
wrong location, different city, incorrect architecture,
anachronistic elements, inconsistent lighting,
cartoon, anime, illustration, 3d render, CGI,
low quality, blurry, deformed
`.trim()
}

/**
 * Mock content para desarrollo
 */
function generateMockBibleContent(request: LocationResearchRequest): Partial<VisualBible> {
  return {
    summary: {
      one_line: `Ubicación: ${request.location_name}`,
      description: `Descripción detallada de ${request.location_name}`,
      unique_characteristics: ['característica 1', 'característica 2']
    },
    mandatory_elements: {
      always_present: ['elemento 1', 'elemento 2'],
      iconic_landmarks: [],
      atmosphere_elements: ['ambiente']
    },
    forbidden_elements: {
      never_include: ['elemento prohibido'],
      anachronisms: [],
      common_mistakes: []
    },
    color_palette: {
      primary: [{ name: 'Azul', hex: '#0077B6', usage: 'Mar y cielo' }],
      secondary: [{ name: 'Blanco', hex: '#FFFFFF', usage: 'Edificios' }],
      accent: []
    },
    typical_lighting: {
      daytime: {
        description: 'Luz natural',
        color_temperature: '5600K',
        shadows: 'Suaves'
      },
      sunset: {
        description: 'Atardecer',
        color_temperature: '3200K',
        shadows: 'Largas'
      },
      night: {
        description: 'Noche',
        artificial_lights: ['farolas']
      }
    },
    architecture: {
      style: 'Moderno',
      building_types: ['edificios'],
      materials: ['hormigón'],
      heights: 'Variado'
    },
    vegetation: {
      types: ['palmeras'],
      density: 'Moderada',
      seasonal_changes: 'Poca variación'
    },
    base_prompts: {
      day_beach: `Prompt para día en la playa de ${request.location_name}`,
      day_city: `Prompt para día en la ciudad de ${request.location_name}`,
      night_promenade: `Prompt para noche en el paseo de ${request.location_name}`,
      sunset_panoramic: `Prompt para atardecer panorámico de ${request.location_name}`
    }
  }
}

