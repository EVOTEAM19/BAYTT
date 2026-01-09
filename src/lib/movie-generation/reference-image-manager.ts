// src/lib/movie-generation/reference-image-manager.ts

import { SupabaseClient } from '@supabase/supabase-js'

interface LocationImageResult {
  image_url: string
  source: 'library' | 'generated' | 'previous_frame'
  location_image_id?: string
}

export class ReferenceImageManager {
  private supabase: SupabaseClient
  private falApiKey: string
  private movieId: string
  
  constructor(supabase: SupabaseClient, falApiKey: string, movieId: string) {
    this.supabase = supabase
    this.falApiKey = falApiKey
    this.movieId = movieId
  }
  
  /**
   * Obtener o generar imagen de referencia para una escena
   */
  async getOrCreateReferenceImage(
    scene: any,
    previousEndFrame: string | null,
    isContinuation: boolean
  ): Promise<LocationImageResult> {
    console.log(`[REF IMAGE] ==========================================`)
    console.log(`[REF IMAGE] Getting reference image for scene ${scene.scene_number}`)
    console.log(`[REF IMAGE] Location: ${scene.header?.location || scene.location || 'unknown'}`)
    console.log(`[REF IMAGE] Is continuation: ${isContinuation}`)
    console.log(`[REF IMAGE] Previous end frame: ${previousEndFrame ? 'YES' : 'NO'}`)
    
    // CASO 1: Es continuación y tenemos el último frame de la escena anterior
    // → Usar el último frame para mantener continuidad perfecta
    if (isContinuation && previousEndFrame && !previousEndFrame.includes('placeholder')) {
      console.log('[REF IMAGE] ✅ Using previous scene end frame for continuity')
      return {
        image_url: previousEndFrame,
        source: 'previous_frame'
      }
    }
    
    // Extraer información del lugar
    const locationName = scene.header?.location || scene.location || 'unknown location'
    const timeOfDay = this.extractTimeOfDay(scene)
    const weather = this.extractWeather(scene)
    
    console.log(`[REF IMAGE] Looking for: "${locationName}" at ${timeOfDay}, ${weather}`)
    
    // CASO 2: Buscar en la biblioteca de lugares
    const existingImage = await this.findInLibrary(locationName, timeOfDay, weather)
    
    if (existingImage) {
      console.log(`[REF IMAGE] ✅ Found in library: ${existingImage.image_url.substring(0, 100)}...`)
      
      // Incrementar contador de uso
      await this.incrementUsage(existingImage.id)
      
      return {
        image_url: existingImage.image_url,
        source: 'library',
        location_image_id: existingImage.id
      }
    }
    
    // CASO 3: No existe en biblioteca → Generar nueva imagen con FAL.AI
    console.log('[REF IMAGE] ⚠️ Not found in library, generating new image with FAL.AI...')
    
    const generatedImage = await this.generateLocationImage(scene, locationName, timeOfDay, weather)
    
    console.log(`[REF IMAGE] ✅ Generated and saved to library: ${generatedImage.id}`)
    
    return {
      image_url: generatedImage.image_url,
      source: 'generated',
      location_image_id: generatedImage.id
    }
  }
  
  /**
   * Buscar imagen en la biblioteca
   */
  private async findInLibrary(
    locationName: string,
    timeOfDay: string,
    weather: string
  ): Promise<{ id: string; image_url: string } | null> {
    const slug = this.createSlug(locationName)
    
    // Buscar coincidencia exacta primero (slug + hora + clima)
    // Verificar si la tabla existe antes de buscar
    try {
      const { data: exactMatch, error: exactError } = await this.supabase
        .from('location_images')
        .select('id, image_url')
        .eq('location_slug', slug)
        .eq('time_of_day', timeOfDay)
        .eq('weather', weather)
        .maybeSingle()
      
      if (exactError) {
        if (exactError.message?.includes('schema cache') || exactError.message?.includes('does not exist')) {
          console.warn(`[REF IMAGE] ⚠️ Table location_images does not exist, skipping library search`)
          return null
        }
        throw exactError
      }
      
      if (exactMatch) {
        console.log(`[REF IMAGE] Found exact match in library (slug + time + weather)`)
        return exactMatch
      }
      
      // Buscar por nombre similar con misma hora (fuzzy match)
      const { data: fuzzyMatch, error: fuzzyError } = await this.supabase
        .from('location_images')
        .select('id, image_url')
        .ilike('location_name', `%${locationName}%`)
        .eq('time_of_day', timeOfDay)
        .order('times_used', { ascending: false })
        .limit(1)
        .maybeSingle()
      
      if (fuzzyError) {
        console.warn(`[REF IMAGE] ⚠️ Error in fuzzy search: ${fuzzyError.message}`)
        return null
      }
      
      if (fuzzyMatch) {
        console.log(`[REF IMAGE] Found fuzzy match in library (name + time)`)
        return fuzzyMatch
      }
    } catch (error: any) {
      if (error.message?.includes('schema cache') || error.message?.includes('does not exist')) {
        console.warn(`[REF IMAGE] ⚠️ Table location_images does not exist: ${error.message}`)
        return null
      }
      throw error
    }
    
    return null
  }
  
