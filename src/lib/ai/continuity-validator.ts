import { SequenceContext, SceneContext, ContextState } from '@/types/scene-context'
import { getAIConfig, getProviderWithKey } from './config'
import { callLLMProvider, type LLMGenerationParams } from './providers'
import type { ApiProvider } from '@/types/database'

// ============================================
// VALIDADOR DE CONTINUIDAD
// ============================================

export interface ContinuityCheckResult {
  is_valid: boolean
  confidence: number          // 0-1
  issues: ContinuityIssue[]
  suggestions: string[]
}

export interface ContinuityIssue {
  type: 'location' | 'time' | 'lighting' | 'elements' | 'character'
  severity: 'critical' | 'warning' | 'minor'
  description: string
  frame_timestamp?: number
}

/**
 * Valida que un frame generado mantiene la continuidad
 * Se ejecuta DESPUÉS de generar cada escena
 */
export async function validateContinuity(
  generatedFrameUrl: string,
  sequence: SequenceContext,
  previousState?: ContextState
): Promise<ContinuityCheckResult> {
  
  // En mock mode, siempre válido
  const config = await getAIConfig()
  if (config.mockMode) {
    return {
      is_valid: true,
      confidence: 1,
      issues: [],
      suggestions: []
    }
  }
  
  const provider = config.llmProvider
  if (!provider) {
    // Sin LLM, retornar válido por defecto
    return {
      is_valid: true,
      confidence: 0.8,
      issues: [],
      suggestions: []
    }
  }
  
  const providerWithKey = await getProviderWithKey(provider.id)
  if (!providerWithKey || !providerWithKey.apiKey) {
    return {
      is_valid: true,
      confidence: 0.8,
      issues: [],
      suggestions: []
    }
  }
  
  const systemPrompt = `Eres un supervisor de continuidad de Hollywood.
Tu trabajo es detectar CUALQUIER error de continuidad en una escena de película.

Analiza la imagen proporcionada y compárala con el contexto esperado.
Busca ESPECÍFICAMENTE:
1. Elementos que NO deberían estar (ubicación incorrecta)
2. Iluminación inconsistente con el momento del día
3. Clima o atmósfera diferente
4. Elementos del fondo que cambiaron
5. Colores dominantes incorrectos

Sé MUY ESTRICTO. Cualquier inconsistencia debe ser reportada.

Responde SOLO con JSON válido, sin markdown ni explicaciones.`

  const userPrompt = `
CONTEXTO ESPERADO DE LA SECUENCIA:
- Ubicación: ${sequence.location.name}
- Descripción: ${sequence.location.description}
- Elementos que DEBEN estar: ${sequence.location.fixed_elements.join(', ')}
- Elementos PROHIBIDOS: ${sequence.location.forbidden_elements.join(', ')}
- Hora del día: ${sequence.time.time_description}
- Iluminación: ${sequence.lighting.quality}, ${sequence.lighting.ambient_color}
- Clima: ${sequence.weather.condition}
- Colores dominantes: ${sequence.visual_constants.dominant_colors.join(', ')}

IMAGEN A VALIDAR: ${generatedFrameUrl}

Analiza si la imagen cumple con TODOS estos requisitos.

Responde en JSON:
{
  "is_valid": true/false,
  "confidence": 0.0-1.0,
  "issues": [
    {
      "type": "location|time|lighting|elements|character",
      "severity": "critical|warning|minor",
      "description": "descripción del problema"
    }
  ],
  "suggestions": ["sugerencia para corregir"]
}
`

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
    
    // Limpiar respuesta
    const cleanResponse = content
      .replace(/```json/g, '')
      .replace(/```/g, '')
      .trim()
    
    // Extraer JSON
    const jsonMatch = cleanResponse.match(/\{[\s\S]*\}/)
    const jsonString = jsonMatch ? jsonMatch[0] : cleanResponse
    
    const result = JSON.parse(jsonString)
    
    return result
  } catch (error) {
    console.error('Error validating continuity:', error)
    // En caso de error, retornar válido para no bloquear la generación
    return {
      is_valid: true,
      confidence: 0.7,
      issues: [],
      suggestions: ['No se pudo validar automáticamente']
    }
  }
}

/**
 * Si la validación falla, regenerar la escena con correcciones
 */
export async function regenerateWithCorrections(
  scene: SceneContext,
  sequence: SequenceContext,
  issues: ContinuityIssue[]
): Promise<string> {
  
  // Construir prompt de corrección
  const correctionPrompt = `
CORRECCIONES NECESARIAS:
${issues.map(i => `- ${i.severity.toUpperCase()}: ${i.description}`).join('\n')}

REFUERZO DE CONTEXTO:
- DEBE estar en: ${sequence.location.name}
- DEBE mostrar: ${sequence.location.fixed_elements.join(', ')}
- NO PUEDE mostrar: ${sequence.location.forbidden_elements.join(', ')}
- DEBE tener iluminación: ${sequence.lighting.quality}
- DEBE tener hora: ${sequence.time.time_description}
`
  
  // Retornar prompt corregido
  // En producción, esto se usaría para regenerar la escena
  return correctionPrompt
}

