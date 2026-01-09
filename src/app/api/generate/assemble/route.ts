// ============================================
// BAYTT - Assemble Movie API Route
// ============================================

import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { assembleMovie } from "@/lib/video/assembler";

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
    const { movie_id, quality = "1080p", generate_trailer = false } = body;

    if (!movie_id) {
      return NextResponse.json(
        { error: "movie_id es requerido" },
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

    // Obtener todas las escenas
    const { data: scenes, error: scenesError } = await supabaseAdmin
      .from("scenes")
      .select("*")
      .eq("movie_id", movie_id)
      .order("scene_number", { ascending: true });

    if (scenesError || !scenes || scenes.length === 0) {
      return NextResponse.json(
        { error: "No se encontraron escenas" },
        { status: 404 }
      );
    }

    // Verificar que todas las escenas tienen clips y audio
    const incompleteScenes = scenes.filter(
      (scene) => !scene.clip_url || !scene.audio_dialogue_url
    );

    if (incompleteScenes.length > 0) {
      return NextResponse.json(
        {
          error: "Algunas escenas no están completas",
          incomplete_scenes: incompleteScenes.map((s) => s.scene_number),
        },
        { status: 400 }
      );
    }

    // Obtener música (asumiendo que está guardada en algún lugar)
    // Por ahora, usamos un placeholder
    const musicUrl = `/api/mock/music/${movie_id}.mp3`;

    // Preparar audio tracks
    const audioTracks = {
      dialogue: scenes.map((s) => s.audio_dialogue_url || "").filter(Boolean),
      music: musicUrl,
      effects: scenes.map((s) => s.audio_prompt || "").filter(Boolean),
    };

    // Registrar job
    const jobId = crypto.randomUUID();
    await supabaseAdmin.from("generation_jobs").insert({
      id: jobId,
      movie_id: movie.id,
      job_type: "assembly",
      status: "processing",
      input_data: { quality, generate_trailer },
    });

    try {
      // Ensamblar película
      const assembled = await assembleMovie({
        movie_id: movie.id,
        scenes,
        audio_tracks,
        quality: quality as "720p" | "1080p" | "4k",
        generate_trailer,
      });

      // Actualizar movie con URLs finales
      const updateData: any = {
        status: "completed",
        progress: 100,
        thumbnail_url: assembled.thumbnail_url,
      };

      // Actualizar URL según calidad
      if (quality === "720p") {
        updateData.video_url_720p = assembled.video_url;
      } else if (quality === "1080p") {
        updateData.video_url_1080p = assembled.video_url;
      } else if (quality === "4k") {
        updateData.video_url_4k = assembled.video_url;
      }

      await supabaseAdmin
        .from("movies")
        .update(updateData)
        .eq("id", movie.id);

      // Actualizar job
      await supabaseAdmin
        .from("generation_jobs")
        .update({
          status: "completed",
          output_data: {
            video_url: assembled.video_url,
            duration: assembled.duration,
            file_size: assembled.file_size,
          },
        })
        .eq("id", jobId);

      return NextResponse.json({
        success: true,
        video_url: assembled.video_url,
        trailer_url: assembled.trailer_url,
        thumbnail_url: assembled.thumbnail_url,
        poster_url: assembled.poster_url,
        duration: assembled.duration,
        file_size: assembled.file_size,
      });
    } catch (error: any) {
      // Actualizar movie a 'failed'
      await supabaseAdmin
        .from("movies")
        .update({
          status: "failed",
          progress: 90,
        })
        .eq("id", movie.id);

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
          error: "Error ensamblando película",
          details: error.message,
        },
        { status: 500 }
      );
    }
  } catch (error: any) {
    console.error("Error in assemble route:", error);
    return NextResponse.json(
      { error: "Error interno del servidor", details: error.message },
      { status: 500 }
    );
  }
}
