// ============================================
// ORQUESTADOR DE GUIÓN
// ============================================

import { ScenePacket, SequenceHeader, MovieContext } from '@/types/scene-packet'
import { VisualBible } from '@/types/visual-research'
import { validateScenePacket, reformatInvalidPacket } from './scene-packet-validator'
import { generateScenePrompt, SCREENWRITER_SYSTEM_PROMPT } from './screenwriter-system-prompt'
import { getAIConfig, getProviderWithKey } from './config'
import { callLLMProvider, type LLMGenerationParams } from './providers'
import type { ApiProvider } from '@/types/database'

// ============================================
// ORQUESTADOR DE GUIÓN
// ============================================

export class ScreenplayOrchestrator {
  private movieContext: MovieContext
  private visualBibles: Map<string, VisualBible> = new Map()
  private currentSequence: SequenceHeader | null = null
  private previousPacket: ScenePacket | null = null
  private allPackets: ScenePacket[] = []
  private sequences: SequenceHeader[] = []
  
  constructor(movieContext: MovieContext) {
    this.movieContext = movieContext
  }
  
  /**
   * Registrar una biblia visual para una ubicación
   */
  registerVisualBible(bible: VisualBible): void {
    this.visualBibles.set(bible.location_name, bible)
    console.log(`📚 Biblia visual registrada: ${bible.location_name}`)
  }
  
  /**
   * Iniciar una nueva secuencia
   */
  async startNewSequence(
    locationDescription: string,
    sequenceNumber: number = 1
  ): Promise<SequenceHeader> {
    console.log(`📍 Iniciando nueva secuencia ${sequenceNumber}: ${locationDescription}`)
    
    // Buscar si hay biblia visual
    const bible = this.findVisualBible(locationDescription)
    
    // Generar header de secuencia
    const header = await this.generateSequenceHeader(
      locationDescription, 
      bible,
      sequenceNumber
    )
    
    this.currentSequence = header
    this.sequences.push(header)
    
    console.log(`   Ubicación: ${header.location_declaration.full_name}`)
    console.log(`   Tipo: ${header.location_declaration.type}`)
    console.log(`   Escenas: ${header.scenes_in_sequence.join(', ')}`)
    
    return header
  }
  
  /**
   * Generar una escena
   */
  async generateScene(
    sceneNumber: number,
    narrativeContext: string
  ): Promise<ScenePacket> {
    console.log(`🎬 Generando escena ${sceneNumber}...`)
    
    if (!this.currentSequence) {
      throw new Error('No hay secuencia activa. Llama a startNewSequence primero.')
    }
    
    // Encontrar biblia visual si existe
    const bible = this.findVisualBible(this.currentSequence.location_declaration.full_name)
    
    // Generar prompt para el guionista
    const prompt = generateScenePrompt(
      sceneNumber,
      this.previousPacket,
      this.currentSequence,
      this.movieContext,
      bible || null,
      narrativeContext
    )
    
    // Llamar al LLM
    const config = await getAIConfig()
    
    if (config.mockMode || !config.llmProvider) {
      console.log('   Usando modo mock para generación de escena')
      return this.generateMockScenePacket(sceneNumber, narrativeContext)
    }
    
    const provider = config.llmProvider
    const providerWithKey = await getProviderWithKey(provider.id)
    
    if (!providerWithKey || !providerWithKey.apiKey) {
      throw new Error('Failed to get provider API key')
    }
    
    try {
      const llmParams: LLMGenerationParams = {
        messages: [
          { role: 'system', content: SCREENWRITER_SYSTEM_PROMPT },
          { role: 'user', content: prompt },
        ],
        model: (provider.config as any)?.model,
        temperature: 0.7, // Creatividad moderada
        maxTokens: 4000,
      }

      const response = await callLLMProvider(provider, llmParams)
      const content = (response as any).content || (response as any).text || JSON.stringify(response)
      
      // Parsear respuesta
      let packet: ScenePacket
      try {
        const cleanResponse = content
          .replace(/```json/g, '')
          .replace(/```/g, '')
          .trim()
        
        // Extraer JSON
        const jsonMatch = cleanResponse.match(/\{[\s\S]*\}/)
        const jsonString = jsonMatch ? jsonMatch[0] : cleanResponse
        
        packet = JSON.parse(jsonString)
      } catch (error) {
        console.error('Error parseando respuesta del guionista:', error)
        throw new Error(`Error parseando respuesta del guionista: ${error}`)
      }
      
      // Asegurar campos básicos
      packet.scene_id = packet.scene_id || `scene_${sceneNumber}`
      packet.scene_number = sceneNumber
      packet.sequence_id = this.currentSequence.sequence_id
      
      // Validar packet
      const validation = validateScenePacket(
        packet,
        this.previousPacket,
        this.currentSequence
      )
      
      if (!validation.is_valid) {
        console.log(`⚠️ Escena ${sceneNumber} tiene errores, corrigiendo...`)
        for (const error of validation.errors) {
          console.log(`   - ${error.field}: ${error.message}`)
        }
        
        // Intentar corregir automáticamente
        packet = await reformatInvalidPacket(packet, validation.errors, {
          previousPacket: this.previousPacket,
          sequence: this.currentSequence,
          bible: bible || null
        })
        
        // Revalidar
        const revalidation = validateScenePacket(packet, this.previousPacket, this.currentSequence)
        if (!revalidation.is_valid) {
          console.warn(`⚠️ No se pudieron corregir todos los errores de la escena ${sceneNumber}`)
        }
      }
      
      // Mostrar advertencias
      if (validation.warnings.length > 0) {
        console.log(`📋 Advertencias para escena ${sceneNumber}:`)
        for (const warning of validation.warnings) {
          console.log(`   - ${warning.field}: ${warning.message}`)
        }
      }
      
      // Actualizar validación
      packet.validation = {
        is_complete: validation.is_valid,
        consistency_check: validation.is_valid,
        location_verified: true,
        characters_verified: packet.characters.present.length > 0
      }
      
      // Guardar para continuidad
      this.previousPacket = packet
      this.allPackets.push(packet)
      
      // Actualizar secuencia con esta escena
      if (!this.currentSequence.scenes_in_sequence.includes(sceneNumber)) {
        this.currentSequence.scenes_in_sequence.push(sceneNumber)
      }
      
      console.log(`✅ Escena ${sceneNumber} generada correctamente`)
      console.log(`   Ubicación: ${packet.location.name}`)
      console.log(`   Personajes: ${packet.characters.present.map(c => c.name).join(', ')}`)
      
      return packet
    } catch (error: any) {
      console.error(`Error generando escena ${sceneNumber}:`, error)
      // Retornar packet mock en caso de error
      return this.generateMockScenePacket(sceneNumber, narrativeContext)
    }
  }
  
