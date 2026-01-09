// ============================================
// BAYTT - Providers API Route
// ============================================

import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { encryptApiKey } from "@/lib/encryption/api-keys";
import { providerSchema } from "@/lib/utils/validators";

// GET - Lista proveedores
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

    // Obtener filtro de tipo si existe
    const { searchParams } = new URL(request.url);
    const type = searchParams.get("type");

    // Construir query
    let query = supabaseAdmin.from("api_providers").select("*");

    if (type) {
      query = query.eq("type", type);
    }

    const { data: providers, error } = await query.order("priority", {
      ascending: true,
    });

    if (error) {
      console.error("Error fetching providers:", error);
      return NextResponse.json(
        { error: "Error al obtener proveedores" },
        { status: 500 }
      );
    }

    // Remover api_key_encrypted de la respuesta
    const safeProviders = providers?.map((provider) => {
      const { api_key_encrypted, ...safeProvider } = provider;
      return safeProvider;
    });

    return NextResponse.json({
      success: true,
      data: safeProviders || [],
    });
  } catch (error) {
    console.error("Error in GET /api/providers:", error);
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    );
  }
}

// POST - Crear nuevo proveedor
export async function POST(request: NextRequest) {
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

    // Parsear y validar body
    const body = await request.json();
    console.log("Body recibido:", JSON.stringify(body, null, 2));
    
    // Validar con schema
    let validated;
    try {
      validated = providerSchema.parse(body);
      console.log("Validación exitosa:", validated);
    } catch (validationError: any) {
      console.error("Error de validación Zod:", validationError);
      if (validationError.name === "ZodError") {
        console.error("Errores de validación detallados:", JSON.stringify(validationError.errors, null, 2));
        return NextResponse.json(
          { error: "Datos inválidos", details: validationError.errors },
          { status: 400 }
        );
      }
      throw validationError;
    }

    // Verificar que el slug sea único
    const { data: existing } = await supabaseAdmin
      .from("api_providers")
      .select("id")
      .eq("slug", validated.slug)
      .maybeSingle();

    if (existing) {
      return NextResponse.json(
        { error: "El slug ya existe" },
        { status: 400 }
      );
    }

    // Preparar datos para insertar
    let configValue = null;
    if (validated.config && typeof validated.config === "object") {
      // Si el objeto tiene propiedades, guardarlo; si no, null
      configValue = Object.keys(validated.config).length > 0 ? validated.config : null;
    }

    const providerData: any = {
      type: validated.type,
      name: validated.name,
      slug: validated.slug,
      api_url: validated.api_url && validated.api_url.trim() !== "" ? validated.api_url.trim() : null,
      auth_method: validated.auth_method,
      api_version: validated.api_version && validated.api_version.trim() !== "" ? validated.api_version.trim() : null, // ⭐ Versión de API
      config: configValue,
      is_active: validated.is_active ?? true,
      is_default: validated.is_default || false,
      priority: validated.priority ?? 1,
      cost_per_second: validated.cost_per_second ?? null,
      cost_per_request: validated.cost_per_request ?? null,
      total_requests: 0,
      total_cost: 0,
    };

    // Encriptar API key si se proporciona
    if (body.api_key_encrypted) {
      providerData.api_key_encrypted = body.api_key_encrypted;
    } else if (body.api_key && body.api_key.trim() !== "") {
      providerData.api_key_encrypted = encryptApiKey(body.api_key);
    }

    // Insertar proveedor
    const { data: provider, error } = await supabaseAdmin
      .from("api_providers")
      .insert(providerData)
      .select()
      .single();

    if (error) {
      console.error("Error creating provider:", error);
      return NextResponse.json(
        { error: "Error al crear proveedor", details: error.message },
        { status: 500 }
      );
    }

    // Remover api_key_encrypted de la respuesta
    const { api_key_encrypted, ...safeProvider } = provider;

    return NextResponse.json(
      {
        success: true,
        data: safeProvider,
      },
      { status: 201 }
    );
  } catch (error: any) {
    console.error("Error in POST /api/providers:", error);
    console.error("Error stack:", error.stack);
    console.error("Error name:", error.name);
    
    // Si es un error de Zod, devolver detalles
    if (error.name === "ZodError" || error.issues) {
      const zodErrors = error.errors || error.issues || [];
      console.error("Errores de validación Zod:", JSON.stringify(zodErrors, null, 2));
      return NextResponse.json(
        { error: "Datos inválidos", details: zodErrors },
        { status: 400 }
      );
    }
    
    // Para otros errores, devolver mensaje genérico
    return NextResponse.json(
      { 
        error: "Error interno del servidor", 
        message: error.message || "Error desconocido",
        type: error.name || typeof error
      },
      { status: 500 }
    );
  }
}
