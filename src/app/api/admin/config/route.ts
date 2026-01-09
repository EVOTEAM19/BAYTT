// ============================================
// BAYTT - Admin Config API Route
// ============================================

import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";

// GET - Obtener toda la configuración
export async function GET(request: NextRequest) {
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

    // Obtener todas las configuraciones
    const { data: configs, error } = await supabaseAdmin
      .from("admin_config")
      .select("key, value, is_secret")
      .order("key", { ascending: true });

    if (error) {
      console.error("Error fetching config:", error);
      return NextResponse.json(
        { error: "Error al obtener configuración" },
        { status: 500 }
      );
    }

    // Convertir array a objeto
    const configObject: Record<string, any> = {};
    configs?.forEach((config) => {
      configObject[config.key] = config.value;
    });

    return NextResponse.json({
      success: true,
      data: configObject,
    });
  } catch (error) {
    console.error("Error in GET /api/admin/config:", error);
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    );
  }
}

// PUT - Actualizar configuración
export async function PUT(request: NextRequest) {
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
    const { key, value } = body;

    if (!key) {
      return NextResponse.json(
        { error: "Key es requerida" },
        { status: 400 }
      );
    }

    // Validar keys permitidas
    const allowedKeys = [
      "mock_mode",
      "video_config",
      "audio_config",
      "music_config",
      "llm_config",
      "image_config",
      "lora_training_config",
      "lip_sync_config",
      "storage_config",
      "generation_limits",
      "marketplace_settings",
      "assembly_settings",
      "rental_prices",
      "commission_settings",
      "movie_duration_limits",
    ];

    if (!allowedKeys.includes(key)) {
      return NextResponse.json(
        { error: `Key no permitida: ${key}` },
        { status: 400 }
      );
    }

    // Verificar si existe
    const { data: existing } = await supabaseAdmin
      .from("admin_config")
      .select("id")
      .eq("key", key)
      .maybeSingle();

    if (existing) {
      // Actualizar
      const { error } = await supabaseAdmin
        .from("admin_config")
        .update({
          value,
          updated_at: new Date().toISOString(),
        })
        .eq("key", key);

      if (error) {
        console.error("Error updating config:", error);
        return NextResponse.json(
          { error: "Error al actualizar configuración" },
          { status: 500 }
        );
      }
    } else {
      // Crear
      const { error } = await supabaseAdmin.from("admin_config").insert({
        key,
        value,
        is_secret: key.includes("key") || key.includes("secret"),
      });

      if (error) {
        console.error("Error creating config:", error);
        return NextResponse.json(
          { error: "Error al crear configuración" },
          { status: 500 }
        );
      }
    }

    return NextResponse.json({
      success: true,
      message: "Configuración actualizada correctamente",
    });
  } catch (error: any) {
    console.error("Error in PUT /api/admin/config:", error);
    return NextResponse.json(
      { error: error.message || "Error interno del servidor" },
      { status: 500 }
    );
  }
}