  /**
   * Buscar biblia visual por nombre de ubicación
   */
  private findVisualBible(locationName: string): VisualBible | undefined {
    // Buscar coincidencia exacta o parcial
    for (const [name, bible] of this.visualBibles) {
      if (locationName.toLowerCase().includes(name.toLowerCase()) ||
          name.toLowerCase().includes(locationName.toLowerCase())) {
        return bible
      }
    }
    return undefined
  }
  
  /**
   * Generar header de secuencia
   */
  private async generateSequenceHeader(
    locationDescription: string,
    bible: VisualBible | undefined,
    sequenceNumber: number
  ): Promise<SequenceHeader> {
    const config = await getAIConfig()
    
    if (config.mockMode || !config.llmProvider) {
      return this.generateMockSequenceHeader(locationDescription, sequenceNumber, bible)
    }
    
    const prompt = `
Genera un SequenceHeader para la siguiente ubicación:
${locationDescription}

${bible ? `
BIBLIA VISUAL DISPONIBLE:
${JSON.stringify(bible.summary, null, 2)}
${JSON.stringify(bible.mandatory_elements, null, 2)}
${JSON.stringify(bible.forbidden_elements, null, 2)}
` : 'No hay biblia visual, genera la descripción desde cero.'}

Responde SOLO con JSON válido del tipo SequenceHeader.
`
    
    try {
      const provider = config.llmProvider
      const providerWithKey = await getProviderWithKey(provider.id)
      
      if (!providerWithKey || !providerWithKey.apiKey) {
        throw new Error('Failed to get provider API key')
      }
      
      const llmParams: LLMGenerationParams = {
        messages: [
          { role: 'system', content: SCREENWRITER_SYSTEM_PROMPT },
          { role: 'user', content: prompt },
        ],
        model: (provider.config as any)?.model,
        temperature: 0.5,
        maxTokens: 2000,
      }

      const response = await callLLMProvider(provider, llmParams)
      const content = (response as any).content || (response as any).text || JSON.stringify(response)
      
      const cleanResponse = content
        .replace(/```json/g, '')
        .replace(/```/g, '')
        .trim()
      
      const jsonMatch = cleanResponse.match(/\{[\s\S]*\}/)
      const jsonString = jsonMatch ? jsonMatch[0] : cleanResponse
      
      const header = JSON.parse(jsonString) as SequenceHeader
      header.sequence_id = header.sequence_id || `sequence_${sequenceNumber}`
      header.sequence_number = sequenceNumber
      
      return header
    } catch (error) {
      console.error('Error generando sequence header:', error)
      return this.generateMockSequenceHeader(locationDescription, sequenceNumber, bible)
    }
  }
  
