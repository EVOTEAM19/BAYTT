// ============================================
// BAYTT - Music Generator
// ============================================

import { getAIConfig } from "./config";
import { callMusicProvider, type MusicGenerationParams } from "./providers";

// ============================================
// Types
// ============================================

export interface MusicGenerationRequest {
  genre: string; // sci-fi, horror, comedy, etc.
  mood: string; // epic, tense, romantic, etc.
  duration_seconds: number;
  style_description?: string; // Descripción adicional del estilo
  reference_track?: string; // URL de track de referencia (opcional)
}

export interface GeneratedMusic {
  music_url: string;
  duration: number;
  cost: number;
  provider: string;
  track_id?: string;
}

interface ProviderMusicResponse {
  music_url?: string;
  audio_url?: string;
  id?: string;
  track_id?: string;
  status?: string;
  [key: string]: unknown;
}

// ============================================
// Main Function
// ============================================

export async function generateMusic(
  params: MusicGenerationRequest
): Promise<GeneratedMusic> {
  const config = await getAIConfig();

  // MOCK MODE
  if (config.mockMode || !config.musicProvider) {
    return generateMockMusic(params);
  }

  // Construir prompt de música
  const musicPrompt = buildMusicPrompt(params);

  // Preparar parámetros para el provider
  const providerParams: MusicGenerationParams = {
    prompt: musicPrompt,
    duration: params.duration_seconds,
    style: params.style_description,
    reference_track: params.reference_track,
  };

  // Llamar al provider configurado
  const provider = config.musicProvider;
  const result = (await callMusicProvider(
    provider,
    providerParams
  )) as ProviderMusicResponse;

  return {
    music_url: result.music_url || result.audio_url || "",
    duration: params.duration_seconds,
    cost: calculateCost(provider, params.duration_seconds),
    provider: provider.slug,
    track_id: result.track_id || result.id,
  };
}

// ============================================
// Helper Functions
// ============================================

/**
 * Construye el prompt de música combinando mood, genre y style
 */
function buildMusicPrompt(params: MusicGenerationRequest): string {
  const moodDescriptions: Record<string, string> = {
    epic: "grandioso y emocionante, con orquesta completa",
    tense: "suspense y tensión, ritmo acelerado",
    romantic: "suave y romántico, melodía dulce",
    sad: "melancólico y emotivo, tempo lento",
    happy: "positivo y energético, ritmo alegre",
    mysterious: "enigmático y atmosférico, con elementos misteriosos",
    action: "dinámico y rápido, ritmo intenso",
    horror: "inquietante y escalofriante, con disonancias",
  };

  const genreDescriptions: Record<string, string> = {
    "sci-fi": "futurista, electrónico, sintético",
    horror: "oscuro, siniestro, atmosférico",
    comedy: "ligero, juguetón, divertido",
    drama: "emocional, profundo, expresivo",
    action: "intenso, rápido, poderoso",
    romance: "dulce, suave, romántico",
    thriller: "suspense, tenso, nervioso",
    fantasy: "mágico, épico, orquestal",
    adventure: "heroico, expansivo, emocionante",
    mystery: "enigmático, intrigante, atmosférico",
    animation: "colorido, alegre, dinámico",
    documentary: "neutral, informativo, ambiental",
  };

  const moodDesc = moodDescriptions[params.mood] || params.mood;
  const genreDesc = genreDescriptions[params.genre] || params.genre;

  let prompt = `${moodDesc} ${genreDesc} soundtrack, cinematic, professional quality`;

  if (params.style_description) {
    prompt += `, ${params.style_description}`;
  }

  return prompt;
}

/**
 * Calcula el costo de generación de música
 */
function calculateCost(provider: any, durationSeconds: number): number {
  if (provider.cost_per_second) {
    return provider.cost_per_second * durationSeconds;
  }

  if (provider.cost_per_request) {
    return provider.cost_per_request;
  }

  // Costo por defecto
  return 0.02 * durationSeconds; // Default Suno/Udio pricing
}

// ============================================
// Mock Music Generator
// ============================================

async function generateMockMusic(
  params: MusicGenerationRequest
): Promise<GeneratedMusic> {
  // Simular delay realista (3-5 segundos)
  const delay = 3000 + Math.random() * 2000;
  await new Promise((resolve) => setTimeout(resolve, delay));

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  const mockId = `mock_music_${Date.now()}`;

  return {
    music_url: `${baseUrl}/api/mock/music/${mockId}.mp3`,
    duration: params.duration_seconds,
    cost: 0,
    provider: "music-mock",
    track_id: mockId,
  };
}

// ============================================
// Music by Scene (generar música para escenas)
// ============================================

export interface SceneMusicParams {
  scene_number: number;
  genre: string;
  mood: string;
  duration_seconds: number;
  style_description?: string;
}

export async function generateMusicForScenes(
  scenes: SceneMusicParams[]
): Promise<GeneratedMusic[]> {
  const results: GeneratedMusic[] = [];

  for (const scene of scenes) {
    const music = await generateMusic({
      genre: scene.genre,
      mood: scene.mood,
      duration_seconds: scene.duration_seconds,
      style_description: scene.style_description,
    });

    results.push(music);
  }

  return results;
}

