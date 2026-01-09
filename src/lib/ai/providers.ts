// ============================================
// BAYTT - AI Providers
// ============================================

import { decryptApiKey } from "@/lib/encryption/api-keys";
import type { ApiProvider } from "@/types/database";

// ============================================
// Types
// ============================================

export interface VideoGenerationParams {
  prompt: string;
  duration?: number;
  aspectRatio?: string;
  style?: string;
  [key: string]: unknown;
}

export interface AudioGenerationParams {
  text: string;
  voiceId?: string;
  model?: string;
  stability?: number;
  similarityBoost?: number;
  [key: string]: unknown;
}

export interface MusicGenerationParams {
  prompt: string;
  duration?: number;
  style?: string;
  [key: string]: unknown;
}

export interface LLMGenerationParams {
  messages: Array<{ role: string; content: string }>;
  model?: string;
  temperature?: number;
  maxTokens?: number;
  [key: string]: unknown;
}

// ============================================
// Video Providers
// ============================================

export async function callVideoProvider(
  provider: ApiProvider,
  params: VideoGenerationParams
) {
  if (!provider.api_key_encrypted) {
    throw new Error(`Provider ${provider.name} has no API key`);
  }

  const apiKey = decryptApiKey(provider.api_key_encrypted);

  switch (provider.slug) {
    case "runway":
      return callRunway(apiKey, params, provider);
    case "kling":
      return callKling(apiKey, params, provider);
    case "luma":
      return callLuma(apiKey, params, provider);
    case "veo":
      return callVeo(apiKey, params, provider);
    case "video-mock":
      return callVideoMock(params);
    default:
      throw new Error(`Unknown video provider: ${provider.slug}`);
  }
}

async function callRunway(
  apiKey: string,
  params: VideoGenerationParams,
  provider: ApiProvider
) {
  // Verificar si hay imagen y si es accesible
  const imageUrl = params.image_url || (params as any).promptImage
  let useImageToVideo = false
  let validImageUrl: string | null = null
  
  if (imageUrl && !imageUrl.includes('placeholder.com') && !imageUrl.startsWith('placeholder://')) {
    try {
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 5000)
      const testResponse = await fetch(imageUrl, { 
        method: 'HEAD',
        signal: controller.signal
      })
      clearTimeout(timeoutId)
      if (testResponse.ok) {
        useImageToVideo = true
        validImageUrl = imageUrl
      }
    } catch {
      // Si falla, usar text_to_video
    }
  }
  
  const endpoint = useImageToVideo
    ? 'https://api.dev.runwayml.com/v1/image_to_video'
    : 'https://api.dev.runwayml.com/v1/text_to_video'
  
  // ⭐ CRÍTICO: Ratio correcto para Runway
  // image_to_video: ratio debe ser "1280:768" (horizontal) o "768:1280" (vertical) - NO acepta "16:9"
  // text_to_video: usar formato específico también
  // ⚠️ Runway NO acepta "16:9" para image_to_video, solo acepta: "1280:768" o "768:1280"
  let finalRatio: string
  if (useImageToVideo) {
    // Para image_to_video, usar "1280:768" (horizontal/landscape)
    finalRatio = '1280:768'
  } else {
    // Para text_to_video, usar también formato específico
    finalRatio = '1280:768' // Por ahora usar el mismo
  }
  
  const body: any = {
    model: 'gen3a_turbo',
    promptText: (params.prompt || '').substring(0, 1000),
    ratio: finalRatio, // ⭐ "1280:768" para image_to_video (NO "16:9")
    duration: 10, // gen3a_turbo siempre usa 10 segundos
    watermark: false
  }
  
  // Solo añadir promptImage si la URL es válida y accesible
  if (useImageToVideo && validImageUrl) {
    body.promptImage = validImageUrl
  }
  
  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
      'X-Runway-Version': '2024-11-06'
    },
    body: JSON.stringify(body)
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: "Unknown error" }));
    throw new Error(`Runway API error: ${error.message || response.statusText}`);
  }

  return response.json();
}

async function callKling(
  apiKey: string,
  params: VideoGenerationParams,
  provider: ApiProvider
) {
  const response = await fetch(`${provider.api_url}/api/v1/video/generate`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      prompt: params.prompt,
      duration: params.duration || 5,
      aspect_ratio: params.aspectRatio || "16:9",
      ...params,
    }),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: "Unknown error" }));
    throw new Error(`Kling API error: ${error.message || response.statusText}`);
  }

  return response.json();
}

async function callLuma(
  apiKey: string,
  params: VideoGenerationParams,
  provider: ApiProvider
) {
  const response = await fetch(`${provider.api_url}/v1/generations`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      prompt: params.prompt,
      duration: params.duration || 5,
      ...params,
    }),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: "Unknown error" }));
    throw new Error(`Luma API error: ${error.message || response.statusText}`);
  }

  return response.json();
}

