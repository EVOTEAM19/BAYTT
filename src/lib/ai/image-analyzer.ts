import { ImageAnalysis, ReferenceImage } from '@/types/visual-research'
import { getAIConfig, getProviderWithKey } from './config'
import { callLLMProvider, type LLMGenerationParams } from './providers'
import type { ApiProvider } from '@/types/database'

// ============================================
// ANALIZADOR DE IMÁGENES
// ============================================

/**
 * Analizar una imagen para extraer información visual
 */
export async function analyzeImage(imageUrl: string): Promise<ImageAnalysis> {
  const config = await getAIConfig()
  
  // Mock mode
  if (config.mockMode || !config.llmProvider) {
    return generateMockAnalysis(imageUrl)
  }
  
  const provider = config.llmProvider
  const providerWithKey = await getProviderWithKey(provider.id)
  
  if (!providerWithKey || !providerWithKey.apiKey) {
    throw new Error('Failed to get provider API key')
  }
  
  const systemPrompt = `Eres un director de fotografía y diseñador de producción de Hollywood.
Tu trabajo es analizar imágenes de ubicaciones para crear referencias visuales precisas.

Analiza la imagen con EXTREMO DETALLE y extrae TODA la información visual relevante.
Sé muy específico con los colores (proporciona códigos hex cuando sea posible).
Identifica TODOS los elementos que hacen única esta ubicación.

Responde SOLO en JSON válido, sin markdown ni explicaciones.`

  const userPrompt = `Analiza esta imagen en detalle y extrae:

1. ELEMENTOS PRESENTES:
   - Arquitectura (edificios, estructuras)
   - Naturaleza (vegetación, paisaje, agua)
   - Infraestructura (calles, puentes, señales)
   - Personas/actividades
   - Vehículos
   - Señalización/carteles

2. CARACTERÍSTICAS VISUALES:
   - Colores dominantes (con códigos hex aproximados)
   - Paleta de colores completa
   - Tipo de iluminación
   - Atmósfera/ambiente
   - Momento del día
   - Clima/tiempo

3. PERSPECTIVA:
   - Tipo de vista (aérea, nivel calle, panorámica)
   - Punto focal principal

4. PROMPT SUGERIDO:
   - Un prompt detallado que recreara esta imagen con IA

IMAGEN: ${imageUrl}

Responde en este formato JSON exacto:
{
  "elements": {
    "architecture": [],
    "nature": [],
    "infrastructure": [],
    "people_activities": [],
    "vehicles": [],
    "signage": []
  },
  "visual_characteristics": {
    "dominant_colors": [],
    "color_palette": [],
    "lighting": "",
    "atmosphere": "",
    "time_of_day": "",
    "weather": ""
  },
  "perspective": {
    "view_type": "",
    "focal_point": ""
  },
  "suggested_prompt": ""
}`

  try {
    const llmParams: LLMGenerationParams = {
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      model: (provider.config as any)?.model,
      temperature: 0.2, // Baja temperatura para análisis preciso
      maxTokens: 2000,
    }

    const response = await callLLMProvider(provider, llmParams)
    const content = (response as any).content || (response as any).text || JSON.stringify(response)
    
    // Limpiar y parsear
    const cleanResponse = content
      .replace(/```json/g, '')
      .replace(/```/g, '')
      .trim()
    
    // Extraer JSON
    const jsonMatch = cleanResponse.match(/\{[\s\S]*\}/)
    const jsonString = jsonMatch ? jsonMatch[0] : cleanResponse
    
    return JSON.parse(jsonString)
  } catch (error) {
    console.error('Error analyzing image:', error)
    // Retornar análisis mock en caso de error
    return generateMockAnalysis(imageUrl)
  }
}

/**
 * Analizar múltiples imágenes y consolidar hallazgos
 */
export async function analyzeMultipleImages(
  images: ReferenceImage[]
): Promise<{
  analyses: ImageAnalysis[]
  consolidated: ConsolidatedAnalysis
}> {
  // Analizar cada imagen
  const analyses: ImageAnalysis[] = []
  
  for (const image of images) {
    try {
      const analysis = await analyzeImage(image.url)
      analyses.push(analysis)
      image.analysis = analysis
    } catch (error) {
      console.error(`Error analyzing image ${image.url}:`, error)
    }
  }
  
  // Consolidar hallazgos
  const consolidated = consolidateAnalyses(analyses)
  
  return { analyses, consolidated }
}

export interface ConsolidatedAnalysis {
  // Elementos que aparecen en MÚLTIPLES imágenes (más importantes)
  recurring_elements: {
    architecture: Array<{ element: string; frequency: number }>
    nature: Array<{ element: string; frequency: number }>
    infrastructure: Array<{ element: string; frequency: number }>
  }
  
