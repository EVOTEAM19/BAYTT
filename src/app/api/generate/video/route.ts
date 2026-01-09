// ============================================
// BAYTT - Generate Video API Route
// ============================================

import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { generateVideoClip } from "@/lib/ai/video-generator";
import { CROSSFADE_DURATION_SECONDS } from "@/lib/utils/constants";

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
    const { scene_id } = body;

    if (!scene_id) {
      return NextResponse.json(
        { error: "scene_id es requerido" },
        { status: 400 }
      );
    }

    // Obtener escena y su contexto
    const { data: scene, error: sceneError } = await supabaseAdmin
      .from("scenes")
      .select("*, movies(*)")
      .eq("id", scene_id)
      .single();

    if (sceneError || !scene) {
      return NextResponse.json(
        { error: "Escena no encontrada" },
        { status: 404 }
      );
    }

    const movie = Array.isArray(scene.movies) ? scene.movies[0] : scene.movies;

    // Verificar que el usuario es el dueño de la película
    if (movie.user_id !== user.id) {
      return NextResponse.json(
        { error: "No autorizado" },
        { status: 403 }
      );
    }

    // Obtener escena anterior para continuidad
    const { data: previousScene } = await supabaseAdmin
      .from("scenes")
      .select("last_frame_url, visual_context")
      .eq("movie_id", movie.id)
      .eq("scene_number", scene.scene_number - 1)
      .maybeSingle();

    // Registrar job
    const jobId = crypto.randomUUID();
    await supabaseAdmin.from("generation_jobs").insert({
      id: jobId,
      movie_id: movie.id,
      scene_id: scene.id,
      job_type: "video",
      status: "processing",
      input_data: { scene_id, visual_prompt: scene.visual_prompt },
    });

    try {
      // Generar clip de video
      const video = await generateVideoClip({
        scene_id: scene.id,
        visual_prompt: scene.visual_prompt,
        duration_seconds: 10,
        previous_frame_url: previousScene?.last_frame_url,
        visual_context: previousScene?.visual_context || scene.visual_context,
        aspect_ratio: "1280:720", // Runway format: 1280:720 (16:9 horizontal) - DOS PUNTOS
      });

      // Guardar URLs en escena
      const { error: updateError } = await supabaseAdmin
        .from("scenes")
        .update({
          clip_url: video.clip_url,
          first_frame_url: video.first_frame_url,
          last_frame_url: video.last_frame_url,
          clip_status: "completed",
        })
        .eq("id", scene.id);

      if (updateError) {
        throw new Error(`Error actualizando escena: ${updateError.message}`);
      }

      // Actualizar progreso de movie
      const { data: allScenes } = await supabaseAdmin
        .from("scenes")
        .select("id, clip_status")
        .eq("movie_id", movie.id);

      const completedScenes = allScenes?.filter(
        (s) => s.clip_status === "completed"
      ).length || 0;
      const totalScenes = allScenes?.length || 1;
      const videoProgress = Math.floor((completedScenes / totalScenes) * 50) + 20; // 20-70%

      await supabaseAdmin
        .from("movies")
        .update({
          progress: videoProgress,
          status:
            completedScenes === totalScenes ? "audio_generating" : "video_generating",
        })
        .eq("id", movie.id);

      // Actualizar job
      await supabaseAdmin
        .from("generation_jobs")
        .update({
          status: "completed",
          output_data: { clip_url: video.clip_url },
          cost: video.cost,
        })
        .eq("id", jobId);

      return NextResponse.json({
        success: true,
        clip_url: video.clip_url,
        first_frame_url: video.first_frame_url,
        last_frame_url: video.last_frame_url,
        thumbnail_url: video.thumbnail_url,
        cost: video.cost,
      });
    } catch (error: any) {
      // Actualizar escena como fallida
      await supabaseAdmin
        .from("scenes")
        .update({
          clip_status: "failed",
        })
        .eq("id", scene.id);

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
          error: "Error generando video",
          details: error.message,
        },
        { status: 500 }
      );
    }
  } catch (error: any) {
    console.error("Error in generate video route:", error);
    return NextResponse.json(
      { error: "Error interno del servidor", details: error.message },
      { status: 500 }
    );
  }
}