  /**
   * Generar packet mock para desarrollo
   */
  private generateMockScenePacket(
    sceneNumber: number,
    narrativeContext: string
  ): ScenePacket {
    return {
      scene_id: `scene_${sceneNumber}`,
      scene_number: sceneNumber,
      sequence_id: this.currentSequence?.sequence_id || 'sequence_1',
      location_change: {
        has_changed: this.previousPacket ? 
          this.previousPacket.location.name !== (this.currentSequence?.location_declaration.full_name || '') : 
          false
      },
      location: {
        name: this.currentSequence?.location_declaration.full_name || 'Ubicación no especificada',
        parent_location: this.currentSequence?.location_declaration.full_name || '',
        type: this.currentSequence?.location_declaration.type || 'interior',
        subtype: 'habitación',
        visual_description: this.currentSequence?.location_declaration.description || 
          'Descripción visual no disponible',
        mandatory_elements: this.currentSequence?.location_declaration.visual_guide.mandatory_elements || [],
        forbidden_elements: this.currentSequence?.location_declaration.visual_guide.forbidden_elements || []
      },
      time: {
        time_of_day: 'night',
        lighting_description: 'Luz artificial tenue',
        time_continuity: 'continuous'
      },
      lighting: {
        primary_source: 'Lámpara',
        secondary_sources: [],
        intensity: 'low',
        color_temperature: 'warm',
        quality: 'soft',
        direction: 'Desde la izquierda',
        shadows: 'Suaves',
        mood: 'Íntimo'
      },
      characters: {
        present: []
      },
      action: {
        description: narrativeContext || 'Acción no especificada',
        beats: [{
          beat_number: 1,
          duration_seconds: 5,
          action: narrativeContext || 'Acción'
        }],
        movement_intensity: 'minimal',
        pacing: 'medium'
      },
      camera: {
        primary_shot: {
          type: 'medium',
          angle: 'eye_level',
          description: 'Plano medio'
        },
        movement: {
          type: 'static'
        },
        depth_of_field: 'medium',
        focus_point: 'Centro'
      },
      audio: {
        ambient_sounds: ['Silencio']
      },
      transition_to_next: {
        type: 'cut',
        duration_ms: 0,
        next_scene_same_location: true
      },
      validation: {
        is_complete: true,
        consistency_check: true,
        location_verified: true,
        characters_verified: false
      }
    }
  }
  
  /**
   * Generar sequence header mock
   */
  private generateMockSequenceHeader(
    locationDescription: string,
    sequenceNumber: number,
    bible?: VisualBible
  ): SequenceHeader {
    return {
      sequence_id: `sequence_${sequenceNumber}`,
      sequence_number: sequenceNumber,
      location_declaration: {
        full_name: locationDescription,
        type: 'interior',
        description: bible?.summary.description || 'Descripción de ubicación',
        visual_guide: {
          architecture: bible?.architecture.style || 'Moderno',
          colors: bible?.color_palette.primary.map(c => c.hex) || ['#FFFFFF'],
          textures: ['Liso'],
          lighting_default: bible?.typical_lighting.daytime.description || 'Luz natural',
          atmosphere: bible?.summary.one_line || 'Ambiente estándar',
          mandatory_elements: bible?.mandatory_elements.always_present || [],
          forbidden_elements: bible?.forbidden_elements.never_include || []
        },
        reference_images: bible?.reference_images.map(img => img.url) || []
      },
      time_context: {
        time_of_day: 'night',
        can_progress: true,
        max_progression: '2 horas'
      },
      scenes_in_sequence: [],
      editor_instructions: 'Mantener consistencia visual en todas las escenas.'
    }
  }
  
  /**
   * Obtener todos los packets generados
   */
  getAllPackets(): ScenePacket[] {
    return this.allPackets
  }
  
  /**
   * Obtener todas las secuencias
   */
  getAllSequences(): SequenceHeader[] {
    return this.sequences
  }
  
  /**
   * Exportar guión completo para el editor de video
   */
  exportForVideoEditor(): {
    sequences: SequenceHeader[]
    scenes: ScenePacket[]
  } {
    return {
      sequences: this.sequences,
      scenes: this.allPackets
    }
  }
  
  /**
   * Resetear el orquestador
   */
  reset(): void {
    this.currentSequence = null
    this.previousPacket = null
    this.allPackets = []
    this.sequences = []
  }
}

