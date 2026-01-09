import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { trainCharacterLoRA } from "@/lib/ai/lora-trainer";

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
    const { character_name, images, physical_traits, wardrobe, visual_prompt_base, character_id } = body;

    if (!images || images.length < 5) {
      return NextResponse.json(
        { error: "Se requieren al menos 5 imágenes" },
        { status: 400 }
      );
    }

    // Generar trigger word único
    const triggerWord = `BAYTT_${character_name.toUpperCase().replace(/\s+/g, "_")}`;

    console.log(`[TRAIN LORA API] Starting training for character: ${character_name}`);
    console.log(`[TRAIN LORA API] Number of images: ${images.length}`);
    console.log(`[TRAIN LORA API] Trigger word: ${triggerWord}`);
    console.log(`[TRAIN LORA API] Image URLs (first 3):`, images.slice(0, 3).map((url: string) => url.substring(0, 80) + '...'));
    console.log(`[TRAIN LORA API] Physical traits received:`, physical_traits ? Object.keys(physical_traits) : 'none');
    console.log(`[TRAIN LORA API] Wardrobe received:`, wardrobe ? Object.keys(wardrobe) : 'none');
    console.log(`[TRAIN LORA API] Visual prompt base:`, visual_prompt_base || 'none');
    
    // Entrenar LoRA
    const result = await trainCharacterLoRA({
      character_id: `char_${Date.now()}`,
      character_name,
      training_images: images,
      trigger_word: triggerWord,
    });

    // Generar imágenes de prueba con el LoRA entrenado (2-3 imágenes)
    let testImageUrls: string[] = [];
    try {
      console.log(`[TRAIN LORA API] Generating test images with trained LoRA...`);
      const testImageResponse = await fetch(
        `${request.nextUrl.origin}/api/characters/generate-lora-test`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Cookie: request.headers.get("Cookie") || "", // Pasar cookies para autenticación
          },
          body: JSON.stringify({
            lora_model_url: result.model_url,
            trigger_word: result.trigger_word,
            character_name,
            character_id: character_id || null, // Pasar character_id si existe
            physical_traits: physical_traits || null, // Pasar physical_traits si no hay character_id
            wardrobe: wardrobe || null, // Pasar wardrobe si no hay character_id
            visual_prompt_base: visual_prompt_base || null, // Pasar visual_prompt_base si no hay character_id
          }),
        }
      );

      if (testImageResponse.ok) {
        const testImageData = await testImageResponse.json();
        testImageUrls = testImageData.image_urls || (testImageData.image_url ? [testImageData.image_url] : []);
        console.log(`[TRAIN LORA API] ✅ Generated ${testImageUrls.length} test images`);
      } else {
        console.warn(`[TRAIN LORA API] ⚠️ Could not generate test images: ${testImageResponse.statusText}`);
      }
    } catch (error) {
      console.error(`[TRAIN LORA API] ⚠️ Error generating test images (non-fatal):`, error);
      // No fallar el entrenamiento si las imágenes de prueba fallan
    }

    return NextResponse.json({
      model_url: result.model_url,
      trigger_word: result.trigger_word,
      training_time_seconds: result.training_time_seconds,
      cost: result.cost,
      test_image_urls: testImageUrls, // Array de URLs de las imágenes generadas con LoRA
    });
  } catch (error: any) {
    console.error("[TRAIN LORA API] Error training LoRA:", error);
    console.error("[TRAIN LORA API] Error stack:", error?.stack);
    
    // Asegurar que el mensaje de error sea siempre un string
    let errorMessage = "Error al entrenar LoRA";
    if (error?.message) {
      errorMessage = typeof error.message === 'string' ? error.message : JSON.stringify(error.message);
    } else if (error) {
      errorMessage = typeof error === 'string' ? error : JSON.stringify(error);
    }
    
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}