async function callVeo(
  apiKey: string,
  params: VideoGenerationParams,
  provider: ApiProvider
) {
  const response = await fetch(`${provider.api_url}/v1/videos`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      prompt: params.prompt,
      duration: params.duration || 5,
      ...params,
    }),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: "Unknown error" }));
    throw new Error(`Veo API error: ${error.message || response.statusText}`);
  }

  return response.json();
}

async function callVideoMock(params: VideoGenerationParams) {
  // Simular delay de generación
  await new Promise((resolve) => setTimeout(resolve, 2000));

  return {
    id: `mock_${Date.now()}`,
    status: "processing",
    video_url: null,
    estimated_time: 30,
    prompt: params.prompt,
  };
}

// ============================================
// Audio Providers
// ============================================

export async function callAudioProvider(
  provider: ApiProvider,
  params: AudioGenerationParams
) {
  if (!provider.api_key_encrypted) {
    throw new Error(`Provider ${provider.name} has no API key`);
  }

  const apiKey = decryptApiKey(provider.api_key_encrypted);

  switch (provider.slug) {
    case "elevenlabs":
      return callElevenLabs(apiKey, params, provider);
    case "playht":
      return callPlayHT(apiKey, params, provider);
    case "openai-tts":
      return callOpenAITTS(apiKey, params, provider);
    case "audio-mock":
      return callAudioMock(params);
    default:
      throw new Error(`Unknown audio provider: ${provider.slug}`);
  }
}

async function callElevenLabs(
  apiKey: string,
  params: AudioGenerationParams,
  provider: ApiProvider
) {
  const voiceId = params.voiceId || "default";
  const response = await fetch(
    `${provider.api_url}/v1/text-to-speech/${voiceId}`,
    {
      method: "POST",
      headers: {
        "xi-api-key": apiKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        text: params.text,
        model_id: params.model || "eleven_multilingual_v2",
        voice_settings: {
          stability: params.stability || 0.5,
          similarity_boost: params.similarityBoost || 0.75,
        },
        ...params,
      }),
    }
  );

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: "Unknown error" }));
    throw new Error(`ElevenLabs API error: ${error.message || response.statusText}`);
  }

  const audioBlob = await response.blob();
  return {
    audio_url: URL.createObjectURL(audioBlob),
    audio_data: await audioBlob.arrayBuffer(),
  };
}

async function callPlayHT(
  apiKey: string,
  params: AudioGenerationParams,
  provider: ApiProvider
) {
  const response = await fetch(`${provider.api_url}/v1/convert`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      content: [params.text],
      voice: params.voiceId || "default",
      ...params,
    }),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: "Unknown error" }));
    throw new Error(`PlayHT API error: ${error.message || response.statusText}`);
  }

  return response.json();
}

