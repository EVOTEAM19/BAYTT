import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { getAIConfig, getProviderWithKey } from "@/lib/ai/config";

// GET - Obtener voces de un proveedor específico
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    const resolvedParams = params instanceof Promise ? await params : params;
    const providerId = resolvedParams.id;

    const supabase = await createServerSupabaseClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Obtener proveedor
    const { data: provider, error: providerError } = await supabaseAdmin
      .from("api_providers")
      .select("*")
      .eq("id", providerId)
      .eq("type", "audio")
      .single();

    if (providerError || !provider) {
      return NextResponse.json(
        { error: "Provider not found" },
        { status: 404 }
      );
    }

    const config = await getAIConfig();

    // Mock mode
    if (config.mockMode) {
      const mockVoices = [
        {
          id: "voice1",
          name: "Voz Masculina 1",
          category: "male",
          preview_url: "",
        },
        {
          id: "voice2",
          name: "Voz Femenina 1",
          category: "female",
          preview_url: "",
        },
        {
          id: "voice3",
          name: "Voz Neutra 1",
          category: "neutral",
          preview_url: "",
        },
      ];
      return NextResponse.json({
        voices: mockVoices.map((v: any) => ({
          ...v,
          provider_id: provider.id,
        })),
      });
    }

    // Si es ElevenLabs
    if (provider.slug === "elevenlabs" || provider.slug?.includes("eleven")) {
      const providerWithKey = await getProviderWithKey(provider.id);
      if (!providerWithKey || !providerWithKey.apiKey) {
        return NextResponse.json(
          { error: "Failed to get provider API key" },
          { status: 500 }
        );
      }

      const apiKey = providerWithKey.apiKey;
      const response = await fetch("https://api.elevenlabs.io/v1/voices", {
        headers: { "xi-api-key": apiKey },
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({
          message: "Unknown error",
        }));
        console.error("ElevenLabs API error:", error);
        return NextResponse.json(
          {
            error: `ElevenLabs API error: ${error.message || response.statusText}`,
          },
          { status: response.status }
        );
      }

      const data = await response.json();

      return NextResponse.json({
        voices: (data.voices || []).map((v: any) => ({
          id: v.voice_id,
          name: v.name,
          category: v.category,
          description: v.description,
          preview_url: v.preview_url,
          labels: v.labels,
          provider_id: provider.id,
        })),
      });
    }

    // Para otros proveedores, retornar array vacío
    return NextResponse.json({ voices: [] });
  } catch (error: any) {
    console.error("Error fetching voices:", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch voices" },
      { status: 500 }
    );
  }
}
