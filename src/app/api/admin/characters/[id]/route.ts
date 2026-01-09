import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";

// PUT - Actualizar personaje (admin)
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    const resolvedParams = params instanceof Promise ? await params : params;
    const characterId = resolvedParams.id;

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

    // Verificar que el personaje existe
    const { data: existing } = await supabaseAdmin
      .from("characters")
      .select("*")
      .eq("id", characterId)
      .single();

    if (!existing) {
      return NextResponse.json(
        { error: "Personaje no encontrado" },
        { status: 404 }
      );
    }

    const body = await request.json();

    // Preparar datos para actualizar
    const updateData: any = {};

    // Campos que se pueden actualizar
    if (body.name !== undefined) updateData.name = body.name;
    if (body.slug !== undefined) updateData.slug = body.slug;
    if (body.category !== undefined) updateData.category = body.category;
    if (body.gender !== undefined) updateData.gender = body.gender || null;
    if (body.description !== undefined) {
      // Manejar metadata si viene en description
      updateData.description = body.description;
    }
    if (body.reference_images !== undefined) updateData.reference_images = body.reference_images;
    if (body.thumbnail_url !== undefined) updateData.thumbnail_url = body.thumbnail_url;
    if (body.lora_model_url !== undefined) updateData.lora_model_url = body.lora_model_url;
    if (body.lora_trigger_word !== undefined) updateData.lora_trigger_word = body.lora_trigger_word;
    if (body.voice_provider_id !== undefined) updateData.voice_provider_id = body.voice_provider_id;
    if (body.voice_id !== undefined) updateData.voice_id = body.voice_id;
    if (body.voice_name !== undefined) updateData.voice_name = body.voice_name;
    if (body.is_premium !== undefined) updateData.is_premium = body.is_premium;
    if (body.is_active !== undefined) updateData.is_active = body.is_active;
    if (body.tags !== undefined) updateData.tags = body.tags;
    if (body.visual_prompt_base !== undefined) updateData.visual_prompt_base = body.visual_prompt_base;

    // Actualizar personaje
    const { data: character, error } = await supabaseAdmin
      .from("characters")
      .update(updateData)
      .eq("id", characterId)
      .select()
      .single();

    if (error) {
      console.error("[UPDATE CHARACTER] Error:", error);
      return NextResponse.json(
        { error: "Error al actualizar personaje", details: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data: character,
    });
  } catch (error: any) {
    console.error("[UPDATE CHARACTER] Unexpected error:", error);
    return NextResponse.json(
      { error: error.message || "Error interno del servidor" },
      { status: 500 }
    );
  }
}
