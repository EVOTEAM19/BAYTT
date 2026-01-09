// ============================================
// BAYTT - Provider by ID API Route
// ============================================

import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { encryptApiKey } from "@/lib/encryption/api-keys";
import { providerSchema } from "@/lib/utils/validators";

// GET - Obtener proveedor por ID
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
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

    const { data: provider, error } = await supabaseAdmin
      .from("api_providers")
      .select("*")
      .eq("id", params.id)
      .single();

    if (error || !provider) {
      return NextResponse.json(
        { error: "Proveedor no encontrado" },
        { status: 404 }
      );
    }

    // Remover api_key_encrypted de la respuesta
    const { api_key_encrypted, ...safeProvider } = provider;

    return NextResponse.json({
      success: true,
      data: safeProvider,
    });
  } catch (error) {
    console.error("Error in GET /api/providers/[id]:", error);
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    );
  }
}

// PUT - Actualizar proveedor
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
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

    // Verificar que el proveedor existe
    const { data: existing } = await supabaseAdmin
      .from("api_providers")
      .select("*")
      .eq("id", params.id)
      .single();

    if (!existing) {
      return NextResponse.json(
        { error: "Proveedor no encontrado" },
        { status: 404 }
      );
    }

    // Parsear y validar body
    const body = await request.json();
    const validated = providerSchema.partial().parse(body);

    // Verificar que el slug sea único (si cambió)
    if (validated.slug && validated.slug !== existing.slug) {
      const { data: slugExists } = await supabaseAdmin
        .from("api_providers")
        .select("id")
        .eq("slug", validated.slug)
        .neq("id", params.id)
        .maybeSingle();

      if (slugExists) {
        return NextResponse.json(
          { error: "El slug ya existe" },
          { status: 400 }
        );
      }
    }

    // Preparar datos para actualizar
    const updateData: any = {};

    if (validated.type !== undefined) updateData.type = validated.type;
    if (validated.name !== undefined) updateData.name = validated.name;
    if (validated.slug !== undefined) updateData.slug = validated.slug;
    if (validated.api_url !== undefined)
      updateData.api_url = validated.api_url || null;
    if (validated.api_version !== undefined) // ⭐ Versión de API
      updateData.api_version = validated.api_version && validated.api_version.trim() !== "" ? validated.api_version.trim() : null;
    if (validated.auth_method !== undefined)
      updateData.auth_method = validated.auth_method;
    if (validated.config !== undefined) updateData.config = validated.config;
    if (validated.is_active !== undefined)
      updateData.is_active = validated.is_active;
    if (validated.is_default !== undefined)
      updateData.is_default = validated.is_default;
    if (validated.priority !== undefined) updateData.priority = validated.priority;
    if (validated.cost_per_second !== undefined)
      updateData.cost_per_second = validated.cost_per_second;
    if (validated.cost_per_request !== undefined)
      updateData.cost_per_request = validated.cost_per_request;

    // Si cambia API key, re-encriptar
    if (body.api_key_encrypted) {
      updateData.api_key_encrypted = body.api_key_encrypted;
    } else if (body.api_key && body.api_key.trim() !== "") {
      updateData.api_key_encrypted = encryptApiKey(body.api_key);
    }

    // Actualizar proveedor
    const { data: provider, error } = await supabaseAdmin
      .from("api_providers")
      .update(updateData)
      .eq("id", params.id)
      .select()
      .single();

    if (error) {
      console.error("Error updating provider:", error);
      return NextResponse.json(
        { error: "Error al actualizar proveedor" },
        { status: 500 }
      );
    }

    // Remover api_key_encrypted de la respuesta
    const { api_key_encrypted, ...safeProvider } = provider;

    return NextResponse.json({
      success: true,
      data: safeProvider,
    });
  } catch (error: any) {
    console.error("Error in PUT /api/providers/[id]:", error);
    if (error.name === "ZodError") {
      return NextResponse.json(
        { error: "Datos inválidos", details: error.errors },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    );
  }
}

// DELETE - Eliminar proveedor
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
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

    // Verificar que el proveedor existe
    const { data: provider } = await supabaseAdmin
      .from("api_providers")
      .select("type, is_active")
      .eq("id", params.id)
      .single();

    if (!provider) {
      return NextResponse.json(
        { error: "Proveedor no encontrado" },
        { status: 404 }
      );
    }

    // Verificar que no es el único de su tipo activo
    if (provider.is_active) {
      const { count } = await supabaseAdmin
        .from("api_providers")
        .select("*", { count: "exact", head: true })
        .eq("type", provider.type)
        .eq("is_active", true)
        .neq("id", params.id);

      if ((count || 0) === 0) {
        return NextResponse.json(
          {
            error: `No se puede eliminar. Es el único proveedor activo de tipo ${provider.type}`,
          },
          { status: 400 }
        );
      }
    }

    // Eliminar proveedor
    const { error } = await supabaseAdmin
      .from("api_providers")
      .delete()
      .eq("id", params.id);

    if (error) {
      console.error("Error deleting provider:", error);
      return NextResponse.json(
        { error: "Error al eliminar proveedor" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Proveedor eliminado correctamente",
    });
  } catch (error) {
    console.error("Error in DELETE /api/providers/[id]:", error);
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    );
  }
}

