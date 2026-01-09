// src/lib/characters/character-manager-v2.ts

import { SupabaseClient } from '@supabase/supabase-js'

export class CharacterManagerV2 {
  private supabase: SupabaseClient
  private imageApiKey: string
  
  constructor(supabase: SupabaseClient, imageApiKey: string) {
    this.supabase = supabase
    this.imageApiKey = imageApiKey
  }
  
  /**
   * Generar avatar definitivo de un personaje DESPUÉS del entrenamiento LoRA
   * Siempre de frente, imagen única que representa al personaje
   */
  async generateLoraAvatar(characterId: string): Promise<string> {
    console.log(`[CHARACTER] Generating LoRA avatar for: ${characterId}`)
    
    // Obtener personaje y su LoRA
    const { data: character } = await this.supabase
      .from('characters')
      .select('*')
      .eq('id', characterId)
      .single()
    
    if (!character) {
      throw new Error('Character not found')
    }
    
    // Verificar que tiene LoRA entrenado
    const loraData = character.lora as any
    if (!loraData?.fal_lora_id) {
      throw new Error('Character does not have trained LoRA')
    }
    
    // Generar imagen frontal usando el LoRA
    const triggerWord = loraData.trigger_word || character.name.toLowerCase()
    const prompt = `${triggerWord}, front view portrait, professional headshot, neutral background, studio lighting, looking at camera, centered, high quality, 8K`
    
    const response = await fetch('https://fal.run/fal-ai/flux-lora', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Key ${this.imageApiKey}`
      },
      body: JSON.stringify({
        prompt,
        loras: [
          {
            path: loraData.fal_lora_id,
            scale: 1.0
          }
        ],
        image_size: 'square_hd',
        num_images: 1
      })
    })
    
    if (!response.ok) {
      const error = await response.text()
      throw new Error(`Failed to generate LoRA avatar: ${error}`)
    }
    
    const data = await response.json()
    const avatarUrl = data.images?.[0]?.url
    
    if (!avatarUrl) {
      throw new Error('Failed to generate LoRA avatar: No image URL in response')
    }
    
    // Guardar avatar y bloquear personaje
    await this.supabase
      .from('characters')
      .update({
        lora_avatar_url: avatarUrl,
        avatar_url: avatarUrl,
        lora_locked: true,
        lora_locked_at: new Date().toISOString()
      })
      .eq('id', characterId)
    
    console.log(`[CHARACTER] LoRA avatar generated and character locked: ${avatarUrl}`)
    
    return avatarUrl
  }
  
  /**
   * Verificar si un personaje está bloqueado (inmutable)
   */
  async isCharacterLocked(characterId: string): Promise<boolean> {
    const { data } = await this.supabase
      .from('characters')
      .select('lora_locked')
      .eq('id', characterId)
      .single()
    
    return data?.lora_locked === true
  }
  
  /**
   * Actualizar SOLO actitud/comportamiento de un personaje (no visual)
   */
  async updateCharacterBehavior(
    characterId: string,
    updates: {
      personality?: any
      voice_profile?: any
      mannerisms?: string[]
    }
  ): Promise<void> {
    const isLocked = await this.isCharacterLocked(characterId)
    
    if (!isLocked) {
      throw new Error('Character must be locked before updating behavior')
    }
    
    // Solo permitir cambios de personalidad, NO visuales
    const updateData: any = {}
    
    if (updates.personality) {
      updateData.personality = updates.personality
    }
    if (updates.voice_profile) {
      updateData.voice = updates.voice_profile
    }
    if (updates.mannerisms) {
      // Guardar mannerisms en metadata o description
      const { data: character } = await this.supabase
        .from('characters')
        .select('description')
        .eq('id', characterId)
        .single()
      
      const metadata = character?.description ? JSON.parse(character.description) : {}
      metadata.mannerisms = updates.mannerisms
      
      updateData.description = JSON.stringify(metadata)
    }
    
    await this.supabase
      .from('characters')
      .update(updateData)
      .eq('id', characterId)
  }
}
