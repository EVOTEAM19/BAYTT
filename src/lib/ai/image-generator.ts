// ============================================
// BAYTT - Image Generator
// ============================================

import { getAIConfig, getProviderWithKey } from "./config";
import type { ApiProvider } from "@/types/database";

// ============================================
// TIPOS
// ============================================

export interface ImageGenerationParams {
  prompt: string;
  negative_prompt?: string;
  width?: number;
  height?: number;
  seed?: number; // Para consistencia
  num_images?: number;
}

export interface GeneratedImage {
  url: string;
  seed: number;
  width: number;
  height: number;
  cost: number;
}

// ============================================
// GENERADOR PRINCIPAL
// ============================================

/**
 * Genera imágenes hiperrealistas para personajes
 */
export async function generateHyperrealisticImage(
  params: ImageGenerationParams
): Promise<GeneratedImage[]> {
  const config = await getAIConfig();

  // Mock mode
  if (config.mockMode) {
    return generateMockImages(params);
  }

  // Obtener provider de imagen configurado
  const imageProvider = config.imageProvider;
  if (!imageProvider) {
    throw new Error("No image provider configured");
  }

  const providerWithKey = await getProviderWithKey(imageProvider.id);
  if (!providerWithKey || !providerWithKey.apiKey) {
    throw new Error("Failed to get provider API key");
  }

  switch (imageProvider.slug) {
    case "fal_flux":
      return await generateWithFalFlux(providerWithKey.apiKey, params, imageProvider);
    case "flux_pro_ultra":
      return await generateWithFluxProUltra(providerWithKey.apiKey, params);
    case "flux_replicate":
      return await generateWithFluxReplicate(providerWithKey.apiKey, params);
    case "midjourney":
      return await generateWithMidjourney(providerWithKey.apiKey, params);
    case "dalle3":
      return await generateWithDalle3(providerWithKey.apiKey, params);
    case "mock_image":
      return generateMockImages(params);
    default:
      throw new Error(`Unknown image provider: ${imageProvider.slug}`);
  }
}

// ============================================
// FAL.AI FLUX
// ============================================

