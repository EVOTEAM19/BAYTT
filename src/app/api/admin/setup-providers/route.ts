// ============================================
// Endpoint temporal para configurar proveedores
// ============================================

import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { encryptApiKey } from "@/lib/encryption/api-keys";

export async function POST(request: NextRequest) {
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

    // Verificar rol superadmin
    const { data: profile } = await supabaseAdmin
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .maybeSingle();

    if (profile?.role !== "superadmin") {
      return NextResponse.json(
        { error: "No autorizado - Se requiere rol superadmin" },
        { status: 403 }
      );
    }

    // Proveedores a configurar
    const providers = [
      {
        type: 'video' as const,
        name: 'Runway Gen-3 Alpha Turbo',
        slug: 'runway',
        api_url: 'https://api.runwayml.com/v1/generate',
        auth_method: 'bearer' as const,
        api_key: process.env.RUNWAY_API_KEY || '',
        config: {
          model: 'gen3a_turbo',
          resolution: '1280x768',
          duration: 10,
          seed: null,
          watermark: false
        },
        is_active: true,
        is_default: true,
        priority: 0,
        cost_per_second: 0.05,
        cost_per_request: 0,
      },
      {
        type: 'llm' as const,
        name: 'OpenAI GPT-4 Turbo',
        slug: 'openai',
        api_url: 'https://api.openai.com/v1/chat/completions',
        auth_method: 'bearer' as const,
        api_key: process.env.OPENAI_API_KEY || '',
        config: {
          model: 'gpt-4-turbo-preview',
          temperature: 0.8,
          max_tokens: 4096,
          top_p: 1,
          frequency_penalty: 0,
          presence_penalty: 0
        },
        is_active: true,
        is_default: true,
        priority: 0,
        cost_per_second: 0,
        cost_per_request: 0.01,
      },
      {
        type: 'audio' as const,
        name: 'ElevenLabs',
        slug: 'elevenlabs',
        api_url: 'https://api.elevenlabs.io/v1/text-to-speech',
        auth_method: 'api_key' as const,
        api_key: process.env.ELEVENLABS_API_KEY || '',
        config: {
          model_id: 'eleven_multilingual_v2',
          voice_settings: {
            stability: 0.5,
            similarity_boost: 0.75,
            style: 0.5,
            use_speaker_boost: true
          },
          output_format: 'mp3_44100_128'
        },
        is_active: true,
        is_default: true,
        priority: 0,
        cost_per_second: 0,
        cost_per_request: 0.0003,
      },
      {
        type: 'lip_sync' as const,
        name: 'Sync Labs',
        slug: 'sync_labs',
        api_url: 'https://api.sync.so/v2/generate',
        auth_method: 'api_key' as const,
        api_key: process.env.SYNC_LABS_API_KEY || '',
        config: {
          model: 'sync-1.6.0',
          output_format: 'mp4',
          active_speaker: true
        },
        is_active: true,
        is_default: false,
        priority: 1,
        cost_per_second: null,
        cost_per_request: 0.10,
      }
    ];

    const results = [];

    for (const provider of providers) {
      try {
        // Verificar si ya existe
        const { data: existing } = await supabaseAdmin
          .from('api_providers')
          .select('id, name')
          .eq('slug', provider.slug)
          .maybeSingle();

        const providerData: any = {
          type: provider.type,
          name: provider.name,
          slug: provider.slug,
          api_url: provider.api_url,
          auth_method: provider.auth_method,
          config: provider.config,
          is_active: provider.is_active,
          is_default: provider.is_default,
          priority: provider.priority,
          cost_per_second: provider.cost_per_second,
          cost_per_request: provider.cost_per_request,
          total_requests: 0,
          total_cost: 0,
          api_key_encrypted: encryptApiKey(provider.api_key),
        };

        if (existing) {
          // Actualizar existente
          const { data, error } = await supabaseAdmin
            .from('api_providers')
            .update(providerData)
            .eq('slug', provider.slug)
            .select()
            .single();

          if (error) {
            results.push({
              provider: provider.name,
              status: 'error',
              message: error.message
            });
          } else {
            results.push({
              provider: provider.name,
              status: 'updated',
              message: 'Actualizado correctamente'
            });
          }
        } else {
          // Insertar nuevo
          const { data, error } = await supabaseAdmin
            .from('api_providers')
            .insert(providerData)
            .select()
            .single();

          if (error) {
            results.push({
              provider: provider.name,
              status: 'error',
              message: error.message
            });
          } else {
            results.push({
              provider: provider.name,
              status: 'created',
              message: 'Creado correctamente'
            });
          }
        }
      } catch (error: any) {
        results.push({
          provider: provider.name,
          status: 'error',
          message: error.message
        });
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Proveedores configurados',
      results
    }, { status: 200 });

  } catch (error: any) {
    console.error("Error setting up providers:", error);
    return NextResponse.json(
      { error: "Error al configurar proveedores", message: error.message },
      { status: 500 }
    );
  }
}