  /**
   * Generar nueva imagen de lugar con FAL.AI y guardar en biblioteca
   */
  private async generateLocationImage(
    scene: any,
    locationName: string,
    timeOfDay: string,
    weather: string
  ): Promise<{ id: string; image_url: string }> {
    console.log(`[REF IMAGE] Generating image with FAL.AI for: ${locationName}`)
    
    // Construir prompt detallado para el lugar
    const prompt = this.buildLocationPrompt(scene, locationName, timeOfDay, weather)
    
    console.log(`[REF IMAGE] Prompt (${prompt.length} chars): ${prompt.substring(0, 200)}...`)
    
    // Llamar a FAL.AI
    const response = await fetch('https://fal.run/fal-ai/flux-pro/v1.1-ultra', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Key ${this.falApiKey}`
      },
      body: JSON.stringify({
        prompt,
        image_size: {
          width: 1280,
          height: 768
        },
        num_images: 1,
        enable_safety_checker: true,
        output_format: 'jpeg'
      })
    })
    
    if (!response.ok) {
      const error = await response.text()
      console.error(`[REF IMAGE] ❌ FAL.AI error: ${error}`)
      throw new Error(`FAL.AI error: ${error}`)
    }
    
    const data = await response.json()
    const imageUrl = data.images?.[0]?.url
    
    if (!imageUrl) {
      throw new Error('FAL.AI did not return an image URL')
    }
    
    console.log(`[REF IMAGE] ✅ Image generated: ${imageUrl.substring(0, 100)}...`)
    
    // Intentar guardar en biblioteca (si la tabla existe)
    const slug = this.createSlug(locationName)
    
    try {
      const { data: saved, error: saveError } = await this.supabase
        .from('location_images')
        .upsert({
          location_name: locationName,
          location_slug: slug,
          time_of_day: timeOfDay,
          weather: weather,
          image_url: imageUrl,
          generation_prompt: prompt,
          width: 1280,
          height: 768,
          times_used: 1,
          last_used_at: new Date().toISOString(),
          created_by_movie_id: this.movieId
        }, {
          onConflict: 'location_slug,time_of_day,weather',
          ignoreDuplicates: false
        })
        .select('id')
        .single()
      
      if (saveError) {
        // Si la tabla no existe, simplemente continuar sin guardar
        if (saveError.message?.includes('schema cache') || saveError.message?.includes('does not exist')) {
          console.warn(`[REF IMAGE] ⚠️ Table location_images does not exist, skipping save to library`)
          return { id: '', image_url: imageUrl }
        }
        
        console.error(`[REF IMAGE] ⚠️ Error saving to library: ${saveError.message}`)
        console.warn(`[REF IMAGE] Continuing without saving to library...`)
        return { id: '', image_url: imageUrl }
      }
      
      console.log(`[REF IMAGE] ✅ Saved to library with ID: ${saved.id}`)
      return { id: saved.id, image_url: imageUrl }
    } catch (error: any) {
      if (error.message?.includes('schema cache') || error.message?.includes('does not exist')) {
        console.warn(`[REF IMAGE] ⚠️ Table location_images does not exist: ${error.message}`)
        return { id: '', image_url: imageUrl }
      }
      console.error(`[REF IMAGE] ❌ Unexpected error saving to library: ${error.message}`)
      return { id: '', image_url: imageUrl }
    }
  }
  
  /**
   * Construir prompt detallado para generar imagen del lugar
   */
  private buildLocationPrompt(
    scene: any,
    locationName: string,
    timeOfDay: string,
    weather: string
  ): string {
    const parts: string[] = []
    
    // Estilo base
    parts.push('Cinematic establishing shot, professional photography, 4K quality')
    
    // Lugar
    parts.push(locationName)
    
    // Hora del día
    const timeDescriptions: Record<string, string> = {
      'day': 'bright daylight, midday sun',
      'night': 'nighttime, city lights, dark sky with stars',
      'sunset': 'golden hour, orange and pink sky, warm light',
      'sunrise': 'early morning, soft pink and blue sky, dawn light',
      'golden_hour': 'golden hour lighting, warm tones, long shadows'
    }
    parts.push(timeDescriptions[timeOfDay] || timeDescriptions['day'])
    
    // Clima
    const weatherDescriptions: Record<string, string> = {
      'clear': 'clear sky',
      'cloudy': 'overcast sky, soft diffused light',
      'rainy': 'rainy weather, wet surfaces, reflections',
      'foggy': 'foggy atmosphere, misty, atmospheric'
    }
    parts.push(weatherDescriptions[weather] || weatherDescriptions['clear'])
    
    // Descripción adicional de la escena si existe
    if (scene.header?.setting) {
      parts.push(scene.header.setting)
    }
    
    // Elementos visuales del lugar si existen
    if (scene.header?.description) {
      const desc = scene.header.description.substring(0, 200)
      parts.push(desc)
    }
    
    // Indicaciones técnicas
    parts.push('wide shot, empty scene without people, cinematic composition')
    parts.push('16:9 aspect ratio, film grain, movie still')
    parts.push('establishing shot for movie scene')
    
    // Negative prompt implícito
    parts.push('no people, no characters, no text, no watermark, no vehicles unless specified')
    
    return parts.join(', ')
  }
  
  /**
   * Extraer hora del día de la escena
   */
  private extractTimeOfDay(scene: any): string {
    const header = scene.header || {}
    const time = (header.time || header.time_of_day || scene.time_of_day || '').toLowerCase()
    
    if (time.includes('noche') || time.includes('night')) return 'night'
    if (time.includes('atardecer') || time.includes('sunset') || time.includes('dusk')) return 'sunset'
    if (time.includes('amanecer') || time.includes('sunrise') || time.includes('dawn')) return 'sunrise'
    if (time.includes('golden') || time.includes('dorada') || time.includes('golden hour')) return 'golden_hour'
    
    return 'day'
  }
  
  /**
   * Extraer clima de la escena
   */
  private extractWeather(scene: any): string {
    const description = JSON.stringify(scene).toLowerCase()
    
    if (description.includes('lluvia') || description.includes('rain') || description.includes('lluvioso')) return 'rainy'
    if (description.includes('niebla') || description.includes('fog') || description.includes('neblina')) return 'foggy'
    if (description.includes('nublado') || description.includes('cloud') || description.includes('nubes')) return 'cloudy'
    
    return 'clear'
  }
  
  /**
   * Crear slug del nombre del lugar
   */
  private createSlug(name: string): string {
    return name
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '') // Quitar acentos
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .substring(0, 100) // Limitar longitud
  }
  
  /**
   * Incrementar contador de uso
   */
  private async incrementUsage(imageId: string): Promise<void> {
    try {
      // Obtener el valor actual
      const { data: current } = await this.supabase
        .from('location_images')
        .select('times_used')
        .eq('id', imageId)
        .single()
      
      if (current) {
        // Incrementar manualmente
        await this.supabase
          .from('location_images')
          .update({
            times_used: (current.times_used || 0) + 1,
            last_used_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          })
          .eq('id', imageId)
      }
    } catch (error: any) {
      console.warn(`[REF IMAGE] ⚠️ Could not increment usage counter: ${error.message}`)
      // No es crítico, continuar
    }
  }
  
  /**
   * Extraer último frame de un video (placeholder - usar FFmpeg en producción)
   */
  async extractEndFrame(videoUrl: string, scene: any): Promise<string> {
    console.log(`[REF IMAGE] Extracting end frame from video...`)
    
    // En producción: usar FFmpeg para extraer el frame real
    // Por ahora: generar imagen representativa del final de la escena
    
    const locationName = scene.header?.location || scene.location || 'scene'
    const timeOfDay = this.extractTimeOfDay(scene)
    
    // Descripción del final de la escena
    const endAction = scene.action_description?.beat_by_beat?.slice(-1)[0]?.action 
      || scene.action_description?.summary?.slice(-100)
      || scene.scene_description?.slice(-200)
      || 'end of scene'
    
    const prompt = `${locationName}, ${endAction}, ${timeOfDay}, cinematic still, final moment of scene, 4K quality, wide shot`
    
    try {
      const response = await fetch('https://fal.run/fal-ai/flux-pro/v1.1-ultra', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Key ${this.falApiKey}`
        },
        body: JSON.stringify({
          prompt: prompt.substring(0, 1000),
          image_size: 'landscape_16_9', // Compatible con ratio 1280:768 de Runway
          num_images: 1,
          enable_safety_checker: true,
          output_format: 'jpeg'
        })
      })
      
      if (!response.ok) {
        console.warn('[REF IMAGE] Could not generate end frame, using video URL as fallback')
        return videoUrl
      }
      
      const data = await response.json()
      const endFrameUrl = data.images?.[0]?.url || videoUrl
      
      console.log(`[REF IMAGE] ✅ End frame generated: ${endFrameUrl.substring(0, 100)}...`)
      return endFrameUrl
      
    } catch (error: any) {
      console.warn('[REF IMAGE] ⚠️ Error generating end frame:', error.message)
      // Usar el video URL como fallback
      return videoUrl
    }
  }
}
