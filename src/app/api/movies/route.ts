import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { createMovieSchema } from "@/lib/utils/validators";

// GET - Listar películas (con filtro de plan si es necesario)
export async function GET(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    const searchParams = request.nextUrl.searchParams;
    const published = searchParams.get("published");
    const planId = searchParams.get("plan_id");

    let query = supabaseAdmin.from("movies").select("*");

    // Si se especifica published, filtrar
    if (published === "true") {
      query = query.eq("is_published", true);
    }

    // Si hay usuario autenticado, filtrar por plan disponible
    if (user && planId) {
      // Películas disponibles para todos (available_plans es null)
      // O películas donde el plan del usuario está en available_plans
      query = query.or(
        `available_plans.is.null,available_plans.cs.{${planId}}`
      );
    } else if (!user) {
      // Usuario no autenticado: solo películas disponibles para todos
      query = query.is("available_plans", null);
    }

    const { data: movies, error } = await query.order("created_at", {
      ascending: false,
    });

    if (error) {
      console.error("Error fetching movies:", error);
      return NextResponse.json(
        { error: "Error al obtener películas" },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, data: movies || [] });
  } catch (error: any) {
    console.error("Error in GET /api/movies:", error);
    return NextResponse.json(
      { error: error.message || "Error interno del servidor" },
      { status: 500 }
    );
  }
}

// POST - Crear película
export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Verificar rol
    const { data: profile, error: profileError } = await supabaseAdmin
      .from("profiles")
      .select("role, plan_id, movies_created_this_month")
      .eq("id", user.id)
      .single();

    if (profileError) {
      console.error("Error fetching profile:", profileError);
      return NextResponse.json(
        { error: "Error al obtener perfil de usuario" },
        { status: 500 }
      );
    }

    if (!profile) {
      return NextResponse.json(
        { error: "Perfil de usuario no encontrado" },
        { status: 404 }
      );
    }

    const isSuperAdmin = profile.role === "superadmin";
    const isAdmin = profile.role === "admin" || isSuperAdmin;

    const body = await request.json();
    console.log("Received request body:", JSON.stringify(body, null, 2));
    
    const {
      title,
      description,
      genre,
      duration_minutes,
      user_prompt,
      user_plot,
      user_ending,
      ending_type,
      rental_price,
      available_plans,
      is_admin_created,
      character_ids,
      use_random_characters,
      random_characters_count,
    } = body;

    // Validar datos básicos
    if (!title || !genre || !duration_minutes || !user_prompt) {
      console.error("Missing required fields:", { title: !!title, genre: !!genre, duration_minutes: !!duration_minutes, user_prompt: !!user_prompt });
      return NextResponse.json(
        { error: "Faltan campos requeridos" },
        { status: 400 }
      );
    }

    // Si es creación de admin/superadmin, permitir sin límites
    if (!is_admin_created && !isSuperAdmin && profile.plan_id) {
      // Verificar límites del plan para usuarios normales
      const { data: plan, error: planError } = await supabaseAdmin
        .from("plans")
        .select("movies_per_month")
        .eq("id", profile.plan_id)
        .single();

      if (!planError && plan) {
        if (
          (profile.movies_created_this_month || 0) >= (plan.movies_per_month || 0)
        ) {
          return NextResponse.json(
            { error: "Has alcanzado el límite de películas de tu plan" },
            { status: 403 }
          );
        }
      }
    }

    // Crear película
    const movieData: any = {
      user_id: user.id,
      title,
      description: description || null,
      genre,
      duration_minutes,
      user_prompt,
      user_plot: user_plot || null,
      user_ending: user_ending || null,
      ending_type: ending_type || "ai",
      status: is_admin_created ? "pending_review" : "draft", // Películas de admin quedan pendientes de revisión
      progress: 0,
      is_published: false,
      rental_price: rental_price || null,
      views_count: 0,
      rentals_count: 0,
      average_rating: null,
    };

    // Solo añadir available_plans si la columna existe (evitar error si no está creada)
    // Si la columna no existe, simplemente no la incluimos en el insert
    if (available_plans !== undefined) {
      movieData.available_plans = available_plans && Array.isArray(available_plans) && available_plans.length > 0 
        ? available_plans 
        : null;
    }

    console.log("Creating movie with data:", JSON.stringify(movieData, null, 2));

    const { data: movie, error: movieError } = await supabaseAdmin
      .from("movies")
      .insert(movieData)
      .select()
      .single();

    if (movieError) {
      console.error("Error creating movie:", {
        message: movieError.message,
        details: movieError.details,
        hint: movieError.hint,
        code: movieError.code,
      });
      return NextResponse.json(
        { 
          error: "Error al crear película", 
          details: movieError.message || "Error desconocido",
          hint: movieError.hint || null,
          code: movieError.code || null
        },
        { status: 500 }
      );
    }

    if (!movie) {
      console.error("Movie created but no data returned");
      return NextResponse.json(
        { error: "La película se creó pero no se pudo recuperar" },
        { status: 500 }
      );
    }

    // Si no es admin, actualizar contador
    if (!is_admin_created && !isSuperAdmin) {
      await supabaseAdmin
        .from("profiles")
        .update({
          movies_created_this_month:
            (profile?.movies_created_this_month || 0) + 1,
        })
        .eq("id", user.id);
    }

    return NextResponse.json({
      success: true,
      data: movie,
      message: "Película creada correctamente",
    });
  } catch (error: any) {
    console.error("Error in POST /api/movies:", {
      message: error.message,
      stack: error.stack,
      name: error.name,
      error: error
    });
    return NextResponse.json(
      { 
        error: error.message || "Error interno del servidor",
        details: process.env.NODE_ENV === 'development' ? error.stack : undefined
      },
      { status: 500 }
    );
  }
}
