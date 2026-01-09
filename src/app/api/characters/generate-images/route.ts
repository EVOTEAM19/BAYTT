import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { generateHyperrealisticImage } from "@/lib/ai/image-generator";
import { buildPhotorealisticPrompt, generatePoseVariations } from "@/lib/ai/prompt-builder";
import type { CharacterPhysicalTraits, CharacterWardrobe } from "@/types/character";

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
    const { physical, gender, name, wardrobe, num_images = 8 } = body as {
      physical: CharacterPhysicalTraits;
      wardrobe?: CharacterWardrobe | string;
      gender?: string;
      name?: string;
      num_images?: number;
    };

    // Generar variaciones de poses automáticamente
    const poseTypes: Array<"portrait" | "full_body" | "profile" | "three_quarter"> = [
      "portrait", "portrait", "portrait", "three_quarter", 
      "three_quarter", "profile", "full_body", "full_body"
    ];
    const expressions: Array<"neutral" | "happy" | "serious" | "thoughtful"> = [
      "neutral", "happy", "serious", "neutral", 
      "thoughtful", "neutral", "neutral", "serious"
    ];
    
    const poses = Array.from({ length: num_images }, (_, i) => ({
      pose: poseTypes[i % poseTypes.length],
      expression: expressions[i % expressions.length],
    }));
    
    // Generar prompts para cada pose/expresión
    const wardrobeObj = typeof wardrobe === 'string' 
      ? { default_outfit: wardrobe } 
      : wardrobe;
    
    const prompts = poses.map((poseData) => {
      return buildPhotorealisticPrompt(
        physical,
        wardrobeObj,
        poseData.pose,
        poseData.expression
      );
    });

    // Verificar que hay un proveedor de imagen configurado
    const { getAIConfig } = await import('@/lib/ai/config');
    const config = await getAIConfig();
    
    console.log('[GENERATE IMAGES] Config:', {
      mockMode: config.mockMode,
      hasImageProvider: !!config.imageProvider,
      imageProviderId: config.imageProvider?.id,
      imageProviderSlug: config.imageProvider?.slug
    });
    
    if (config.mockMode || !config.imageProvider) {
      console.log('[GENERATE IMAGES] Using mock mode - returning placeholder images');
      return NextResponse.json({
        images: Array.from({ length: num_images }, (_, i) => ({
          url: `https://via.placeholder.com/1024x1024?text=Mock+Image+${i + 1}`,
          seed: Math.random(),
          pose: poses[i].pose,
          expression: poses[i].expression,
        })),
        prompt: prompts[0].prompt.substring(0, 500),
      });
    }
    
    // Generar imágenes
    console.log(`[GENERATE IMAGES] Generating ${prompts.length} images...`);
    const allImages = [];
    for (let i = 0; i < prompts.length; i++) {
      const prompt = prompts[i];
      console.log(`[GENERATE IMAGES] Generating image ${i + 1}/${prompts.length}...`);
      try {
        const images = await generateHyperrealisticImage({
          prompt: prompt.prompt,
          negative_prompt: prompt.negative_prompt,
          width: 1024,
          height: 1024,
          num_images: 1,
        });

        allImages.push({
          url: images[0].url,
          seed: images[0].seed || Math.random(),
          pose: poses[i].pose,
          expression: poses[i].expression,
        });
        console.log(`[GENERATE IMAGES] ✅ Image ${i + 1} generated successfully`);
      } catch (error: any) {
        console.error(`[GENERATE IMAGES] ❌ Error generating image ${i + 1}:`, error);
        // Continuar con las siguientes imágenes pero reportar el error
        throw error;
      }
    }

    return NextResponse.json({
      images: allImages,
      prompt: prompts[0].prompt.substring(0, 500),
    });
  } catch (error: any) {
    console.error("[GENERATE IMAGES] Error generating images:", error);
    console.error("[GENERATE IMAGES] Error stack:", error?.stack);
    console.error("[GENERATE IMAGES] Error details:", {
      message: error?.message,
      name: error?.name,
      cause: error?.cause
    });
    
    return NextResponse.json(
      { 
        error: error?.message || "Failed to generate images",
        details: error?.stack || undefined
      },
      { status: 500 }
    );
  }
}

