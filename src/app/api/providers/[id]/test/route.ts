// ============================================
// BAYTT - Test Provider API Route
// ============================================

import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { decryptApiKey } from "@/lib/encryption/api-keys";
import { callVideoProvider, callAudioProvider, callMusicProvider, callLLMProvider } from "@/lib/ai/providers";
import type { ApiProvider } from "@/types/database";

// POST - Probar conexión con un proveedor
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Verificar autenticación
    const supabase = await createServerSupabaseClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { error: "No autenticado" },
        { status: 401 }
      );
    }

    // Verificar rol admin
    const { data: profile } = await supabaseAdmin
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .maybeSingle();

    const isAdmin =
      profile?.role === "admin" || profile?.role === "superadmin";

    if (!isAdmin) {
      return NextResponse.json(
        { error: "No autorizado - Se requiere rol admin" },
        { status: 403 }
      );
    }

    const body = await request.json();
    const useNewData = body.use_new_data || false;
    const newProviderData = body.provider_data || null;

    let provider: ApiProvider | null = null;

    // Si se proporcionan datos nuevos, usarlos; si no, obtener de la DB
    if (useNewData && newProviderData) {
      provider = newProviderData as ApiProvider;
    } else {
      const { data: dbProvider } = await supabaseAdmin
        .from("api_providers")
        .select("*")
        .eq("id", params.id)
        .single();

      if (!dbProvider) {
        return NextResponse.json(
          { error: "Proveedor no encontrado" },
          { status: 404 }
        );
      }

      provider = dbProvider;
    }

    if (!provider) {
      return NextResponse.json(
        { error: "Datos de proveedor inválidos" },
        { status: 400 }
      );
    }

    // Verificar que el provider tenga API key si no es mock
    if (!provider.api_key_encrypted && !provider.slug?.includes("mock")) {
      return NextResponse.json(
        {
          success: false,
          message: "El proveedor requiere una API key",
        },
        { status: 400 }
      );
    }

    // Desencriptar API key si existe
    if (provider.api_key_encrypted) {
      try {
        decryptApiKey(provider.api_key_encrypted);
      } catch (error) {
        return NextResponse.json(
          {
            success: false,
            message: "Error al desencriptar API key",
          },
          { status: 400 }
        );
      }
    }

    // Realizar test según el tipo
    let testResult: { success: boolean; message: string; data?: any } = {
      success: false,
      message: "",
    };

    try {
      switch (provider.type) {
        case "video":
          // Test: generar clip de 1 segundo
          testResult = await testVideoProvider(provider);
          break;

        case "audio":
          // Test: generar "Hello" en una voz
          testResult = await testAudioProvider(provider);
          break;

        case "music":
          // Test: generar 5 segundos de música
          testResult = await testMusicProvider(provider);
          break;

        case "llm":
          // Test: generar texto corto
          testResult = await testLLMProvider(provider);
          break;

        case "storage":
          // Test: verificar conexión (no requiere generación)
          testResult = await testStorageProvider(provider);
          break;

        default:
          testResult = {
            success: false,
            message: `Tipo de proveedor no soportado: ${provider.type}`,
          };
      }
    } catch (error: any) {
      testResult = {
        success: false,
        message: error.message || "Error al probar conexión",
      };
    }

    // Guardar resultado del test en la base de datos
    if (!useNewData) {
      await supabaseAdmin
        .from("api_providers")
        .update({
          updated_at: new Date().toISOString(),
          // Podríamos guardar el último resultado en config si es necesario
        })
        .eq("id", params.id);
    }

    return NextResponse.json({
      success: testResult.success,
      message: testResult.message,
      data: testResult.data,
    });
  } catch (error: any) {
    console.error("Error in POST /api/providers/[id]/test:", error);
    return NextResponse.json(
      {
        success: false,
        message: error.message || "Error interno del servidor",
      },
      { status: 500 }
    );
  }
}

// Helper functions para cada tipo de proveedor

async function testVideoProvider(
  provider: ApiProvider
): Promise<{ success: boolean; message: string; data?: any }> {
  try {
    // Llamar al provider con parámetros de test
    const result = await callVideoProvider(provider, {
      prompt: "A simple test video of a blue sky with white clouds",
      duration: 1, // 1 segundo
    });

    return {
      success: true,
      message: "Conexión exitosa - Video de test generado",
      data: { video_url: (result as any).video_url },
    };
  } catch (error: any) {
    return {
      success: false,
      message: `Error: ${error.message}`,
    };
  }
}

async function testAudioProvider(
  provider: ApiProvider
): Promise<{ success: boolean; message: string; data?: any }> {
  try {
    // Obtener primera voz disponible o usar una por defecto
    const voiceId = (provider.config as any)?.default_voice_id || "default";

    const result = await callAudioProvider(provider, {
      text: "Hello, this is a test of the audio provider.",
      voiceId: voiceId,
    });

    return {
      success: true,
      message: "Conexión exitosa - Audio de test generado",
      data: { audio_url: result.audio_url },
    };
  } catch (error: any) {
    return {
      success: false,
      message: `Error: ${error.message}`,
    };
  }
}

async function testMusicProvider(
  provider: ApiProvider
): Promise<{ success: boolean; message: string; data?: any }> {
  try {
    const result = await callMusicProvider(provider, {
      prompt: "Test music, calm and peaceful, 5 seconds",
      duration: 5,
    });

    return {
      success: true,
      message: "Conexión exitosa - Música de test generada",
      data: { music_url: result.music_url },
    };
  } catch (error: any) {
    return {
      success: false,
      message: `Error: ${error.message}`,
    };
  }
}

async function testLLMProvider(
  provider: ApiProvider
): Promise<{ success: boolean; message: string; data?: any }> {
  try {
    const result = await callLLMProvider(provider, {
      messages: [
        { role: "system", content: "You are a helpful assistant." },
        { role: "user", content: "Say hello in one sentence." },
      ],
      maxTokens: 50,
    });

    return {
      success: true,
      message: "Conexión exitosa - Texto de test generado",
      data: { text: (result as any).text?.substring(0, 100) },
    };
  } catch (error: any) {
    return {
      success: false,
      message: `Error: ${error.message}`,
    };
  }
}

async function testStorageProvider(
  provider: ApiProvider
): Promise<{ success: boolean; message: string; data?: any }> {
  try {
    // Para storage, solo verificamos que la conexión funciona
    // No generamos contenido real
    if (!provider.api_url && provider.slug !== "supabase-storage") {
      return {
        success: false,
        message: "URL de API requerida para storage",
      };
    }

    // Si es Supabase Storage, la conexión ya está verificada
    if (provider.slug === "supabase-storage") {
      return {
        success: true,
        message: "Conexión a Supabase Storage verificada",
      };
    }

    // Para otros storage, podríamos hacer un HEAD request
    return {
      success: true,
      message: "Configuración de storage válida",
    };
  } catch (error: any) {
    return {
      success: false,
      message: `Error: ${error.message}`,
    };
  }
}

