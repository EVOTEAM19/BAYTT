import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { getAIConfig, getProviderWithKey } from '@/lib/ai/config'
import { callLLMProvider, type LLMGenerationParams } from '@/lib/ai/providers'

export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient()
    
    // Verificar auth
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }
    
    const body = await request.json()
    const { 
      user_prompt, 
      user_plot, 
      genre, 
      count = 3 
    } = body
    
    if (!user_prompt || user_prompt.length < 20) {
      return NextResponse.json(
        { error: 'El prompt debe tener al menos 20 caracteres' },
        { status: 400 }
      )
    }
    
    const config = await getAIConfig()
    
    // Mock mode
    if (config.mockMode || !config.llmProvider) {
      return NextResponse.json({
        characters: Array.from({ length: count }, (_, i) => ({
          name: `Personaje ${i + 1}`,
          category: ['protagonist', 'antagonist', 'secondary'][i % 3],
          gender: i % 2 === 0 ? 'male' : 'female',
          description: `Personaje generado para la película`,
          physical: {
            exact_age: 25 + (i * 5),
            height_cm: 170 + (i * 3),
            weight_kg: 65 + (i * 2),
            ethnicity: 'hispanic',
            body_type: 'average',
          },
          wardrobe: {
            default_outfit: 'Ropa casual',
            color_palette: ['Negro', 'Gris', 'Azul']
          }
        }))
      })
    }
    
    // Generar personajes con LLM basados en el prompt/guion
    const systemPrompt = `Eres un diseñador de personajes para cine. Analiza el prompt y la trama de la película y genera personajes coherentes y apropiados para la historia.

Genera personajes que:
- Sean relevantes para la trama
- Tengan roles claros (protagonista, antagonista, secundarios)
- Tengan características físicas y de personalidad coherentes con el género y la historia
- Sean diversos en género, edad y características

Responde SOLO con JSON válido, sin markdown ni explicaciones.`

    const userPrompt = `Analiza esta película y genera ${count} personajes apropiados:

GÉNERO: ${genre}
PROMPT: ${user_prompt}
${user_plot ? `TRAMA: ${user_plot}` : ''}

Genera un array de ${count} personajes con este formato JSON:
[
  {
    "name": "Nombre completo del personaje",
    "category": "protagonist|antagonist|secondary|professional|fantasy|child",
    "gender": "male|female|non_binary",
    "description": "Descripción breve del personaje y su rol en la historia",
    "physical": {
      "exact_age": número entre 18-70,
      "height_cm": número entre 150-200,
      "weight_kg": número apropiado,
      "ethnicity": "caucasian|hispanic|african|asian|middle_eastern|south_asian|mixed",
      "body_type": "slim|athletic|average|muscular|heavy|curvy|petite",
      "build": "descripción",
      "skin_tone": "descripción detallada",
      "face_shape": "oval|round|square|heart|oblong|diamond",
      "eye_color": "color con detalles",
      "eye_shape": "forma",
      "eyebrows": "descripción",
      "hair_color": "color con matices",
      "hair_style": "estilo específico",
      "hair_length": "bald|buzz|short|medium|long|very_long",
      "hair_texture": "liso|ondulado|rizado",
      "facial_hair": "descripción o null",
      "nose_shape": "descripción",
      "lips": "descripción",
      "jawline": "descripción",
      "cheekbones": "descripción",
      "distinctive_marks": []
    },
    "wardrobe": {
      "default_outfit": "vestimenta típica detallada",
      "color_palette": ["color1", "color2", "color3"]
    }
  }
]

Asegúrate de incluir al menos un protagonista y un antagonista si es apropiado para la historia.`

    // Obtener provider con API key
    const provider = config.llmProvider
    const providerWithKey = await getProviderWithKey(provider.id)
    
    if (!providerWithKey || !providerWithKey.apiKey) {
      return NextResponse.json(
        { error: 'Failed to get provider API key' },
        { status: 500 }
      )
    }

    // Llamar al LLM provider
    const llmParams: LLMGenerationParams = {
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      model: (provider.config as any)?.model,
      temperature: 1.0, // Creatividad moderada
      maxTokens: 3000,
    }

    const response = await callLLMProvider(provider, llmParams)
    
    // Extraer contenido de la respuesta
    const content = (response as any).content || (response as any).text || JSON.stringify(response)
    
    // Limpiar respuesta y parsear JSON
    let cleanResponse = content
      .replace(/```json/g, '')
      .replace(/```/g, '')
      .trim()
    
    // Intentar extraer JSON si está dentro de texto
    const jsonMatch = cleanResponse.match(/\[[\s\S]*\]/)
    if (jsonMatch) {
      cleanResponse = jsonMatch[0]
    }
    
    const characters = JSON.parse(cleanResponse)
    
    // Validar que sea un array
    if (!Array.isArray(characters)) {
      throw new Error('La respuesta no es un array de personajes')
    }
    
    return NextResponse.json({
      success: true,
      characters: characters.slice(0, count) // Asegurar que no exceda el count
    })
    
  } catch (error: any) {
    console.error('Error generating characters from movie:', error)
    return NextResponse.json(
      { error: error.message || 'Error al generar personajes' },
      { status: 500 }
    )
  }
}

