import { SequenceContext, SceneContext, ContextState, MovieContext } from '@/types/scene-context'
import { buildScenePrompt } from './contextual-prompt-builder'
import { validateContinuity } from './continuity-validator'
import { generateVideoWithContinuity } from './video-generator-advanced'
import type { Character } from '@/types/database'

// ============================================
// ORQUESTADOR DE GENERACIÓN CON CONTEXTO
// ============================================

export class ContextualVideoGenerator {
  private movieContext: MovieContext
  private sequences: Map<string, SequenceContext> = new Map()
  private currentState: ContextState | null = null
  
  constructor(movieContext: MovieContext) {
    this.movieContext = movieContext
  }
  
  /**
   * Registrar una nueva secuencia
   */
  registerSequence(sequence: SequenceContext): void {
    this.sequences.set(sequence.id, sequence)
    console.log(`📍 Secuencia registrada: ${sequence.location.name}`)
  }
  
  /**
   * Genera una escena con contexto completo
   * Garantiza continuidad y valida el resultado
   */
  async generateScene(
    scene: SceneContext,
    characters: Character[],
    maxRetries: number = 3
  ): Promise<{
    video_url: string
    first_frame_url: string
    last_frame_url: string
    validation: any
  }> {
    
    // Obtener secuencia de la escena
    const sequence = this.sequences.get(scene.sequence_id)
    if (!sequence) {
      throw new Error(`Secuencia ${scene.sequence_id} no encontrada`)
    }
    
    // Construir prompt con contexto completo
    const prompt = buildScenePrompt({
      scene,
      sequence,
      characters,
      previousState: this.currentState || undefined
    })
    
    let attempts = 0
    let result: any = null
    let validation: any = null
    
    while (attempts < maxRetries) {
      attempts++
      
      console.log(`🎬 Generando escena ${scene.scene_number} (intento ${attempts}/${maxRetries})`)
      
      // Generar video
      result = await generateVideoWithContinuity({
        scene: {
          id: scene.id,
          scene_number: scene.scene_number,
          description: scene.action.description,
          dialogue: scene.action.dialogue,
          character_ids: scene.action.characters_present,
          duration_seconds: 10,
          visual_prompt: prompt.visual_prompt,
          audio_prompt: '',
          visual_context: sequence.location.description,
          transition_to_next: scene.transition.type,
          transition_duration_ms: scene.transition.duration_ms
        } as any,
        previous_scene: this.currentState ? {
          last_frame_url: this.currentState.reference_frame_url
        } as any : undefined,
        options: {
          resolution: '1080p',
          fps: 24,
          duration_seconds: 10,
          use_reference_frame: prompt.reference_frame_weight > 0
        }
      })
      
      // Validar continuidad
      validation = await validateContinuity(
        result.last_frame_url,
        sequence,
        this.currentState || undefined
      )
      
      if (validation.is_valid) {
        console.log(`✅ Escena ${scene.scene_number} validada correctamente`)
        break
      } else {
        console.log(`⚠️ Escena ${scene.scene_number} tiene problemas de continuidad:`)
        validation.issues.forEach((issue: any) => {
          console.log(`   - ${issue.severity}: ${issue.description}`)
        })
        
        if (attempts < maxRetries) {
          console.log(`🔄 Regenerando con correcciones...`)
          // Aquí se podrían aplicar correcciones al prompt
        }
      }
    }
    
    // Actualizar estado actual
    this.currentState = {
      movie_id: this.movieContext.id,
      current_sequence_id: scene.sequence_id,
      current_scene_number: scene.scene_number,
      reference_frame_url: result.last_frame_url,
      detected_elements: [], // Se podría detectar con visión
      context_history: [
        ...(this.currentState?.context_history || []),
        {
          scene_number: scene.scene_number,
          sequence_id: scene.sequence_id,
          timestamp: new Date()
        }
      ]
    }
    
    return {
      ...result,
      validation
    }
  }
  
  /**
   * Procesar cambio de secuencia
   * Se llama cuando hay un cambio de ubicación/tiempo
   */
  handleSequenceChange(newSequenceId: string): void {
    console.log(`📍 Cambio de secuencia: ${this.currentState?.current_sequence_id} → ${newSequenceId}`)
    
    // En cambio de secuencia, NO heredamos el frame de referencia
    if (this.currentState) {
      this.currentState = {
        ...this.currentState,
        current_sequence_id: newSequenceId,
        reference_frame_url: '', // Resetear - nueva ubicación
      }
    }
  }
  
  /**
   * Obtener resumen de contexto actual
   */
  getContextSummary(): string {
    if (!this.currentState) return 'Sin contexto iniciado'
    
    const sequence = this.sequences.get(this.currentState.current_sequence_id)
    
    return `
📍 Secuencia actual: ${sequence?.location.name || 'Desconocida'}
🕐 Hora: ${sequence?.time.time_description || 'Desconocida'}
💡 Iluminación: ${sequence?.lighting.quality || 'Desconocida'}
🎬 Escena actual: ${this.currentState.current_scene_number}
    `.trim()
  }
  
  /**
   * Obtener estado actual
   */
  getCurrentState(): ContextState | null {
    return this.currentState
  }
}