async function generateWithFalFlux(
  apiKey: string,
  params: ImageGenerationParams,
  provider: ApiProvider
): Promise<GeneratedImage[]> {
  const results: GeneratedImage[] = [];
  const numImages = params.num_images || 1;

  // FAL.AI API key puede venir en formato "id:secret" o como un token único
  // Usamos la key completa como está

  for (let i = 0; i < numImages; i++) {
    const seed = params.seed ?? Math.floor(Math.random() * 2147483647);

    // FAL.AI usa el endpoint fal.run para las llamadas API
    // El modelo es fal-ai/flux/dev
    // Usar el endpoint del provider si existe, sino el default
    const endpoint = provider.api_url || 'https://fal.run/fal-ai/flux/dev';
    console.log(`[FAL.AI] Using endpoint: ${endpoint}`);

    // FAL.AI requiere el formato "Key key_id:key_secret" en el header Authorization
    // La API key viene en formato "id:secret" o puede ser un token único
    let authHeader = `Key ${apiKey}`;
    
    // Si la key ya contiene ":" entonces ya está en formato correcto
    // Si no, puede ser un token único que también funciona
    console.log(`[FAL.AI] Using API key (length: ${apiKey.length}, contains colon: ${apiKey.includes(':')})`);
    console.log(`[FAL.AI] Calling endpoint: ${endpoint}`);
    
    // Preparar el body según la API de FAL.AI
    const requestBody: any = {
      prompt: params.prompt,
      image_size: 'landscape_16_9', // FAL.AI prefiere tamaños predefinidos
      num_inference_steps: 28,
      guidance_scale: 3.5,
      num_images: 1,
    };
    
    // Añadir negative_prompt solo si existe
    if (params.negative_prompt) {
      requestBody.negative_prompt = params.negative_prompt;
    }
    
    // Añadir seed solo si existe
    if (seed) {
      requestBody.seed = seed;
    }
    
    console.log(`[FAL.AI] Request body:`, {
      prompt_length: params.prompt.length,
      has_negative: !!params.negative_prompt,
      image_size: requestBody.image_size
    });
    
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Authorization': authHeader,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    });

    console.log(`[FAL.AI] Response status: ${response.status} ${response.statusText}`);

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[FAL.AI] Error response (${response.status}):`, errorText);
      let errorMessage = `FAL.AI API error: ${response.status} ${response.statusText}`;
      
      try {
        const error = JSON.parse(errorText);
        // Extraer el mensaje de error de diferentes formatos posibles
        const detailMessage = error.detail?.message || error.detail || error.message || error.error?.message;
        
        if (detailMessage) {
          errorMessage = detailMessage;
          // Si es un error de balance agotado, hacer el mensaje más claro
          if (detailMessage.includes('Exhausted balance') || detailMessage.includes('balance')) {
            errorMessage = 'FAL.AI: Saldo agotado. Por favor, recarga tu cuenta en fal.ai/dashboard/billing';
          } else if (detailMessage.includes('Forbidden') || detailMessage.includes('locked')) {
            errorMessage = `FAL.AI: ${detailMessage}. Verifica tu API key y saldo en fal.ai/dashboard`;
          } else {
            errorMessage = `FAL.AI: ${detailMessage}`;
          }
        }
        
        if (error.detail) {
          console.error(`[FAL.AI] Error detail:`, error.detail);
        }
      } catch (e) {
        // Si no es JSON, usar el texto directo
        if (errorText.includes('Exhausted balance') || errorText.includes('balance')) {
          errorMessage = 'FAL.AI: Saldo agotado. Por favor, recarga tu cuenta en fal.ai/dashboard/billing';
        } else {
          errorMessage = `FAL.AI API error: ${errorText || response.statusText}`;
        }
      }
      throw new Error(errorMessage);
    }

    const data = await response.json();
    
    // FAL.AI puede devolver directamente la URL o un job ID para polling
    let imageUrl: string;
    
    if (data.images && data.images.length > 0) {
      // Respuesta directa con imágenes
      imageUrl = data.images[0].url || data.images[0];
    } else if (data.request_id) {
      // Necesita polling
      imageUrl = await pollForFalResult(data.request_id, apiKey);
    } else {
      throw new Error('Unexpected FAL.AI response format');
    }

    results.push({
      url: imageUrl,
      seed: seed,
      width: params.width || 1024,
      height: params.height || 1024,
      cost: 0.05,
    });
  }

  return results;
}

async function pollForFalResult(
  requestId: string,
  apiKey: string
): Promise<string> {
  const maxAttempts = 60; // 2 minutos máximo
  let attempts = 0;

  while (attempts < maxAttempts) {
    await new Promise((resolve) => setTimeout(resolve, 2000));
    
    const response = await fetch(`https://fal.run/fal-ai/flux/dev/requests/${requestId}`, {
      headers: {
        'Authorization': `Key ${apiKey}`,
      },
    });

    if (!response.ok) {
      throw new Error(`FAL.AI polling error: ${response.statusText}`);
    }

    const data = await response.json();

    if (data.status === 'COMPLETED') {
      if (data.images && data.images.length > 0) {
        return data.images[0].url || data.images[0];
      }
      throw new Error('FAL.AI completed but no images in response');
    }

    if (data.status === 'FAILED') {
      throw new Error(`FAL.AI error: ${data.error || 'Unknown error'}`);
    }

    attempts++;
  }

  throw new Error('Timeout waiting for FAL.AI image');
}

// ============================================
// FLUX 1.1 PRO ULTRA (Black Forest Labs)
// ============================================

async function generateWithFluxProUltra(
  apiKey: string,
  params: ImageGenerationParams
): Promise<GeneratedImage[]> {
  const results: GeneratedImage[] = [];
  const numImages = params.num_images || 1;

  for (let i = 0; i < numImages; i++) {
    // Seed único o el proporcionado
    const seed = params.seed ?? Math.floor(Math.random() * 2147483647);

    const response = await fetch(
      "https://api.bfl.ml/v1/flux-pro-1.1-ultra",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Key": apiKey,
        },
        body: JSON.stringify({
          prompt: params.prompt,
          width: params.width || 1024,
          height: params.height || 1024,
          seed: seed,
          safety_tolerance: 2,
          output_format: "png",
        }),
      }
    );

    if (!response.ok) {
      throw new Error(`Flux API error: ${response.statusText}`);
    }

    const data = await response.json();

    // Flux devuelve un ID, hay que hacer polling
    const imageUrl = await pollForFluxResult(data.id, apiKey);

    results.push({
      url: imageUrl,
      seed: seed,
      width: params.width || 1024,
      height: params.height || 1024,
      cost: 0.06,
    });
  }

  return results;
}

