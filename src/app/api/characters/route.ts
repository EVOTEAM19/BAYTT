import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { characterSchema } from "@/lib/utils/validators";

// GET - Listar personajes
export async function GET(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    const searchParams = request.nextUrl.searchParams;
    const category = searchParams.get("category");
    const is_baytt = searchParams.get("is_baytt");

    let query = supabaseAdmin.from("characters").select("*");

    if (category) {
      query = query.eq("category", category);
    }

    // NOTA: is_baytt_character no existe en la base de datos, omitimos esos filtros
    // Mostrar todos los personajes activos sin filtrar por is_baytt_character

    // Aplicar filtro de activos
    query = query.eq("is_active", true);
    
    // Aplicar límite si se especifica
    const limitParam = searchParams.get("limit");
    if (limitParam) {
      const limit = parseInt(limitParam, 10);
      if (!isNaN(limit) && limit > 0) {
        query = query.limit(limit);
      }
    }

    // Aplicar orden
    query = query.order("created_at", { ascending: false });

    const { data: characters, error } = await query;

    if (error) {
      console.error("Error fetching characters:", JSON.stringify(error, null, 2));
      return NextResponse.json(
        { 
          error: "Error al obtener personajes",
          details: error.message || error,
          hint: "Verifica que la tabla characters y sus columnas existan"
        },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, data: characters || [] });
  } catch (error: any) {
    console.error("Error in GET /api/characters:", error);
    return NextResponse.json(
      { error: error.message || "Error interno del servidor" },
      { status: 500 }
    );
  }
}

// POST - Crear personaje
export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Verificar que sea admin o superadmin
    const { data: profile } = await supabaseAdmin
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    if (profile?.role !== "admin" && profile?.role !== "superadmin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();
    console.log("[CREATE CHARACTER] Request body received:", {
      name: body.name,
      category: body.category,
      has_images: !!body.reference_images,
      images_count: body.reference_images?.length || 0,
      has_lora: !!body.lora_model_url,
      has_voice: !!body.voice_id,
    });
    
    const {
      name,
      slug,
      category,
      gender,
      description,
      physical_traits, // Guardar en metadata o description
      wardrobe, // Guardar en metadata o description
      reference_images,
      thumbnail_url,
      lora_model_url,
      lora_trigger_word,
      lora_test_image_urls, // Array de URLs de imágenes generadas con LoRA
      voice_provider_id,
      voice_id,
      voice_name,
      is_premium,
      is_active,
      tags, // Incluir tags si viene en el body
      // is_baytt_character: no se usa - no existe en la tabla
    } = body;

    // Validar datos básicos
    if (!name || !category || !reference_images || reference_images.length < 5) {
      return NextResponse.json(
        { error: "Faltan campos requeridos o menos de 5 imágenes" },
        { status: 400 }
      );
    }

    // Crear personaje
    // NOTA: Solo incluir campos que realmente existen en la tabla de la base de datos
    // Campos que NO existen: is_baytt_character, physical_traits, wardrobe
    // Guardamos physical_traits, wardrobe y lora_test_image_urls en description como JSON si no existe campo metadata
    let finalDescription = description || "";
    const metadata: any = {};
    if (physical_traits) {
      // Asegurar que gender esté incluido en physical_traits si existe en el body pero no en physical_traits
      metadata.physical_traits = {
        ...physical_traits,
        gender: physical_traits.gender || gender || null,
      };
    }
    if (wardrobe) metadata.wardrobe = wardrobe;
    if (lora_test_image_urls && Array.isArray(lora_test_image_urls) && lora_test_image_urls.length > 0) {
      metadata.lora_test_image_urls = lora_test_image_urls;
    }
    
    if (Object.keys(metadata).length > 0) {
      if (finalDescription) {
        finalDescription += `\n\n<!-- METADATA: ${JSON.stringify(metadata)} -->`;
      } else {
        finalDescription = `<!-- METADATA: ${JSON.stringify(metadata)} -->`;
      }
    }

    const characterData: any = {
      name,
      slug: slug || name.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, ""),
      category,
      gender: gender || null,
      description: finalDescription || null,
      reference_images: reference_images || [],
      thumbnail_url: thumbnail_url || (reference_images && reference_images[0]) || null,
      lora_model_url: lora_model_url || null,
      lora_trigger_word: lora_trigger_word || null,
      voice_provider_id: voice_provider_id || null,
      voice_id: voice_id || null,
      voice_name: voice_name || null,
      is_premium: is_premium || false,
      is_active: is_active !== undefined ? is_active : true,
      // is_baytt_character: omitido - no existe en la tabla
      tags: tags || [], // Usar tags del body o array vacío
      usage_count: 0,
    };

    console.log("[CREATE CHARACTER] Inserting character with data:", {
      name: characterData.name,
      category: characterData.category,
      images_count: characterData.reference_images?.length || 0,
      has_lora: !!characterData.lora_model_url,
      has_voice: !!characterData.voice_id,
    });

    const { data: character, error: characterError } = await supabaseAdmin
      .from("characters")
      .insert(characterData)
      .select()
      .single();

    if (characterError || !character) {
      console.error("[CREATE CHARACTER] ❌ Error creating character:");
      console.error("[CREATE CHARACTER] Error details:", JSON.stringify(characterError, null, 2));
      console.error("[CREATE CHARACTER] Character data sent:", JSON.stringify(characterData, null, 2));
      
      // Extraer mensaje de error más descriptivo
      let errorMessage = "Error al crear personaje";
      if (characterError?.message) {
        errorMessage = characterError.message;
      } else if (characterError?.code) {
        errorMessage = `Error de base de datos: ${characterError.code}`;
      }
      
      return NextResponse.json(
        { 
          error: errorMessage,
          details: characterError?.message || characterError,
          code: characterError?.code
        },
        { status: 500 }
      );
    }
    
    console.log("[CREATE CHARACTER] ✅ Character created successfully:", character.id);

    return NextResponse.json({
      success: true,
      data: character,
      message: "Personaje creado correctamente",
    });
  } catch (error: any) {
    console.error("Error in POST /api/characters:", error);
    return NextResponse.json(
      { error: error.message || "Error interno del servidor" },
      { status: 500 }
    );
  }
}