async function callOpenAITTS(
  apiKey: string,
  params: AudioGenerationParams,
  provider: ApiProvider
) {
  const response = await fetch(`${provider.api_url}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: params.model || "tts-1-hd",
      input: params.text,
      voice: params.voiceId || "alloy",
      ...params,
    }),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: "Unknown error" }));
    throw new Error(`OpenAI TTS API error: ${error.message || response.statusText}`);
  }

  const audioBlob = await response.blob();
  return {
    audio_url: URL.createObjectURL(audioBlob),
    audio_data: await audioBlob.arrayBuffer(),
  };
}

async function callAudioMock(params: AudioGenerationParams) {
  await new Promise((resolve) => setTimeout(resolve, 1000));

  return {
    id: `mock_audio_${Date.now()}`,
    audio_url: null,
    status: "completed",
    text: params.text,
  };
}

// ============================================
// Music Providers
// ============================================

export async function callMusicProvider(
  provider: ApiProvider,
  params: MusicGenerationParams
) {
  if (!provider.api_key_encrypted) {
    throw new Error(`Provider ${provider.name} has no API key`);
  }

  const apiKey = decryptApiKey(provider.api_key_encrypted);

  switch (provider.slug) {
    case "suno":
      return callSuno(apiKey, params, provider);
    case "udio":
      return callUdio(apiKey, params, provider);
    case "music-mock":
      return callMusicMock(params);
    default:
      throw new Error(`Unknown music provider: ${provider.slug}`);
  }
}

async function callSuno(
  apiKey: string,
  params: MusicGenerationParams,
  provider: ApiProvider
) {
  const response = await fetch(`${provider.api_url}/api/v1/music/generate`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      prompt: params.prompt,
      duration: params.duration || 30,
      style: params.style,
      ...params,
    }),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: "Unknown error" }));
    throw new Error(`Suno API error: ${error.message || response.statusText}`);
  }

  return response.json();
}

async function callUdio(
  apiKey: string,
  params: MusicGenerationParams,
  provider: ApiProvider
) {
  const response = await fetch(`${provider.api_url}/v1/music/generate`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      prompt: params.prompt,
      duration: params.duration || 30,
      ...params,
    }),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: "Unknown error" }));
    throw new Error(`Udio API error: ${error.message || response.statusText}`);
  }

  return response.json();
}

async function callMusicMock(params: MusicGenerationParams) {
  await new Promise((resolve) => setTimeout(resolve, 3000));

  return {
    id: `mock_music_${Date.now()}`,
    music_url: null,
    status: "completed",
    prompt: params.prompt,
  };
}

// ============================================
// LLM Providers
// ============================================

export async function callLLMProvider(
  provider: ApiProvider,
  params: LLMGenerationParams
) {
  if (!provider.api_key_encrypted) {
    throw new Error(`Provider ${provider.name} has no API key`);
  }

  const apiKey = decryptApiKey(provider.api_key_encrypted);

  // Aceptar múltiples slugs para OpenAI
  const slug = provider.slug?.toLowerCase() || '';
  if (slug === "openai-gpt4" || slug === "openai" || slug === "chatgpt" || slug.includes("openai") || slug.includes("gpt")) {
    return callOpenAIGPT4(apiKey, params, provider);
  }
  
  if (slug === "claude" || slug.includes("claude")) {
    return callClaude(apiKey, params, provider);
  }
  
  if (slug === "llm-mock" || slug.includes("mock")) {
    return callLLMMock(params);
  }
  
  throw new Error(`Unknown LLM provider: ${provider.slug}. Supported: openai, chatgpt, claude`);
}

async function callOpenAIGPT4(
  apiKey: string,
  params: LLMGenerationParams,
  provider: ApiProvider
) {
  // Usar el api_url del provider o el default de OpenAI
  const apiUrl = provider.api_url || "https://api.openai.com/v1/chat/completions";
  
  // Preparar el body sin duplicar campos
  const requestBody: any = {
      model: params.model || (provider.config as any)?.model || "gpt-4-turbo-preview",
      messages: params.messages,
      temperature: params.temperature ?? 0.7,
      max_tokens: params.maxTokens || 4000,
    };
    
    // Añadir otros parámetros opcionales solo si existen
    if (params.topP !== undefined) requestBody.top_p = params.topP;
    if (params.frequencyPenalty !== undefined) requestBody.frequency_penalty = params.frequencyPenalty;
    if (params.presencePenalty !== undefined) requestBody.presence_penalty = params.presencePenalty;
  
  console.log(`[OpenAI] Calling ${apiUrl} with model: ${requestBody.model}`);
  console.log(`[OpenAI] Messages count: ${requestBody.messages.length}`);
  
  const response = await fetch(apiUrl, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(requestBody),
  });

  if (!response.ok) {
    const errorText = await response.text();
    let errorMessage = `OpenAI API error: ${response.status} ${response.statusText}`;
    try {
      const error = JSON.parse(errorText);
      errorMessage = `OpenAI API error: ${error.error?.message || error.message || response.statusText}`;
      console.error('[OpenAI] Error response:', error);
    } catch (e) {
      errorMessage = `OpenAI API error: ${errorText || response.statusText}`;
      console.error('[OpenAI] Error text:', errorText);
    }
    throw new Error(errorMessage);
  }

  const data = await response.json();
  console.log(`[OpenAI] Success. Response has ${data.choices?.length || 0} choices`);
  return {
    content: data.choices[0]?.message?.content || "",
    usage: data.usage,
  };
}

async function callClaude(
  apiKey: string,
  params: LLMGenerationParams,
  provider: ApiProvider
) {
  const response = await fetch(`${provider.api_url}`, {
    method: "POST",
    headers: {
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: params.model || "claude-3-opus-20240229",
      messages: params.messages,
      max_tokens: params.maxTokens || 4096,
      ...params,
    }),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: "Unknown error" }));
    throw new Error(`Claude API error: ${error.message || response.statusText}`);
  }

  const data = await response.json();
  return {
    content: data.content[0]?.text || "",
    usage: data.usage,
  };
}

async function callLLMMock(params: LLMGenerationParams) {
  await new Promise((resolve) => setTimeout(resolve, 2000));

  return {
    content: `[Mock LLM Response] This is a mock response for: ${params.messages[params.messages.length - 1]?.content || ""}`,
    usage: {
      prompt_tokens: 10,
      completion_tokens: 20,
      total_tokens: 30,
    },
  };
}