  // Colores más frecuentes
  common_colors: Array<{ color: string; hex: string; frequency: number }>
  
  // Características consistentes
  consistent_characteristics: {
    lighting: string[]
    atmosphere: string[]
    weather: string[]
  }
  
  // Elementos únicos (solo aparecen una vez pero son distintivos)
  unique_landmarks: string[]
}

function consolidateAnalyses(analyses: ImageAnalysis[]): ConsolidatedAnalysis {
  if (analyses.length === 0) {
    return {
      recurring_elements: {
        architecture: [],
        nature: [],
        infrastructure: []
      },
      common_colors: [],
      consistent_characteristics: {
        lighting: [],
        atmosphere: [],
        weather: []
      },
      unique_landmarks: []
    }
  }
  
  // Contar frecuencia de elementos
  const architectureCounts = new Map<string, number>()
  const natureCounts = new Map<string, number>()
  const infrastructureCounts = new Map<string, number>()
  const colorCounts = new Map<string, number>()
  
  for (const analysis of analyses) {
    analysis.elements.architecture.forEach(el => 
      architectureCounts.set(el, (architectureCounts.get(el) || 0) + 1)
    )
    analysis.elements.nature.forEach(el => 
      natureCounts.set(el, (natureCounts.get(el) || 0) + 1)
    )
    analysis.elements.infrastructure.forEach(el => 
      infrastructureCounts.set(el, (infrastructureCounts.get(el) || 0) + 1)
    )
    analysis.visual_characteristics.dominant_colors.forEach(color => 
      colorCounts.set(color, (colorCounts.get(color) || 0) + 1)
    )
  }
  
  // Ordenar por frecuencia
  const sortByFrequency = (map: Map<string, number>) => 
    Array.from(map.entries())
      .sort((a, b) => b[1] - a[1])
      .map(([element, frequency]) => ({ element, frequency }))
  
  return {
    recurring_elements: {
      architecture: sortByFrequency(architectureCounts),
      nature: sortByFrequency(natureCounts),
      infrastructure: sortByFrequency(infrastructureCounts)
    },
    common_colors: Array.from(colorCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .map(([color, frequency]) => ({ 
        color, 
        hex: extractHexFromColor(color) || '', 
        frequency 
      })),
    consistent_characteristics: {
      lighting: [...new Set(analyses.map(a => a.visual_characteristics.lighting))],
      atmosphere: [...new Set(analyses.map(a => a.visual_characteristics.atmosphere))],
      weather: [...new Set(analyses.map(a => a.visual_characteristics.weather))]
    },
    unique_landmarks: [] // Se podría extraer con más análisis
  }
}

/**
 * Extraer código hex de una descripción de color
 */
function extractHexFromColor(colorDesc: string): string | null {
  // Buscar patrón hex en el texto
  const hexMatch = colorDesc.match(/#[0-9A-Fa-f]{6}/)
  if (hexMatch) {
    return hexMatch[0]
  }
  
  // Mapeo básico de colores comunes
  const colorMap: Record<string, string> = {
    'azul': '#0077B6',
    'blanco': '#FFFFFF',
    'turquesa': '#40E0D0',
    'naranja': '#FF6B35',
    'amarillo': '#FFD23F',
    'verde': '#06A77D',
    'rojo': '#D62828',
    'gris': '#6C757D',
    'negro': '#000000',
    'dorado': '#FFD700',
  }
  
  const lowerColor = colorDesc.toLowerCase()
  for (const [key, hex] of Object.entries(colorMap)) {
    if (lowerColor.includes(key)) {
      return hex
    }
  }
  
  return null
}

/**
 * Mock analysis para desarrollo
 */
function generateMockAnalysis(imageUrl: string): ImageAnalysis {
  return {
    elements: {
      architecture: ['edificios', 'estructuras'],
      nature: ['vegetación', 'paisaje'],
      infrastructure: ['calles', 'señales'],
      people_activities: ['personas'],
      vehicles: ['vehículos'],
      signage: ['carteles']
    },
    visual_characteristics: {
      dominant_colors: ['azul', 'blanco'],
      color_palette: ['#0077B6', '#FFFFFF'],
      lighting: 'natural',
      atmosphere: 'ambiente típico',
      time_of_day: 'día',
      weather: 'despejado'
    },
    perspective: {
      view_type: 'panorámica',
      focal_point: 'centro'
    },
    suggested_prompt: `Photorealistic image of ${imageUrl}`
  }
}

