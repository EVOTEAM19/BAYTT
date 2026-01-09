import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getAIConfig, getProviderWithKey } from "@/lib/ai/config";
import { decryptApiKey } from "@/lib/encryption/api-keys";

function getMockVoices(gender: string | null) {
  const allVoices = [
    {
      voice_id: "mock_1",
      name: "Carlos (Español)",
      category: "generated",
      preview_url: "",
      labels: {
        gender: "male",
        age: "adult",
        accent: "Spanish",
        description: "Grave y profesional",
      },
    },
    {
      voice_id: "mock_2",
      name: "Miguel (Latino)",
      category: "generated",
      preview_url: "",
      labels: {
        gender: "male",
        age: "young",
        accent: "Latin",
        description: "Energético y juvenil",
      },
    },
    {
      voice_id: "mock_3",
      name: "Antonio (Maduro)",
      category: "generated",
      preview_url: "",
      labels: {
        gender: "male",
        age: "senior",
        accent: "Spanish",
        description: "Sabio y calmado",
      },
    },
    {
      voice_id: "mock_4",
      name: "María (Español)",
      category: "generated",
      preview_url: "",
      labels: {
        gender: "female",
        age: "adult",
        accent: "Spanish",
        description: "Clara y elegante",
      },
    },
    {
      voice_id: "mock_5",
      name: "Lucía (Joven)",
      category: "generated",
      preview_url: "",
      labels: {
        gender: "female",
        age: "young",
        accent: "Spanish",
        description: "Dulce y expresiva",
      },
    },
    {
      voice_id: "mock_6",
      name: "Carmen (Madura)",
      category: "generated",
      preview_url: "",
      labels: {
        gender: "female",
        age: "senior",
        accent: "Spanish",
        description: "Cálida y maternal",
      },
    },
  ];

  if (gender) {
    return allVoices.filter((v) => v.labels.gender === gender);
  }
  return allVoices;
}

export async function GET(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Verificar que sea admin
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    if (profile?.role !== "admin" && profile?.role !== "superadmin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const gender = searchParams.get("gender");

    const config = await getAIConfig();

    // Mock mode
    if (config.mockMode || !config.audioProvider) {
      const mockVoices = getMockVoices(gender);
      return NextResponse.json({
        voices: mockVoices.map((v: any) => ({
          ...v,
          provider_id: config.audioProvider?.id || "mock",
        })),
      });
    }

    // Obtener provider de audio
    const provider = config.audioProvider;

    if (provider.slug === "elevenlabs") {
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

      // Filtrar por género si se especifica
      let filteredVoices = data.voices || [];
      if (gender) {
        filteredVoices = filteredVoices.filter(
          (v: any) =>
            v.labels?.gender?.toLowerCase() === gender.toLowerCase()
        );
      }

      return NextResponse.json({
        voices: filteredVoices.map((v: any) => ({
          voice_id: v.voice_id,
          name: v.name,
          category: v.category,
          description: v.description,
          preview_url: v.preview_url,
          labels: v.labels,
          provider_id: provider.id,
        })),
      });
    }

    return NextResponse.json({ voices: [] });
  } catch (error: any) {
    console.error("Error fetching voices:", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch voices" },
      { status: 500 }
    );
  }
}