async function pollForFluxResult(
  taskId: string,
  apiKey: string
): Promise<string> {
  const maxAttempts = 60; // 2 minutos máximo
  let attempts = 0;

  while (attempts < maxAttempts) {
    const response = await fetch(
      `https://api.bfl.ml/v1/get_result?id=${taskId}`,
      {
        headers: { "X-Key": apiKey },
      }
    );

    if (!response.ok) {
      throw new Error(`Flux polling error: ${response.statusText}`);
    }

    const data = await response.json();

    if (data.status === "Ready") {
      return data.result.sample;
    }

    if (data.status === "Error") {
      throw new Error(`Flux error: ${data.error}`);
    }

    // Esperar 2 segundos antes de reintentar
    await new Promise((resolve) => setTimeout(resolve, 2000));
    attempts++;
  }

  throw new Error("Timeout waiting for Flux image");
}

// ============================================
// FLUX VIA REPLICATE
// ============================================

async function generateWithFluxReplicate(
  apiKey: string,
  params: ImageGenerationParams
): Promise<GeneratedImage[]> {
  const response = await fetch("https://api.replicate.com/v1/predictions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "black-forest-labs/flux-1.1-pro",
      input: {
        prompt: params.prompt,
        width: params.width || 1024,
        height: params.height || 1024,
        num_outputs: params.num_images || 1,
        seed: params.seed,
      },
    }),
  });

  if (!response.ok) {
    throw new Error(`Replicate API error: ${response.statusText}`);
  }

  const prediction = await response.json();

  // Polling para resultado
  let result = prediction;
  while (result.status !== "succeeded" && result.status !== "failed") {
    await new Promise((resolve) => setTimeout(resolve, 2000));
    const pollResponse = await fetch(result.urls.get, {
      headers: { Authorization: `Bearer ${apiKey}` },
    });

    if (!pollResponse.ok) {
      throw new Error(`Replicate polling error: ${pollResponse.statusText}`);
    }

    result = await pollResponse.json();
  }

  if (result.status === "failed") {
    throw new Error(`Replicate error: ${result.error}`);
  }

  return (result.output as string[]).map((url: string, i: number) => ({
    url,
    seed: params.seed || 0,
    width: params.width || 1024,
    height: params.height || 1024,
    cost: 0.05,
  }));
}

// ============================================
// MIDJOURNEY (Placeholder)
// ============================================

async function generateWithMidjourney(
  apiKey: string,
  params: ImageGenerationParams
): Promise<GeneratedImage[]> {
  // TODO: Implementar integración con Midjourney API cuando esté disponible
  // Por ahora, usar mock
  console.warn("Midjourney API not yet implemented, using mock");
  return generateMockImages(params);
}

// ============================================
// DALL-E 3
// ============================================

async function generateWithDalle3(
  apiKey: string,
  params: ImageGenerationParams
): Promise<GeneratedImage[]> {
  const response = await fetch(
    "https://api.openai.com/v1/images/generations",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "dall-e-3",
        prompt: params.prompt,
        n: params.num_images || 1,
        size: "1024x1024",
        quality: "standard",
      }),
    }
  );

  if (!response.ok) {
    const error = await response.json();
    throw new Error(`DALL-E 3 API error: ${error.error?.message || response.statusText}`);
  }

  const data = await response.json();

  return data.data.map((item: { url: string }, i: number) => ({
    url: item.url,
    seed: params.seed || 0,
    width: 1024,
    height: 1024,
    cost: 0.04,
  }));
}

// ============================================
// MOCK PARA DESARROLLO
// ============================================

function generateMockImages(
  params: ImageGenerationParams
): GeneratedImage[] {
  const numImages = params.num_images || 1;
  return Array(numImages)
    .fill(null)
    .map((_, i) => ({
      url: `https://picsum.photos/seed/${Date.now() + i}/1024/1024`,
      seed: Math.floor(Math.random() * 2147483647),
      width: params.width || 1024,
      height: params.height || 1024,
      cost: 0,
    }));
}

