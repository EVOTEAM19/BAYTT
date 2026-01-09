import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getAIConfig } from "@/lib/ai/config";
import { callLLMProvider } from "@/lib/ai/providers";

export async function POST(request: NextRequest) {
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

    const body = await request.json();
    const { category, gender, age_range } = body;

    const config = await getAIConfig();

    // Generar características con LLM
    const systemPrompt = `Eres un experto en creación de personajes cinematográficos. Genera características detalladas y realistas para un personaje.

Categoría: ${category}
Género: ${gender}
Rango de edad: ${age_range}

Genera un JSON con:
- name: nombre del personaje
- physical: objeto con características físicas detalladas (exact_age, height_cm, weight_kg, body_type, build, face_shape, skin_tone, eye_color, eye_shape, eyebrows, hair_color, hair_style, hair_length, hair_texture, facial_hair, nose_shape, lips, jawline, cheekbones)
- personality: objeto con primary_traits, secondary_traits, flaws
- wardrobe: objeto con default_outfit, casual_outfit, formal_outfit

Sé específico y detallado.`;

    const userPrompt = `Genera características completas para un personaje ${category} de género ${gender} en rango de edad ${age_range}.`;

    let traits;
    if (config.mockMode || !config.llmProvider) {
      // Mock response
      traits = {
        name: `Personaje ${category}`,
        physical: {
          exact_age: age_range === "teen" ? 16 : age_range === "young_adult" ? 22 : age_range === "adult" ? 35 : 60,
          height_cm: gender === "male" ? 180 : 165,
          weight_kg: gender === "male" ? 75 : 60,
          body_type: "average",
          build: "Proporcionado",
          face_shape: "oval",
          skin_tone: "Tono medio",
          eye_color: "Marrón oscuro",
          eye_shape: "almond",
          eyebrows: "Definidas",
          hair_color: "Castaño",
          hair_style: "Natural",
          hair_length: "medium",
          hair_texture: "Liso",
          nose_shape: "Recta",
          lips: "Medianos",
          jawline: "Definida",
          cheekbones: "Moderados",
        },
        personality: {
          primary_traits: ["determinado", "inteligente"],
          secondary_traits: ["curioso"],
          flaws: ["terco"],
        },
        wardrobe: {
          default_outfit: "Ropa casual moderna",
        },
      };
    } else {
      // Real LLM call
      const response = await callLLMProvider(config.llmProvider, {
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        temperature: 0.8,
      });

      try {
        // La respuesta puede ser un string o un objeto con content
        const content = typeof response === "string" ? response : response.content || JSON.stringify(response);
        traits = JSON.parse(content);
      } catch {
        // Si no es JSON válido, usar valores por defecto
        traits = {
          name: `Personaje ${category}`,
          physical: {
            exact_age: age_range === "teen" ? 16 : age_range === "young_adult" ? 22 : age_range === "adult" ? 35 : 60,
            height_cm: gender === "male" ? 180 : 165,
            weight_kg: gender === "male" ? 75 : 60,
            body_type: "average",
          },
          personality: {
            primary_traits: [],
            secondary_traits: [],
            flaws: [],
          },
          wardrobe: {
            default_outfit: "",
          },
        };
      }
    }

    return NextResponse.json(traits);
  } catch (error: any) {
    console.error("Error generating traits:", error);
    return NextResponse.json(
      { error: error.message || "Failed to generate traits" },
      { status: 500 }
    );
  }
}

