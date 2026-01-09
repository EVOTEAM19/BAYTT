import { SequenceContext, SceneContext, ContextState } from '@/types/scene-context'
import { Character } from '@/types/database'
import { buildSequenceNegativePrompt } from './sequence-context-generator'

// ============================================
// CONSTRUCTOR DE PROMPTS CON CONTEXTO COMPLETO
// ============================================

export interface ScenePromptRequest {
  scene: SceneContext
  sequence: SequenceContext
  characters: Character[]
  previousState?: ContextState
}

export interface GeneratedPrompt {
  visual_prompt: string
  negative_prompt: string
  reference_frame_url?: string
  reference_frame_weight: number
}

/**
 * Construye el prompt completo para generar una escena
 * Garantiza que el contexto de la secuencia se mantiene
 */
export function buildScenePrompt(request: ScenePromptRequest): GeneratedPrompt {
  const { scene, sequence, characters, previousState } = request
  
  // ========================================
  // 1. CONTEXTO BASE DE LA SECUENCIA (OBLIGATORIO)
  // ========================================
  const sequenceContext = sequence.base_prompt
  
  // ========================================
  // 2. INFORMACIÓN DE PERSONAJES CON LoRA
  // ========================================
  const characterPrompts = characters.map(char => {
    const physical = char.physical_traits as any
    if (char.lora_trigger_word) {
      // Usar trigger word del LoRA para consistencia
      return `${char.lora_trigger_word}, ${physical?.exact_age || 30} year old ${char.gender || 'person'}`
    } else {
      // Descripción física completa
      return buildCharacterDescription(char)
    }
  }).join(', ')
  
  // ========================================
  // 3. ACCIÓN ESPECÍFICA DE LA ESCENA
  // ========================================
  const actionPrompt = `
Action: ${scene.action.description}
Emotion: ${scene.action.emotion}
${scene.action.dialogue ? `Speaking: "${scene.action.dialogue}"` : ''}
`.trim()
  
  // ========================================
  // 4. CÁMARA
  // ========================================
  const cameraPrompt = `
Shot: ${scene.camera.shot_type} shot
Angle: ${scene.camera.angle}
Movement: ${scene.camera.movement}
`.trim()
  
  // ========================================
  // 5. VARIACIONES PERMITIDAS (si las hay)
  // ========================================
  const variationsPrompt = scene.allowed_variations.lighting_variation 
    ? `Subtle variation: ${scene.allowed_variations.lighting_variation}`
    : ''
  
  const temporaryElements = scene.allowed_variations.temporary_elements.length > 0
    ? `Temporary elements: ${scene.allowed_variations.temporary_elements.join(', ')}`
    : ''
  
  // ========================================
  // 6. CONSTRUIR PROMPT FINAL
  // ========================================
  const visualPrompt = `
Cinematic film scene, photorealistic, 8K quality

${sequenceContext}

CHARACTERS IN SCENE:
${characterPrompts}

CURRENT ACTION:
${actionPrompt}

CAMERA:
${cameraPrompt}

${variationsPrompt}
${temporaryElements}

Maintain PERFECT visual continuity with previous frame.
Professional cinematography, film grain, color graded.
`.trim()
  
  // ========================================
  // 7. NEGATIVE PROMPT
  // ========================================
  const negativePrompt = buildSequenceNegativePrompt(sequence)
  
  // ========================================
  // 8. DETERMINAR FRAME DE REFERENCIA
  // ========================================
  let referenceFrameUrl: string | undefined
  let referenceFrameWeight = 0
  
  if (previousState && scene.transition.next_scene_same_sequence) {
    // Misma secuencia = alta influencia del frame anterior
    referenceFrameUrl = previousState.reference_frame_url
    referenceFrameWeight = 0.85  // 85% de influencia
  } else if (previousState && !scene.transition.next_scene_same_sequence) {
    // Cambio de secuencia = no usar frame de referencia
    referenceFrameUrl = undefined
    referenceFrameWeight = 0
  }
  
  return {
    visual_prompt: visualPrompt,
    negative_prompt: negativePrompt,
    reference_frame_url: referenceFrameUrl,
    reference_frame_weight: referenceFrameWeight
  }
}

/**
 * Construye descripción física de un personaje
 */
function buildCharacterDescription(character: Character): string {
  const physical = character.physical_traits as any
  
  return `
${physical?.exact_age || 30} year old ${character.gender || 'person'}, 
${physical?.ethnicity || 'mixed'} ethnicity, ${physical?.body_type || 'average'} build,
${physical?.skin_tone || 'medium'} skin, ${physical?.eye_color || 'brown'} ${physical?.eye_shape || 'round'} eyes,
${physical?.hair_color || 'brown'} ${physical?.hair_length || 'medium'} ${physical?.hair_style || 'straight'} hair,
${physical?.facial_hair ? physical.facial_hair + ',' : ''}
wearing ${(character.wardrobe as any)?.default_outfit || 'casual clothes'}
`.replace(/\n/g, ' ').replace(/\s+/g, ' ').trim()
}

