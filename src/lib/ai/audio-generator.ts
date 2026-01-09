// ============================================
// BAYTT - Audio Generator
// ============================================

import { getAIConfig } from "./config";
import { callAudioProvider, type AudioGenerationParams } from "./providers";
import { supabaseAdmin } from "@/lib/supabase/admin";
import type { Character } from "@/types/database";

// ============================================
// Types
// ============================================

export interface VoiceGenerationParams {
  text: string;
  character_id?: string; // Personaje predefinido con voz asignada
  voice_id: string; // ID de voz del provider
  voice_settings?: {
    stability?: number; // 0-1
    similarity_boost?: number; // 0-1
    style?: number; // 0-1
    speed?: number; // 0.5-2
  };
}

export interface GeneratedAudio {
  audio_url: string;
  audio_data?: ArrayBuffer;
  duration: number;
  cost: number;
  voice_id: string;
  provider: string;
}

interface ProviderAudioResponse {
  audio_url?: string;
  audio_data?: ArrayBuffer;
  id?: string;
  status?: string;
  [key: string]: unknown;
}

// ============================================
// Main Function
// ============================================

export async function generateVoice(
  params: VoiceGenerationParams
): Promise<GeneratedAudio> {
  const config = await getAIConfig();

  // MOCK MODE
  if (config.mockMode || !config.audioProvider) {
    return generateMockAudio(params);
  }

  // Si hay character_id, obtener su voice_id asignado
  let voiceId = params.voice_id;
  let character: Character | null = null;

  if (params.character_id) {
    character = await getCharacter(params.character_id);
    if (character?.voice_id) {
      voiceId = character.voice_id;
    }
  }

  // Preparar parámetros para el provider
  const providerParams: AudioGenerationParams = {
    text: params.text,
    voiceId: voiceId,
    stability: params.voice_settings?.stability,
    similarityBoost: params.voice_settings?.similarity_boost,
    ...params.voice_settings,
  };

  // Llamar al provider configurado
  const provider = config.audioProvider;
  const result = (await callAudioProvider(
    provider,
    providerParams
  )) as ProviderAudioResponse;

  // Calcular duración estimada (aproximadamente 150 palabras por minuto)
  const wordCount = params.text.split(/\s+/).length;
  const estimatedDuration = (wordCount / 150) * 60; // segundos

  return {
    audio_url: result.audio_url || "",
    audio_data: result.audio_data,
    duration: estimatedDuration,
    cost: calculateCost(provider, estimatedDuration),
    voice_id: voiceId,
    provider: provider.slug,
  };
}

// ============================================
// Helper Functions
// ============================================

/**
 * Obtiene un personaje por ID
 */
async function getCharacter(characterId: string): Promise<Character | null> {
  try {
    const { data, error } = await supabaseAdmin
      .from("characters")
      .select("*")
      .eq("id", characterId)
      .single();

    if (error) {
      console.error("Error fetching character:", error);
      return null;
    }

    return data;
  } catch (error) {
    console.error("Error fetching character:", error);
    return null;
  }
}

/**
 * Calcula el costo de generación de audio
 */
function calculateCost(provider: any, durationSeconds: number): number {
  if (provider.cost_per_second) {
    return provider.cost_per_second * durationSeconds;
  }

  if (provider.cost_per_request) {
    return provider.cost_per_request;
  }

  // Costo por defecto
  return 0.18 * durationSeconds; // Default ElevenLabs pricing
}

// ============================================
// Mock Audio Generator
// ============================================

async function generateMockAudio(
  params: VoiceGenerationParams
): Promise<GeneratedAudio> {
  // Simular delay realista (1-2 segundos)
  const delay = 1000 + Math.random() * 1000;
  await new Promise((resolve) => setTimeout(resolve, delay));

  const wordCount = params.text.split(/\s+/).length;
  const estimatedDuration = (wordCount / 150) * 60;

  // Usar un audio placeholder público de ejemplo
  // En producción, esto sería el audio generado real
  return {
    audio_url: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3",
    duration: estimatedDuration,
    cost: 0,
    voice_id: params.voice_id,
    provider: "audio-mock",
  };
}

// ============================================
// Batch Generation (para múltiples diálogos)
// ============================================

export interface BatchVoiceParams {
  dialogues: Array<{
    text: string;
    character_id?: string;
    voice_id: string;
    voice_settings?: VoiceGenerationParams["voice_settings"];
  }>;
}

export async function generateVoiceBatch(
  params: BatchVoiceParams
): Promise<GeneratedAudio[]> {
  const results: GeneratedAudio[] = [];

  for (const dialogue of params.dialogues) {
    const audio = await generateVoice({
      text: dialogue.text,
      character_id: dialogue.character_id,
      voice_id: dialogue.voice_id,
      voice_settings: dialogue.voice_settings,
    });

    results.push(audio);
  }

  return results;
}
