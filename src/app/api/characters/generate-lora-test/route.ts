import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { getAIConfig, getProviderWithKey } from "@/lib/ai/config";

/**
 * Genera una imagen de prueba usando un LoRA entrenado
 */
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
    const { lora_model_url, trigger_word, character_name, character_id, physical_traits, wardrobe, visual_prompt_base } = body;

    if (!lora_model_url || !trigger_word) {
      return NextResponse.json(
        { error: "lora_model_url y trigger_word son requeridos" },
        { status: 400 }
      );
    }

    // Obtener información completa del personaje desde la BD si tenemos character_id
    let character: any = null;
    let physicalTraits: any = physical_traits || {}; // Usar los que vienen del body primero
    let wardrobeData: any = wardrobe || {}; // Usar los que vienen del body primero
    let visualPromptBase: string = visual_prompt_base || ""; // Usar el que viene del body primero

    if (character_id) {
      const { data: charData } = await supabaseAdmin
        .from("characters")
        .select("*")
        .eq("id", character_id)
        .single();

      if (charData) {
        character = charData;
        // Extraer metadata del description si no tenemos datos del body
        if (!physical_traits && charData.description) {
          const metadataMatch = charData.description.match(/<!-- METADATA: ({.*?}) -->/);
          if (metadataMatch) {
            try {
              const metadata = JSON.parse(metadataMatch[1]);
              physicalTraits = metadata.physical_traits || {};
              wardrobeData = metadata.wardrobe || {};
            } catch (e) {
              console.error("[GENERATE LORA TEST] Error parsing metadata:", e);
            }
          }
        }
        // Usar visual_prompt_base de la BD si no viene en el body
        if (!visual_prompt_base && charData.visual_prompt_base) {
          visualPromptBase = charData.visual_prompt_base;
        }
        // Asegurar que gender esté incluido en physicalTraits (necesario para buildPhotorealisticPrompt)
        if (!physicalTraits.gender && charData.gender) {
          physicalTraits.gender = charData.gender;
        }
      }
    }

    console.log("[GENERATE LORA TEST] Using character data:", {
      hasPhysicalTraits: Object.keys(physicalTraits).length > 0,
      hasWardrobe: Object.keys(wardrobeData).length > 0,
      hasVisualPrompt: !!visualPromptBase,
      physicalTraitsKeys: Object.keys(physicalTraits),
      wardrobeKeys: Object.keys(wardrobeData),
      gender: physicalTraits.gender || character?.gender,
      exact_age: physicalTraits.exact_age,
      height_cm: physicalTraits.height_cm,
      weight_kg: physicalTraits.weight_kg,
      skin_tone: physicalTraits.skin_tone,
      face_shape: physicalTraits.face_shape,
      hair_color: physicalTraits.hair_color,
      default_outfit: wardrobeData?.default_outfit,
    });

    const config = await getAIConfig();

    // Mock mode
    if (config.mockMode) {
      return NextResponse.json({
        image_urls: [
          "https://via.placeholder.com/1024x1024?text=LoRA+Test+Image+1",
          "https://via.placeholder.com/1024x1024?text=LoRA+Test+Image+2",
          "https://via.placeholder.com/1024x1024?text=LoRA+Test+Image+3",
        ],
      });
    }

    // Obtener proveedor de imagen
    const imageProvider = config.imageProvider;
    if (!imageProvider) {
      return NextResponse.json(
        { error: "No image provider configured" },
        { status: 400 }
      );
    }

    const providerWithKey = await getProviderWithKey(imageProvider.id);
    if (!providerWithKey || !providerWithKey.apiKey) {
      return NextResponse.json(
        { error: "Failed to get provider API key" },
        { status: 500 }
      );
    }

    // Importar función para construir prompts realistas
    const { buildPhotorealisticPrompt } = await import("@/lib/ai/prompt-builder");

    // Construir prompts completos usando todas las características del personaje
    const prompts: string[] = [];
    
    if (Object.keys(physicalTraits).length > 0) {
      // Usar buildPhotorealisticPrompt para crear prompts completos
      const prompt1 = buildPhotorealisticPrompt(
        physicalTraits as any,
        wardrobeData,
        "portrait",
        "neutral"
      );
      const prompt2 = buildPhotorealisticPrompt(
        physicalTraits as any,
        wardrobeData,
        "three_quarter",
        "happy"
      );
      const prompt3 = buildPhotorealisticPrompt(
        physicalTraits as any,
        wardrobeData,
        "profile",
        "serious"
      );

      // Combinar trigger_word con el prompt completo
      // El trigger_word debe ir al inicio para activar el LoRA
      // Luego el prompt completo con todas las características
      const basePrompt = visualPromptBase 
        ? `${visualPromptBase}. `
        : '';

      prompts.push(`${trigger_word}, ${basePrompt}${prompt1.prompt}`);
      prompts.push(`${trigger_word}, ${basePrompt}${prompt2.prompt}`);
      prompts.push(`${trigger_word}, ${basePrompt}${prompt3.prompt}`);
    } else {
      // Fallback si no hay características físicas
      prompts.push(
        `a professional portrait photo of ${trigger_word}, high quality, detailed, photorealistic, 8k, front view${visualPromptBase ? `. ${visualPromptBase}` : ""}`,
        `a professional portrait photo of ${trigger_word}, smiling, high quality, detailed, photorealistic, 8k, three-quarter view${visualPromptBase ? `. ${visualPromptBase}` : ""}`,
        `a professional portrait photo of ${trigger_word}, serious expression, high quality, detailed, photorealistic, 8k, side profile${visualPromptBase ? `. ${visualPromptBase}` : ""}`
      );
    }
    
    // Para FAL.AI con LoRA, necesitamos usar el endpoint correcto
    // FAL.AI permite usar LoRA con el formato: prompt con trigger_word y lora_url
    let imageUrls: string[] = [];

    if (imageProvider.slug === "fal_flux" || imageProvider.slug?.includes("fal")) {
      // Usar FAL.AI con LoRA - generar 3 imágenes una por una para asegurar variedad
      const apiKey = providerWithKey.apiKey;
      
      console.log("[GENERATE LORA TEST] Generating 3 test images with LoRA...");
      
      // Generar cada imagen con un prompt diferente
      for (let i = 0; i < prompts.length; i++) {
        try {
          const prompt = prompts[i];
          console.log(`[GENERATE LORA TEST] Generating image ${i + 1}/3 with prompt: ${prompt.substring(0, 80)}...`);
          
          // FAL.AI flux-lora puede usar el modelo base con el LoRA
          const response = await fetch(
            "https://fal.run/fal-ai/flux/dev",
            {
              method: "POST",
              headers: {
                Authorization: `Key ${apiKey}`,
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                prompt: prompt,
                lora_url: lora_model_url, // URL del modelo LoRA
                image_size: "square_hd",
                num_images: 1, // Una imagen por llamada para más control
                num_inference_steps: 28,
                guidance_scale: 3.5,
              }),
            }
          );

          if (!response.ok) {
            const error = await response.text();
            console.error(`[GENERATE LORA TEST] FAL.AI error for image ${i + 1}:`, error);
            continue; // Continuar con la siguiente imagen si falla una
          }

          const data = await response.json();

          // FAL.AI puede devolver directamente o necesitar polling
          let imageUrl: string | null = null;
          
          if (data.images && data.images.length > 0) {
            imageUrl = data.images[0].url || data.images[0];
          } else if (data.request_id) {
            // Polling
            let attempts = 0;
            const maxAttempts = 60;
            
            while (attempts < maxAttempts) {
              await new Promise(resolve => setTimeout(resolve, 2000));
              
              const pollResponse = await fetch(
                `https://fal.run/fal-ai/flux/dev/requests/${data.request_id}`,
                {
                  headers: {
                    Authorization: `Key ${apiKey}`,
                  },
                }
              );

              if (!pollResponse.ok) {
                console.error(`[GENERATE LORA TEST] Polling error for image ${i + 1}:`, pollResponse.statusText);
                break;
              }

              const pollData = await pollResponse.json();

              if (pollData.status === "COMPLETED") {
                if (pollData.images && pollData.images.length > 0) {
                  imageUrl = pollData.images[0].url || pollData.images[0];
                  break;
                }
              } else if (pollData.status === "FAILED") {
                console.error(`[GENERATE LORA TEST] FAL.AI error for image ${i + 1}:`, pollData.error);
                break;
              }

              attempts++;
            }
          }
          
          if (imageUrl) {
            imageUrls.push(imageUrl);
            console.log(`[GENERATE LORA TEST] ✅ Image ${i + 1}/3 generated: ${imageUrl.substring(0, 80)}...`);
          } else {
            console.warn(`[GENERATE LORA TEST] ⚠️ Could not generate image ${i + 1}`);
          }
          
          // Pequeña pausa entre generaciones
          if (i < prompts.length - 1) {
            await new Promise(resolve => setTimeout(resolve, 1000));
          }
        } catch (error: any) {
          console.error(`[GENERATE LORA TEST] Error generating image ${i + 1}:`, error);
          // Continuar con la siguiente imagen
        }
      }
      
      if (imageUrls.length === 0) {
        throw new Error("No se pudieron generar imágenes de prueba");
      }
    } else {
      // Para otros proveedores, generar imagen normal sin LoRA
      return NextResponse.json(
        { error: "LoRA test generation only supported for FAL.AI" },
        { status: 400 }
      );
    }

      return NextResponse.json({
        image_urls: imageUrls, // Array de URLs de las imágenes generadas
      });
  } catch (error: any) {
    console.error("[GENERATE LORA TEST] Error:", error);
    return NextResponse.json(
      { error: error.message || "Error al generar imagen de prueba" },
      { status: 500 }
    );
  }
}
