import { ScenePacket, SequenceHeader } from '@/types/scene-packet'

// ============================================
// VALIDADOR DE SCENE PACKETS
// ============================================

export interface ValidationResult {
  is_valid: boolean
  errors: ValidationError[]
  warnings: ValidationWarning[]
}

export interface ValidationError {
  field: string
  message: string
  severity: 'critical' | 'major'
}

export interface ValidationWarning {
  field: string
  message: string
  suggestion: string
}

/**
 * Valida que un ScenePacket esté completo y sea coherente
 */
export function validateScenePacket(
  packet: ScenePacket,
  previousPacket: ScenePacket | null,
  sequenceHeader: SequenceHeader
): ValidationResult {
  const errors: ValidationError[] = []
  const warnings: ValidationWarning[] = []
  
  // ========================================
  // VALIDACIONES CRÍTICAS
  // ========================================
  
  // Ubicación
  if (!packet.location.name || packet.location.name.trim() === '') {
    errors.push({
      field: 'location.name',
      message: 'El nombre de la ubicación es OBLIGATORIO',
      severity: 'critical'
    })
  }
  
  if (!packet.location.visual_description || packet.location.visual_description.length < 50) {
    errors.push({
      field: 'location.visual_description',
      message: 'La descripción visual debe tener al menos 50 caracteres',
      severity: 'critical'
    })
  }
  
  if (!packet.location.mandatory_elements || packet.location.mandatory_elements.length === 0) {
    errors.push({
      field: 'location.mandatory_elements',
      message: 'Debes especificar qué elementos DEBEN verse en la escena',
      severity: 'critical'
    })
  }
  
  // Tiempo
  if (!packet.time.time_of_day) {
    errors.push({
      field: 'time.time_of_day',
      message: 'El momento del día es OBLIGATORIO',
      severity: 'critical'
    })
  }
  
  if (!packet.time.lighting_description || packet.time.lighting_description.length < 20) {
    errors.push({
      field: 'time.lighting_description',
      message: 'La descripción de la luz debe ser detallada (mínimo 20 caracteres)',
      severity: 'critical'
    })
  }
  
  // Iluminación
  if (!packet.lighting.primary_source) {
    errors.push({
      field: 'lighting.primary_source',
      message: 'Debes indicar la fuente principal de luz',
      severity: 'critical'
    })
  }
  
  // Personajes
  if (!packet.characters.present || packet.characters.present.length === 0) {
    errors.push({
      field: 'characters.present',
      message: 'Debe haber al menos un personaje o indicar que la escena está vacía',
      severity: 'major'
    })
  }
  
  for (const char of packet.characters.present) {
    if (!char.position || char.position.trim() === '') {
      errors.push({
        field: `characters.present[${char.name}].position`,
        message: `Falta la posición del personaje ${char.name} en la escena`,
        severity: 'critical'
      })
    }
    if (!char.emotional_state) {
      errors.push({
        field: `characters.present[${char.name}].emotional_state`,
        message: `Falta el estado emocional de ${char.name}`,
        severity: 'major'
      })
    }
  }
  
  // Acción
  if (!packet.action.description || packet.action.description.length < 30) {
    errors.push({
      field: 'action.description',
      message: 'La descripción de la acción debe ser detallada (mínimo 30 caracteres)',
      severity: 'critical'
    })
  }
  
  if (!packet.action.beats || packet.action.beats.length === 0) {
    errors.push({
      field: 'action.beats',
      message: 'Debes desglosar la acción en beats (micro-acciones)',
      severity: 'major'
    })
  }
  
  // Cámara
  if (!packet.camera.primary_shot.type) {
    errors.push({
      field: 'camera.primary_shot.type',
      message: 'Debes indicar el tipo de plano',
      severity: 'critical'
    })
  }
  
  // ========================================
  // VALIDACIONES DE CONTINUIDAD
  // ========================================
  
  if (previousPacket) {
    // Verificar si hay cambio de ubicación no declarado
    const locationChanged = previousPacket.location.name !== packet.location.name
    
    if (locationChanged && !packet.location_change.has_changed) {
      errors.push({
        field: 'location_change.has_changed',
        message: 'La ubicación ha cambiado pero no está declarado en location_change',
        severity: 'critical'
      })
    }
    
    if (locationChanged && !packet.location_change.change_details) {
      errors.push({
        field: 'location_change.change_details',
        message: 'Cuando hay cambio de ubicación, debes detallar desde/hacia/tiempo transcurrido',
        severity: 'critical'
      })
    }
    
    // Verificar continuidad temporal
    if (!locationChanged && packet.time.time_continuity === 'continuous') {
      // Si es continuo, la luz no debería cambiar drásticamente
      if (previousPacket.time.time_of_day !== packet.time.time_of_day) {
        warnings.push({
          field: 'time.time_of_day',
          message: 'El momento del día cambió en una escena "continua"',
          suggestion: 'Si el tiempo ha pasado, cambia time_continuity a "minutes_later" o "hours_later"'
        })
      }
    }
  }
  
  // ========================================
  // VALIDACIONES CON LA SECUENCIA
  // ========================================
  
  // Verificar que la ubicación coincide con la secuencia
  const sequenceLocationName = sequenceHeader.location_declaration.full_name.split(',')[0].trim()
  const sceneLocationName = packet.location.name.split(',')[0].trim()
  
  if (!packet.location.name.toLowerCase().includes(sequenceLocationName.toLowerCase()) &&
      !sequenceLocationName.toLowerCase().includes(sceneLocationName.toLowerCase())) {
    warnings.push({
      field: 'location.name',
      message: `La ubicación no parece coincidir con la secuencia (${sequenceHeader.location_declaration.full_name})`,
      suggestion: 'Si has cambiado de secuencia, declara una nueva SequenceHeader'
    })
  }
  
  // ========================================
  // ADVERTENCIAS DE CALIDAD
  // ========================================
  
  if (packet.location.visual_description && packet.location.visual_description.length < 100) {
    warnings.push({
      field: 'location.visual_description',
      message: 'La descripción visual es corta',
      suggestion: 'Añade más detalles sobre colores, texturas, tamaño, elementos específicos'
    })
  }
  
  if (packet.action.beats && packet.action.beats.length < 2) {
    warnings.push({
      field: 'action.beats',
      message: 'Solo hay un beat de acción',
      suggestion: 'Desglosa la acción en más micro-acciones para mejor control del editor'
    })
  }
  
  if (!packet.editor_notes?.important || packet.editor_notes.important.length === 0) {
    warnings.push({
      field: 'editor_notes.important',
      message: 'No hay notas importantes para el editor',
      suggestion: 'Añade notas sobre qué es importante mantener, qué evitar, referencias visuales'
    })
  }
  
  return {
    is_valid: errors.length === 0,
    errors,
    warnings
  }
}

