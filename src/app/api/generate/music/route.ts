// ============================================
// BAYTT - Generate Music API Route
// ============================================

import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { generateMusic, type MusicGenerationRequest } from "@/lib/ai/music-generator";

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

    const body = await request.json();
    const { movie_id, genre, mood, style_description } = body;

    if (!movie_id || !genre || !mood) {
      return NextResponse.json(
        { error: "movie_id, genre y mood son requeridos" },
        { status: 400 }
      );
    }

    // Obtener película
    const { data: movie, error: movieError } = await supabaseAdmin
      .from("movies")
      .select("*")
      .eq("id", movie_id)
      .single();

    if (movieError || !movie) {
      return NextResponse.json(
        { error: "Película no encontrada" },
        { status: 404 }
      );
    }

    // Verificar autorización
    if (movie.user_id !== user.id) {
      return NextResponse.json(
        { error: "No autorizado" },
        { status: 403 }
      );
    }

    // Calcular duración total
    const { data: scenes } = await supabaseAdmin
      .from("scenes")
      .select("id")
      .eq("movie_id", movie_id);

    const totalDuration = (scenes?.length || 0) * 10; // 10 segundos por escena

    // Registrar job
    const jobId = crypto.randomUUID();
    await supabaseAdmin.from("generation_jobs").insert({
      id: jobId,
      movie_id: movie.id,
      job_type: "audio",
      status: "processing",
      input_data: { genre, mood, duration: totalDuration },
    });

    try {
      // Generar música
      const music = await generateMusic({
        genre,
        mood,
        duration_seconds: totalDuration,
        style_description,
      });

      // Guardar URL de música (podrías necesitar un campo music_url en movies)
      // Por ahora, actualizamos el progreso
      await supabaseAdmin
        .from("movies")
        .update({
          progress: 80, // Música generada
          status: "assembling",
        })
        .eq("id", movie.id);

      // Actualizar job
      await supabaseAdmin
        .from("generation_jobs")
        .update({
          status: "completed",
          output_data: { music_url: music.music_url },
          cost: music.cost,
        })
        .eq("id", jobId);

      return NextResponse.json({
        success: true,
        music_url: music.music_url,
        duration: music.duration,
        cost: music.cost,
      });
    } catch (error: any) {
      // Actualizar job
      await supabaseAdmin
        .from("generation_jobs")
        .update({
          status: "failed",
          error_message: error.message || "Error desconocido",
        })
        .eq("id", jobId);

      return NextResponse.json(
        {
          error: "Error generando música",
          details: error.message,
        },
        { status: 500 }
      );
    }
  } catch (error: any) {
    console.error("Error in generate music route:", error);
    return NextResponse.json(
      { error: "Error interno del servidor", details: error.message },
      { status: 500 }
    );
  }
}

