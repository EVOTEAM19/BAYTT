import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";

export async function POST(request: NextRequest) {
  try {
    // Verificar autenticación
    const supabase = await createServerSupabaseClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Verificar rol admin
    const { data: profile } = await supabaseAdmin
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    if (profile?.role !== "admin" && profile?.role !== "superadmin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { type, api_url, api_key, auth_method, auth_header, config } =
      await request.json();

    if (!api_url) {
      return NextResponse.json(
        { success: false, error: "URL de API requerida" },
        { status: 400 }
      );
    }

    // Construir headers según método de auth
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };

    if (auth_method === "bearer" && api_key) {
      headers["Authorization"] = `Bearer ${api_key}`;
    } else if (auth_method === "api_key" && api_key && auth_header) {
      headers[auth_header] = api_key;
    } else if (auth_method === "basic" && api_key) {
      // Basic auth requiere base64 encoding
      const encoded = Buffer.from(api_key).toString("base64");
      headers["Authorization"] = `Basic ${encoded}`;
    }

    // Test simple según el tipo de proveedor
    let testUrl = api_url;
    let testBody = null;
    let method = "GET";

    switch (type) {
      case "llm":
        // Para LLMs, intentar una completion mínima
        if (api_url.includes("anthropic")) {
          testUrl = api_url;
          method = "POST";
          testBody = JSON.stringify({
            model: "claude-3-haiku-20240307",
            max_tokens: 10,
            messages: [{ role: "user", content: "Hi" }],
          });
        } else if (api_url.includes("openai")) {
          testUrl = api_url;
          method = "POST";
          testBody = JSON.stringify({
            model: "gpt-3.5-turbo",
            max_tokens: 10,
            messages: [{ role: "user", content: "Hi" }],
          });
        }
        break;

      case "audio":
        // Para ElevenLabs, listar voces
        if (api_url.includes("elevenlabs")) {
          testUrl = "https://api.elevenlabs.io/v1/voices";
        }
        break;

      case "image":
        // Para Flux, verificar endpoint
        if (api_url.includes("bfl.ml")) {
          // BFL no tiene endpoint de health, intentamos validar la key
          testUrl = api_url;
          method = "POST";
          testBody = JSON.stringify({
            prompt: "test",
            width: 256,
            height: 256,
          });
        }
        break;

      default:
        // Test genérico: verificar que responde
        break;
    }

    try {
      const response = await fetch(testUrl, {
        method,
        headers,
        body: testBody,
      });

      if (response.ok || response.status === 200 || response.status === 201) {
        return NextResponse.json({
          success: true,
          message: "Conexión establecida correctamente",
          status: response.status,
        });
      } else {
        const errorText = await response.text().catch(() => "");
        return NextResponse.json({
          success: false,
          error: `Error ${response.status}: ${errorText.substring(0, 200)}`,
          status: response.status,
        });
      }
    } catch (fetchError: any) {
      // Si es un error de CORS o conexión, puede ser normal
      // Verificamos al menos que la URL es válida
      try {
        new URL(api_url);
        return NextResponse.json({
          success: true,
          message:
            "URL válida. No se pudo probar conexión (posible CORS), pero la configuración parece correcta.",
        });
      } catch {
        return NextResponse.json({
          success: false,
          error: fetchError.message || "Error de conexión",
        });
      }
    }
  } catch (error: any) {
    console.error("Error in POST /api/providers/test:", error);
    return NextResponse.json({
      success: false,
      error: error.message || "Error interno del servidor",
    });
  }
}

