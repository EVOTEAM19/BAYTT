import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";

// GET - Listar películas para admin
export async function GET(request: NextRequest) {
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

    const searchParams = request.nextUrl.searchParams;
    const status = searchParams.get("status");
    const published = searchParams.get("published");
    const genre = searchParams.get("genre");
    const search = searchParams.get("search");
    const showDeleted = searchParams.get("show_deleted") === "true";
    const showProcessing = searchParams.get("show_processing") === "true";

    // Construir query base
    // Intentar con join primero, si falla, hacer query separada
    let query = supabaseAdmin
      .from("movies")
      .select(`
        *,
        profiles (
          id,
          full_name,
          email,
          avatar_url
        )
      `);

    // Por defecto, excluir películas eliminadas (si la columna existe)
    // Primero intentamos sin el filtro, y si falla, lo manejamos en el catch
    // No aplicamos el filtro de is_deleted por defecto para evitar errores si la columna no existe
    // Solo lo aplicamos si explícitamente se solicita ver eliminadas
    if (showDeleted) {
      // Si se solicita ver eliminadas, intentar filtrar por is_deleted
      // Si la columna no existe, esto fallará y lo manejaremos en el catch
      query = query.eq("is_deleted", true);
    }
    // Si no se solicita ver eliminadas, no aplicamos ningún filtro de is_deleted
    // Esto evita errores si la columna no existe

    // Filtro para "En Proceso"
    if (showProcessing) {
      // Películas que están en proceso de generación
      // Usar múltiples condiciones OR en lugar de .in() para mayor compatibilidad
      query = query.or(
        "status.eq.draft," +
        "status.eq.script_generating," +
        "status.eq.video_generating," +
        "status.eq.audio_generating," +
        "status.eq.assembling," +
        "status.eq.processing"
      );
    }

    // Aplicar filtros
    if (status) {
      query = query.eq("status", status);
    }

    if (published === "true") {
      query = query.eq("is_published", true);
    } else if (published === "false") {
      query = query.eq("is_published", false);
    }

    if (genre) {
      query = query.eq("genre", genre);
    }

    if (search) {
      query = query.or(`title.ilike.%${search}%,description.ilike.%${search}%`);
    }

    const { data: movies, error } = await query.order("created_at", {
      ascending: false,
    });

    if (error) {
      console.error("Error fetching movies:", {
        code: error.code,
        message: error.message,
        details: error.details,
        hint: error.hint
      });
      
      // Si el error es por columna inexistente (is_deleted), intentar sin ese filtro
      if ((error.code === 'PGRST204' || error.code === '42703') && 
          (error.message?.includes('is_deleted') || error.details?.includes('is_deleted'))) {
        console.warn("Column is_deleted does not exist, retrying without filter");
        
        // Rehacer la query sin el filtro de is_deleted
        // Intentar primero sin join para ver si el problema es el join
        let retryQuery = supabaseAdmin
          .from("movies")
          .select("*");
        
        // Aplicar solo el filtro de processing si está activo
        if (showProcessing) {
          retryQuery = retryQuery.or(
            "status.eq.draft," +
            "status.eq.script_generating," +
            "status.eq.video_generating," +
            "status.eq.audio_generating," +
            "status.eq.assembling," +
            "status.eq.processing"
          );
        }
        
        if (status) {
          retryQuery = retryQuery.eq("status", status);
        }
        
        if (published === "true") {
          retryQuery = retryQuery.eq("is_published", true);
        } else if (published === "false") {
          retryQuery = retryQuery.eq("is_published", false);
        }
        
        if (genre) {
          retryQuery = retryQuery.eq("genre", genre);
        }
        
        if (search) {
          retryQuery = retryQuery.or(`title.ilike.%${search}%,description.ilike.%${search}%`);
        }
        
        const { data: retryMovies, error: retryError } = await retryQuery.order("created_at", {
          ascending: false,
        });
        
        if (retryError) {
          console.error("Retry query error:", retryError);
          return NextResponse.json(
            { error: "Error al obtener películas", details: retryError.message },
            { status: 500 }
          );
        }
        
        // Si tenemos películas, obtener los perfiles por separado
        if (retryMovies && retryMovies.length > 0) {
          const userIds = [...new Set(retryMovies.map((m: any) => m.user_id).filter(Boolean))];
          if (userIds.length > 0) {
            const { data: profiles } = await supabaseAdmin
              .from("profiles")
              .select("id, full_name, email, avatar_url")
              .in("id", userIds);
            
            // Añadir perfiles a las películas
            const profilesMap = new Map(profiles?.map((p: any) => [p.id, p]) || []);
            retryMovies.forEach((movie: any) => {
              movie.profiles = profilesMap.get(movie.user_id) || null;
            });
          }
        }
        
        return NextResponse.json({ success: true, data: retryMovies || [] });
      }
      
      return NextResponse.json(
        { error: "Error al obtener películas", details: error.message, code: error.code },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, data: movies || [] });
  } catch (error: any) {
    console.error("Error in GET /api/admin/movies:", error);
    return NextResponse.json(
      { error: error.message || "Error interno del servidor" },
      { status: 500 }
    );
  }
}

