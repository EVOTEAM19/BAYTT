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

    // Verificar que sea admin o superadmin
    const { data: profile } = await supabaseAdmin
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    if (profile?.role !== "admin" && profile?.role !== "superadmin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    
    const { category, gender } = await request.json()
    
    console.log('[GENERATE RANDOM] Getting AI config...')
    const config = await getAIConfig()
    
    console.log('[GENERATE RANDOM] Config:', {
      mockMode: config.mockMode,
      hasLLMProvider: !!config.llmProvider,
      llmProviderId: config.llmProvider?.id,
      llmProviderSlug: config.llmProvider?.slug
    })
    
    // Mock mode
    if (config.mockMode || !config.llmProvider) {
      console.log('[GENERATE RANDOM] Using mock mode')
      return NextResponse.json(generateMockCharacter(category, gender))
    }
    
    // Generar con LLM real
    console.log('[GENERATE RANDOM] Using real LLM provider:', config.llmProvider.name)
    
    const systemPrompt = `Eres un diseñador de personajes para cine de Hollywood. 
Genera características físicas DETALLADAS, COHERENTES y REALISTAS para un personaje.
El personaje debe ser único y memorable.
Responde SOLO con JSON válido, sin markdown ni explicaciones.`

    const userPrompt = `Genera un personaje ${category === 'protagonist' ? 'protagonista' : category === 'antagonist' ? 'antagonista' : 'secundario'} ${gender === 'male' ? 'masculino' : gender === 'female' ? 'femenino' : 'no binario'}.

Responde con este JSON exacto (sin backticks, sin markdown):
{
  "name": "nombre completo apropiado",
  "description": "descripción breve del personaje en 2 frases",
  "physical": {
    "exact_age": número entre 20-60,
    "height_cm": número entre 155-195,
    "weight_kg": número apropiado para la altura,
    "ethnicity": "caucasian|hispanic|african|asian|middle_eastern|south_asian|mixed",
    "body_type": "slim|athletic|average|muscular|heavy|curvy|petite",
    "build": "descripción de la complexión",
    "skin_tone": "descripción detallada del tono de piel",
    "face_shape": "oval|round|square|heart|oblong|diamond",
    "eye_color": "color de ojos con detalles",
    "eye_shape": "forma de ojos",
    "eyebrows": "descripción de cejas",
    "hair_color": "color de cabello con matices",
    "hair_style": "estilo de peinado específico",
    "hair_length": "bald|buzz|short|medium|long|very_long",
    "hair_texture": "liso|ondulado|rizado",
    "facial_hair": "${gender === 'male' ? 'descripción de vello facial o null' : 'null'}",
    "nose_shape": "descripción de la nariz",
    "lips": "descripción de labios",
    "jawline": "descripción de mandíbula",
    "cheekbones": "descripción de pómulos",
    "distinctive_marks": ["lista de marcas distintivas si las hay"]
  },
  "wardrobe": {
    "default_outfit": "vestimenta típica del personaje detallada",
    "color_palette": ["3 colores principales"]
  }
}`

    // Obtener provider con API key
    const provider = config.llmProvider
    console.log('[GENERATE RANDOM] Getting provider with key for:', provider.id)
    const providerWithKey = await getProviderWithKey(provider.id)
    
    if (!providerWithKey || !providerWithKey.apiKey) {
      console.error('[GENERATE RANDOM] Failed to get provider API key')
      return NextResponse.json(
        { error: 'Failed to get provider API key' },
        { status: 500 }
      )
    }
    
    console.log('[GENERATE RANDOM] Provider API key obtained (length:', providerWithKey.apiKey.length, ')')

    // Llamar al LLM provider
    const model = (provider.config as any)?.model || 'gpt-4-turbo-preview'
    console.log('[GENERATE RANDOM] Calling LLM with model:', model)
    
    const llmParams: LLMGenerationParams = {
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      model: model,
      temperature: 1.2, // Alta creatividad para personajes únicos
      maxTokens: 2000,
    }

    console.log('[GENERATE RANDOM] Calling LLM provider...')
    const response = await callLLMProvider(provider, llmParams)
    console.log('[GENERATE RANDOM] LLM response received')
    
    // Extraer contenido de la respuesta
    const content = (response as any).content || (response as any).text || JSON.stringify(response)
    
    // Limpiar respuesta y parsear JSON
    let cleanResponse = content
      .replace(/```json/g, '')
      .replace(/```/g, '')
      .trim()
    
    // Intentar extraer JSON si está dentro de texto
    const jsonMatch = cleanResponse.match(/\{[\s\S]*\}/)
    if (jsonMatch) {
      cleanResponse = jsonMatch[0]
    }
    
    const characterData = JSON.parse(cleanResponse)
    
    return NextResponse.json(characterData)
    
  } catch (error: any) {
    console.error('[GENERATE RANDOM] Error generating random character:', error)
    console.error('[GENERATE RANDOM] Error stack:', error?.stack)
    console.error('[GENERATE RANDOM] Error details:', {
      message: error?.message,
      name: error?.name,
      cause: error?.cause
    })
    
    return NextResponse.json(
      { 
        error: error?.message || 'Error al generar personaje',
        details: error?.stack || undefined
      },
      { status: 500 }
    )
  }
}

function generateMockCharacter(category: string, gender: string) {
  const names = {
    male: ['Carlos García', 'Miguel Torres', 'Antonio López', 'David Martín', 'Alejandro Ruiz'],
    female: ['María López', 'Laura García', 'Carmen Martínez', 'Ana Torres', 'Elena Ruiz'],
  }
  
  const name = names[gender as keyof typeof names]?.[Math.floor(Math.random() * 5)] || 'Alex García'
  
  return {
    name,
    description: `${name} es un personaje ${category} con una personalidad única y memorable.`,
    physical: {
      exact_age: 25 + Math.floor(Math.random() * 30),
      height_cm: 160 + Math.floor(Math.random() * 30),
      weight_kg: 55 + Math.floor(Math.random() * 40),
      ethnicity: 'hispanic',
      body_type: ['slim', 'athletic', 'average'][Math.floor(Math.random() * 3)],
      build: 'Complexión proporcionada',
      skin_tone: 'Piel morena clara, tono cálido',
      face_shape: 'oval',
      eye_color: 'Marrón oscuro',
      eye_shape: 'Almendrados',
      eyebrows: 'Definidas',
      hair_color: 'Castaño oscuro',
      hair_style: 'Peinado moderno',
      hair_length: 'short',
      hair_texture: 'Ondulado',
      facial_hair: gender === 'male' ? 'Barba de 3 días' : null,
      nose_shape: 'Recta',
      lips: 'Medianos',
      jawline: 'Definida',
      cheekbones: 'Marcados',
      distinctive_marks: []
    },
    wardrobe: {
      default_outfit: 'Ropa casual moderna, colores neutros',
      color_palette: ['Negro', 'Gris', 'Azul']
    }
  }
}
