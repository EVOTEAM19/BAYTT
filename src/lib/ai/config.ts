// ============================================
// BAYTT - AI Configuration
// ============================================

import { supabaseAdmin } from "@/lib/supabase/admin";
import { decryptApiKey } from "@/lib/encryption/api-keys";
import type { ApiProvider } from "@/types/database";

// ============================================
// Types
// ============================================

export interface AIConfig {
  mockMode: boolean;
  videoProvider: ApiProvider | null;
  audioProvider: ApiProvider | null;
  musicProvider: ApiProvider | null;
  llmProvider: ApiProvider | null;
  imageProvider: ApiProvider | null;
  loraTrainingProvider: ApiProvider | null;
}

interface ProviderConfig {
  primary_id: string | null;
  fallback_id: string | null;
  mock_mode: boolean;
}

// ============================================
// Functions
// ============================================

/**
 * Obtiene la configuración de IA desde admin_config
 */
export async function getAIConfig(): Promise<AIConfig> {
  // Obtener configuraciones de admin_config
  const { data: configs, error } = await supabaseAdmin
    .from("admin_config")
    .select("key, value")
    .in("key", [
      "mock_mode",
      "global_mock_mode",
      "video_config",
      "audio_config",
      "music_config",
      "llm_config",
      "image_config",
      "lora_training_config",
      "lip_sync_config",
    ]);

  if (error) {
    console.error("Error fetching AI config:", error);
    // Retornar config por defecto con mock mode
    return {
      mockMode: true,
      videoProvider: null,
      audioProvider: null,
      musicProvider: null,
      llmProvider: null,
      imageProvider: null,
      loraTrainingProvider: null,
    };
  }

  // Obtener providers activos por tipo con su mock_mode individual
  const videoConfig = configs?.find(
    (c) => c.key === "video_config"
  )?.value as ProviderConfig | undefined;
  const audioConfig = configs?.find(
    (c) => c.key === "audio_config"
  )?.value as ProviderConfig | undefined;
  const musicConfig = configs?.find(
    (c) => c.key === "music_config"
  )?.value as ProviderConfig | undefined;
  const llmConfig = configs?.find(
    (c) => c.key === "llm_config"
  )?.value as ProviderConfig | undefined;
  const imageConfig = configs?.find(
    (c) => c.key === "image_config"
  )?.value as ProviderConfig | undefined;
  const loraTrainingConfig = configs?.find(
    (c) => c.key === "lora_training_config"
  )?.value as ProviderConfig | undefined;

  // Obtener providers solo si su mock_mode no está activo
  // Si mock_mode es false o no existe, buscar el proveedor real
  const [
    videoProvider,
    audioProvider,
    musicProvider,
    llmProvider,
    imageProvider,
    loraTrainingProvider,
  ] = await Promise.all([
    videoConfig?.mock_mode === true ? null : getProviderById(videoConfig?.primary_id || null, "video"),
    audioConfig?.mock_mode === true ? null : getProviderById(audioConfig?.primary_id || null, "audio"),
    musicConfig?.mock_mode === true ? null : getProviderById(musicConfig?.primary_id || null, "music"),
    llmConfig?.mock_mode === true ? null : getProviderById(llmConfig?.primary_id || null, "llm"),
    imageConfig?.mock_mode === true ? null : getProviderById(imageConfig?.primary_id || null, "image"),
    loraTrainingConfig?.mock_mode === true ? null : getProviderById(loraTrainingConfig?.primary_id || null, "lora_training"),
  ]);

  // Determinar si el mock mode global está activo
  // PRIMERO verificar si hay un global_mock_mode configurado
  const globalMockConfigRaw = configs?.find((c) => c.key === "global_mock_mode")?.value ?? 
                               configs?.find((c) => c.key === "mock_mode")?.value;
  
  // Manejar diferentes formatos: boolean directo o {enabled: boolean}
  let globalMockConfig: boolean | undefined = undefined;
  if (globalMockConfigRaw !== undefined && globalMockConfigRaw !== null) {
    if (typeof globalMockConfigRaw === 'boolean') {
      globalMockConfig = globalMockConfigRaw;
    } else if (typeof globalMockConfigRaw === 'object' && 'enabled' in globalMockConfigRaw) {
      globalMockConfig = (globalMockConfigRaw as any).enabled === true;
    } else {
      globalMockConfig = globalMockConfigRaw === true;
    }
  }
  
  let allMock = false;
  if (globalMockConfig !== undefined) {
    allMock = globalMockConfig === true;
    console.log(`[AICONFIG] Global mock mode from config: ${allMock}`);
  } else {
    // Fallback: verificar si todos los tipos están en mock individual
    allMock = [
      videoConfig?.mock_mode === true,
      audioConfig?.mock_mode === true,
      musicConfig?.mock_mode === true,
      llmConfig?.mock_mode === true,
      imageConfig?.mock_mode === true,
      loraTrainingConfig?.mock_mode === true,
    ].every(Boolean);
    console.log(`[AICONFIG] Calculated mock mode from individual configs: ${allMock}`);
  }

  // Si el mock mode global está activo, retornar null para todos los providers
  const result: AIConfig = {
    mockMode: allMock,
    videoProvider: allMock ? null : videoProvider,
    audioProvider: allMock ? null : audioProvider,
    musicProvider: allMock ? null : musicProvider,
    llmProvider: allMock ? null : llmProvider,
    imageProvider: allMock ? null : imageProvider,
    loraTrainingProvider: allMock ? null : loraTrainingProvider,
  };
  
  console.log(`[AICONFIG] Final config:`, {
    mockMode: result.mockMode,
    hasLLM: !!result.llmProvider,
    hasImage: !!result.imageProvider,
    hasVideo: !!result.videoProvider,
    hasAudio: !!result.audioProvider,
  });

  return result;
}

