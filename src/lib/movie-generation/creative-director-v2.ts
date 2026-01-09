// src/lib/movie-generation/creative-director-v2.ts

import { SupabaseClient } from '@supabase/supabase-js'

interface LocationRequirement {
  scene_numbers: number[]
  location_name: string
  location_description: string
  found_in_library: boolean
  library_location_id?: string
  needs_generation: boolean
  needs_web_search: boolean
}

interface CharacterRequirement {
  name: string
  scenes: number[]
  found_in_library: boolean
  library_character_id?: string
  has_lora: boolean
}

interface ContinuityPlan {
  scene_number: number
  is_continuation: boolean
  continues_from: number | null
  location_id: string | null
  needs_reference_frame: boolean
  reference_frame_source: 'previous_scene' | 'location_library' | 'generate'
}

export interface ProductionPlan {
  movie_id: string
  title: string
  genre: string
  locations: LocationRequirement[]
  characters: CharacterRequirement[]
  continuity: ContinuityPlan[]
  created_at: string
}

export class CreativeDirectorV2 {
  private supabase: SupabaseClient
  private llmApiKey: string
  private movieId: string
  
  constructor(supabase: SupabaseClient, llmApiKey: string, movieId: string) {
    this.supabase = supabase
    this.llmApiKey = llmApiKey
    this.movieId = movieId
  }
  
  /**
   * FASE 1: Analizar el prompt y planificar recursos ANTES de generar nada
   */
  async planProduction(
    title: string,
    userPrompt: string,
    genre: string
  ): Promise<ProductionPlan> {
    console.log('[DIRECTOR V2] Planning production...')
    
    // 1. Analizar el prompt para extraer lugares y personajes necesarios
    const requirements = await this.analyzeRequirements(userPrompt)
    
    // 2. Buscar lugares en la biblioteca
    const locationPlan = await this.planLocations(requirements.locations)
    
    // 3. Buscar/asignar personajes
    const characterPlan = await this.planCharacters(requirements.characters)
    
    // 4. Crear plan de continuidad
    const continuityPlan = await this.planContinuity(requirements.scenes)
    
    // 5. Guardar plan en la película
    const productionPlan: ProductionPlan = {
      movie_id: this.movieId,
      title,
      genre,
      locations: locationPlan,
      characters: characterPlan,
      continuity: continuityPlan,
      created_at: new Date().toISOString()
    }
    
    await this.supabase
      .from('movies')
      .update({ production_plan: productionPlan as any })
      .eq('id', this.movieId)
    
    console.log('[DIRECTOR V2] Production plan created:')
    console.log(`  - ${locationPlan.length} locations planned`)
    console.log(`  - ${characterPlan.length} characters assigned`)
    console.log(`  - ${continuityPlan.filter(c => c.is_continuation).length} continuous scenes`)
    
    return productionPlan
  }
  
  /**
   * Analizar el prompt para extraer requisitos
   */
  private async analyzeRequirements(userPrompt: string): Promise<{
    locations: any[]
    characters: any[]
    scenes: any[]
  }> {
    const systemPrompt = `Analiza este prompt de película y extrae:

1. LUGARES: Todos los lugares mencionados o implícitos donde ocurre la acción
2. PERSONAJES: Todos los personajes mencionados o implícitos
3. ESCENAS: Estructura básica de escenas (qué pasa y dónde)

Responde SOLO con JSON válido:
{
  "locations": [
    {"name": "Playa de Benidorm", "description": "Playa mediterránea con arena dorada", "appears_in_scenes": [1, 2, 5]}
  ],
  "characters": [
    {"name": "María", "description": "Protagonista, mujer joven", "appears_in_scenes": [1, 2, 3, 4, 5]}
  ],
  "scenes": [
    {"number": 1, "location": "Playa de Benidorm", "continues_previous": false, "description": "María llega a la playa"},
    {"number": 2, "location": "Playa de Benidorm", "continues_previous": true, "description": "María camina por la orilla"}
  ]
}`

    const response = await this.callLLM(systemPrompt, userPrompt)
    const parsed = JSON.parse(response)
    return parsed
  }
  
  /**
   * Planificar lugares: buscar en biblioteca o marcar para crear
   */
  private async planLocations(locationNames: any[]): Promise<LocationRequirement[]> {
    const plan: LocationRequirement[] = []
    
    for (const loc of locationNames) {
      // Buscar en biblioteca
      const { data: existing } = await this.supabase
        .from('locations')
        .select('*')
        .or(`name.ilike.%${loc.name}%,tags.cs.{${loc.name.toLowerCase()}}`)
        .limit(1)
        .maybeSingle()
      
      if (existing) {
        // Encontrado en biblioteca
        plan.push({
          scene_numbers: loc.appears_in_scenes || [],
          location_name: loc.name,
          location_description: loc.description || '',
          found_in_library: true,
          library_location_id: existing.id,
          needs_generation: false,
          needs_web_search: false
        })
        
        // Incrementar contador de uso
        await this.supabase
          .from('locations')
          .update({ 
            times_used: (existing.times_used || 0) + 1,
            last_used_at: new Date().toISOString()
          })
          .eq('id', existing.id)
          
      } else {
        // No encontrado - necesita generación o búsqueda web
        plan.push({
          scene_numbers: loc.appears_in_scenes || [],
          location_name: loc.name,
          location_description: loc.description || '',
          found_in_library: false,
          needs_generation: true,
          needs_web_search: true // Intentar buscar en internet primero
        })
      }
    }
    
    return plan
  }
  
  /**
   * Planificar personajes: asignar de biblioteca o crear nuevos
   */
  private async planCharacters(characterNames: any[]): Promise<CharacterRequirement[]> {
    const plan: CharacterRequirement[] = []
    
    for (const char of characterNames) {
      // Buscar en biblioteca
      const { data: existing } = await this.supabase
        .from('characters')
        .select('*')
        .ilike('name', `%${char.name}%`)
        .eq('status', 'ready')
        .limit(1)
        .maybeSingle()
      
      if (existing && existing.lora) {
        plan.push({
          name: char.name,
          scenes: char.appears_in_scenes || [],
          found_in_library: true,
          library_character_id: existing.id,
          has_lora: true
        })
      } else {
        plan.push({
          name: char.name,
          scenes: char.appears_in_scenes || [],
          found_in_library: false,
          has_lora: false
        })
      }
    }
    
    return plan
  }
  
  /**
   * Planificar continuidad entre escenas
   */
  private async planContinuity(scenes: any[]): Promise<ContinuityPlan[]> {
    return scenes.map((scene, index) => ({
      scene_number: scene.number || index + 1,
      is_continuation: scene.continues_previous === true || index > 0, // Continuar si no es la primera escena
      continues_from: (scene.continues_previous === true || index > 0) ? (index > 0 ? index : null) : null,
      location_id: null, // Se asignará después basándose en location_name
      needs_reference_frame: scene.continues_previous === true || index > 0,
      reference_frame_source: (scene.continues_previous === true || index > 0)
        ? 'previous_scene' 
        : 'location_library'
    }))
  }
  
  private async callLLM(system: string, user: string): Promise<string> {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.llmApiKey}`
      },
      body: JSON.stringify({
        model: 'gpt-4-turbo-preview',
        messages: [
          { role: 'system', content: system },
          { role: 'user', content: user }
        ],
        max_tokens: 4000,
        temperature: 0.7
      })
    })
    
    if (!response.ok) {
      const error = await response.text()
      throw new Error(`LLM error: ${error}`)
    }
    
    const data = await response.json()
    return data.choices[0].message.content
  }
}
