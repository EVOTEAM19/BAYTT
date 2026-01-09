// src/lib/locations/location-manager.ts

import { SupabaseClient } from '@supabase/supabase-js'

interface Location {
  id: string
  name: string
  slug: string
  description?: string
  category: string
  subcategory?: string
  tags?: string[]
  real_location?: string
  country?: string
  images?: any[]
  thumbnail_url?: string
  generation_prompt: string
  negative_prompt?: string
  visual_characteristics?: any
  times_used?: number
  last_used_at?: string
  source?: string
  source_url?: string
  is_public?: boolean
  created_by?: string
  created_at?: string
  updated_at?: string
}

export class LocationManager {
  private supabase: SupabaseClient
  private imageApiKey: string
  
  constructor(supabase: SupabaseClient, imageApiKey: string) {
    this.supabase = supabase
    this.imageApiKey = imageApiKey
  }
  
  /**
   * Buscar lugar en biblioteca
   */
  async findLocation(query: string): Promise<Location | null> {
    const { data } = await this.supabase
      .rpc('search_locations', { 
        search_query: query, 
        limit_count: 1 
      } as any)
    
    return data?.[0] || null
  }
  
  /**
   * Buscar imagen de lugar en internet
   */
  async searchWebForLocation(locationName: string): Promise<string[]> {
    console.log(`[LOCATION] Searching web for: ${locationName}`)
    
    // Usar Unsplash, Pexels, o similar
    // Por ahora placeholder - implementar con APIs reales
    const searchApis = [
      this.searchUnsplash(locationName),
      this.searchPexels(locationName)
    ]
    
    const results = await Promise.all(searchApis)
    return results.flat().slice(0, 5)
  }
  
  private async searchUnsplash(query: string): Promise<string[]> {
    // TODO: Implementar búsqueda en Unsplash
    // Requiere API key de Unsplash
    return []
  }
  
  private async searchPexels(query: string): Promise<string[]> {
    // TODO: Implementar búsqueda en Pexels
    // Requiere API key de Pexels
    return []
  }
  
  /**
   * Generar imágenes de un lugar nuevo
   */
  async generateLocationImages(
    name: string,
    description: string,
    count: number = 5
  ): Promise<string[]> {
    console.log(`[LOCATION] Generating ${count} images for: ${name}`)
    
    const angles = [
      'wide establishing shot', 
      'medium shot', 
      'detail shot', 
      'aerial view', 
      'ground level'
    ]
    const images: string[] = []
    
    for (let i = 0; i < count; i++) {
      const prompt = `${description}, ${angles[i % angles.length]}, cinematic, 4K, professional photography, no people`
      
      try {
        const response = await fetch('https://fal.run/fal-ai/flux-pro/v1.1-ultra', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Key ${this.imageApiKey}`
          },
          body: JSON.stringify({
            prompt,
            image_size: 'landscape_16_9',
            num_images: 1
          })
        })
        
        if (!response.ok) {
          const errorText = await response.text()
          console.error(`[LOCATION] Failed to generate image ${i + 1}:`, errorText)
          // Si es error de balance agotado, usar placeholder
          if (errorText.includes('Exhausted balance') || errorText.includes('locked')) {
            console.warn(`[LOCATION] FAL.AI balance exhausted, using placeholder for image ${i + 1}`)
            images.push(`https://via.placeholder.com/1920x1080?text=${encodeURIComponent(name)}`)
          }
          continue
        }
        
        const data = await response.json()
        if (data.images?.[0]?.url) {
          images.push(data.images[0].url)
        }
      } catch (error: any) {
        console.error(`[LOCATION] Error generating image ${i + 1}:`, error.message)
        // Usar placeholder en caso de error
        images.push(`https://via.placeholder.com/1920x1080?text=${encodeURIComponent(name)}`)
      }
    }
    
    return images
  }
  
  /**
   * Crear y guardar un nuevo lugar en la biblioteca
   */
  async createLocation(
    name: string,
    description: string,
    category: string,
    images: string[]
  ): Promise<string> {
    console.log(`[LOCATION] Creating new location: ${name}`)
    
    const slug = name.toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
    
    const { data, error } = await this.supabase
      .from('locations')
      .insert({
        name,
        slug,
        description,
        category,
        thumbnail_url: images[0],
        images: images.map((url, i) => ({
          id: `img-${i}`,
          url,
          type: i === 0 ? 'main' : 'detail',
          angle: 'front'
        })),
        generation_prompt: `${name}, ${description}, cinematic, realistic`,
        visual_characteristics: {
          key_elements: description.split(',').map(s => s.trim())
        },
        source: 'generated'
      })
      .select('id')
      .single()
    
    if (error) {
      console.error('[LOCATION] Error creating location:', error)
      throw error
    }
    
    console.log(`[LOCATION] Created location: ${data.id}`)
    return data.id
  }
  
  /**
   * Obtener imagen de referencia de un lugar para una escena
   */
  async getReferenceImage(
    locationId: string,
    timeOfDay: 'day' | 'night' | 'sunset' | 'sunrise' = 'day'
  ): Promise<string | null> {
    const { data: location } = await this.supabase
      .from('locations')
      .select('images, thumbnail_url')
      .eq('id', locationId)
      .single()
    
    if (!location) return null
    
    // Buscar imagen con la hora del día correcta
    const images = (location.images as any[]) || []
    const matchingImage = images.find((img: any) => img.time_of_day === timeOfDay)
    
    return matchingImage?.url || location.thumbnail_url || images[0]?.url || null
  }
}
