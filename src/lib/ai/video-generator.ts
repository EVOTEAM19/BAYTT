// ============================================
// BAYTT - Video Generator
// ============================================

import { getAIConfig } from "./config";
import { callVideoProvider, type VideoGenerationParams as ProviderParams } from "./providers";
import type { ApiProvider } from "@/types/database";

// ============================================
// Types
// ============================================

export interface VideoGenerationParams {
  scene_id: string;
  visual_prompt: string;
  duration_seconds: number;
  previous_frame_url?: string; // CRÍTICO para continuidad
  visual_context?: string; // Contexto de la escena anterior
  style?: string;
  aspect_ratio?: "1280:720" | "720:1280" | "960:960"; // Runway format: 1280:720 (16:9), 720:1280 (9:16), 960:960 (1:1) - DOS PUNTOS
}

export interface GeneratedVideo {
  clip_url: string;
  thumbnail_url: string;
  first_frame_url: string; // Para preview
  last_frame_url: string; // CRÍTICO: para la siguiente escena
  duration: number;
  resolution: string;
  cost: number;
}

interface ProviderResponse {
  video_url: string;
  id?: string;
  status?: string;
  [key: string]: unknown;
}

// ============================================
// Main Function
// ============================================

export async function generateVideoClip(
  params: VideoGenerationParams
): Promise<GeneratedVideo> {
  const config = await getAIConfig();

  // MOCK MODE
  if (config.mockMode || !config.videoProvider) {
    return generateMockVideo(params);
  }

  // Construir prompt mejorado con contexto
  let enhancedPrompt = params.visual_prompt;

  if (params.previous_frame_url && params.visual_context) {
    // Añadir referencia al frame anterior para continuidad
    enhancedPrompt = `CONTINUACIÓN DE ESCENA ANTERIOR. Mantener exactamente: ${params.visual_context}. ${enhancedPrompt}`;
  }

  // Preparar parámetros para el provider
  const providerParams: ProviderParams = {
    prompt: enhancedPrompt,
    duration: params.duration_seconds,
    aspectRatio: params.aspect_ratio || "1280:720", // Runway format: 1280:720 (16:9 horizontal) - DOS PUNTOS
    style: params.style,
    image_url: params.previous_frame_url, // Image-to-video para continuidad
  };

  // Llamar al provider configurado
  const provider = config.videoProvider;
  const result = (await callVideoProvider(
    provider,
    providerParams
  )) as ProviderResponse;

  // Extraer frames para continuidad
  const lastFrame = await extractLastFrame(result.video_url);
  const firstFrame = await extractFirstFrame(result.video_url);

  return {
    clip_url: result.video_url,
    thumbnail_url: firstFrame,
    first_frame_url: firstFrame,
    last_frame_url: lastFrame,
    duration: params.duration_seconds,
    resolution: "1080p",
    cost: calculateCost(provider, params.duration_seconds),
  };
}

// ============================================
// Frame Extraction
// ============================================

/**
 * Extrae el último frame de un video para continuidad
 * Esta función debería ejecutarse en el servidor usando ffmpeg o similar
 */
async function extractLastFrame(videoUrl: string): Promise<string> {
  try {
    // En producción, esto debería hacerse en el servidor
    // Por ahora, retornamos una URL placeholder
    // TODO: Implementar extracción real con ffmpeg en API route
    
    // Si es una URL de video, podemos usar una API route para extraer el frame
    if (videoUrl.startsWith("http")) {
      // Llamar a API route que extrae el frame
      const response = await fetch("/api/video/extract-frame", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          video_url: videoUrl,
          frame_type: "last",
        }),
      });

      if (response.ok) {
        const data = await response.json();
        return data.frame_url;
      }
    }

    // Fallback: retornar URL placeholder
    return `${videoUrl}?frame=last`;
  } catch (error) {
    console.error("Error extracting last frame:", error);
    // Retornar URL placeholder en caso de error
    return `${videoUrl}?frame=last`;
  }
}

/**
 * Extrae el primer frame de un video para thumbnail
 */
async function extractFirstFrame(videoUrl: string): Promise<string> {
  try {
    // Similar a extractLastFrame pero para el primer frame
    if (videoUrl.startsWith("http")) {
      const response = await fetch("/api/video/extract-frame", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          video_url: videoUrl,
          frame_type: "first",
        }),
      });

      if (response.ok) {
        const data = await response.json();
        return data.frame_url;
      }
    }

    return `${videoUrl}?frame=first`;
  } catch (error) {
    console.error("Error extracting first frame:", error);
    return `${videoUrl}?frame=first`;
  }
}

// ============================================
// Cost Calculation
// ============================================

function calculateCost(provider: ApiProvider, durationSeconds: number): number {
  if (provider.cost_per_second) {
    return provider.cost_per_second * durationSeconds;
  }

  if (provider.cost_per_request) {
    return provider.cost_per_request;
  }

  // Costo por defecto si no está configurado
  return 0.05 * durationSeconds;
}

// ============================================
// Mock Video Generator
// ============================================

async function generateMockVideo(
  params: VideoGenerationParams
): Promise<GeneratedVideo> {
  // Simular delay realista (3-5 segundos)
  const delay = 3000 + Math.random() * 2000; // 3-5 segundos
  await new Promise((resolve) => setTimeout(resolve, delay));

  // Generar URLs placeholder usando servicios externos
  // Usamos el scene_id como seed para consistencia
  const seed = params.scene_id.replace(/[^a-zA-Z0-9]/g, '').slice(0, 10) || Date.now().toString();

  return {
    // Usar un video placeholder público de ejemplo
    clip_url: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4",
    // Usar Picsum Photos para frames (con seed para consistencia)
    thumbnail_url: `https://picsum.photos/seed/${seed}_thumb/800/450`,
    first_frame_url: `https://picsum.photos/seed/${seed}_first/1920/1080`,
    last_frame_url: `https://picsum.photos/seed/${seed}_last/1920/1080`,
    duration: params.duration_seconds,
    resolution: "1080p",
    cost: 0,
  };
}

// ============================================
// Batch Generation (para múltiples escenas)
// ============================================

export interface BatchVideoParams {
  scenes: Array<{
    scene_id: string;
    visual_prompt: string;
    duration_seconds: number;
    visual_context?: string;
  }>;
  aspect_ratio?: "1280:720" | "720:1280" | "960:960"; // Runway format - DOS PUNTOS
  style?: string;
}

export async function generateVideoBatch(
  params: BatchVideoParams
): Promise<GeneratedVideo[]> {
  const results: GeneratedVideo[] = [];
  let previousFrameUrl: string | undefined;
  let previousContext: string | undefined;

  for (let i = 0; i < params.scenes.length; i++) {
    const scene = params.scenes[i];

    const video = await generateVideoClip({
      scene_id: scene.scene_id,
      visual_prompt: scene.visual_prompt,
      duration_seconds: scene.duration_seconds,
      previous_frame_url: previousFrameUrl,
      visual_context: previousContext || scene.visual_context,
      aspect_ratio: params.aspect_ratio,
      style: params.style,
    });

    results.push(video);

    // Actualizar para la siguiente escena
    previousFrameUrl = video.last_frame_url;
    previousContext = scene.visual_context;
  }

  return results;
}