/**
 * Obtiene un provider por ID o busca el default activo por tipo
 */
async function getProviderById(
  providerId: string | null,
  type: "video" | "audio" | "music" | "llm" | "storage" | "image" | "lora_training" | "lip_sync"
): Promise<ApiProvider | null> {
  // Si se proporciona un ID específico, intentar obtener ese proveedor
  if (providerId) {
    const { data, error } = await supabaseAdmin
      .from("api_providers")
      .select("*")
      .eq("id", providerId)
      .eq("is_active", true)
      .single();

    if (!error && data) {
      // Verificar que el tipo coincida
      if (data.type === type) {
        return data;
      } else {
        console.warn(`Provider ${providerId} type mismatch: expected ${type}, got ${data.type}`);
      }
    } else {
      console.warn(`Provider ${providerId} not found or inactive, searching for default ${type} provider`);
    }
  }

  // Buscar provider default activo por tipo (no mock)
  // Primero intentar con is_default = true
  let { data, error } = await supabaseAdmin
    .from("api_providers")
    .select("*")
    .eq("type", type)
    .eq("is_active", true)
    .neq("slug", "mock_" + type) // Excluir proveedores mock
    .eq("is_default", true)
    .order("priority", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (error || !data) {
    // Si no hay default, buscar cualquier activo que no sea mock
    const { data: fallbackData, error: fallbackError } = await supabaseAdmin
      .from("api_providers")
      .select("*")
      .eq("type", type)
      .eq("is_active", true)
      .neq("slug", "mock_" + type) // Excluir proveedores mock
      .order("priority", { ascending: true })
      .limit(1)
      .maybeSingle();

    if (!fallbackError && fallbackData) {
      return fallbackData;
    }

    console.error(`Error fetching ${type} provider:`, error || fallbackError);
    return null;
  }

  return data;
}

/**
 * Obtiene un provider con su API key desencriptada
 */
export async function getProviderWithKey(
  providerId: string
): Promise<(ApiProvider & { apiKey: string }) | null> {
  const { data: provider, error } = await supabaseAdmin
    .from("api_providers")
    .select("*")
    .eq("id", providerId)
    .single();

  if (error || !provider) {
    console.error(`Error fetching provider ${providerId}:`, error);
    return null;
  }

  if (!provider.api_key_encrypted) {
    return { ...provider, apiKey: "" };
  }

  try {
    const apiKey = decryptApiKey(provider.api_key_encrypted);
    return { ...provider, apiKey };
  } catch (error) {
    console.error(`Error decrypting API key for provider ${providerId}:`, error);
    return null;
  }
}