/**
 * Reformatear un ScenePacket inválido
 */
export async function reformatInvalidPacket(
  packet: ScenePacket,
  errors: ValidationError[],
  context: {
    previousPacket: ScenePacket | null
    sequence: SequenceHeader
    bible: any
  }
): Promise<ScenePacket> {
  // Usar LLM para corregir los errores
  const prompt = `
El siguiente ScenePacket tiene errores que deben corregirse:

PACKET ACTUAL:
${JSON.stringify(packet, null, 2)}

ERRORES A CORREGIR:
${errors.map(e => `- ${e.field}: ${e.message}`).join('\n')}

CONTEXTO:
${JSON.stringify(context, null, 2)}

Corrige los errores y devuelve el ScenePacket completo corregido.
Responde SOLO con JSON válido.
`

  // Llamar al LLM para corregir
  // Esto se implementará cuando se integre con el sistema de LLM
  // Por ahora, retornamos el packet original con validación actualizada
  
  // Intentar corregir errores básicos
  const correctedPacket = { ...packet }
  
  for (const error of errors) {
    if (error.field === 'location.name' && !correctedPacket.location.name) {
      correctedPacket.location.name = context.sequence.location_declaration.full_name
    }
    
    if (error.field === 'location.visual_description' && 
        (!correctedPacket.location.visual_description || correctedPacket.location.visual_description.length < 50)) {
      correctedPacket.location.visual_description = context.sequence.location_declaration.description || 
        'Descripción visual no proporcionada'
    }
    
    if (error.field === 'location.mandatory_elements' && 
        (!correctedPacket.location.mandatory_elements || correctedPacket.location.mandatory_elements.length === 0)) {
      correctedPacket.location.mandatory_elements = context.sequence.location_declaration.visual_guide.mandatory_elements || []
    }
    
    if (error.field === 'location_change.has_changed' && context.previousPacket) {
      const locationChanged = context.previousPacket.location.name !== correctedPacket.location.name
      correctedPacket.location_change.has_changed = locationChanged
      
      if (locationChanged && !correctedPacket.location_change.change_details) {
        correctedPacket.location_change.change_details = {
          from: context.previousPacket.location.name,
          to: correctedPacket.location.name,
          transition_type: 'cut',
          narrative_reason: 'Cambio de ubicación'
        }
      }
    }
  }
  
  return correctedPacket
}

