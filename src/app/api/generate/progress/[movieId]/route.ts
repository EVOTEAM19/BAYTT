// ============================================
// BAYTT - Generation Progress API Route
// ============================================

import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import type { GenerationProgress } from "@/types/api";

export async function GET(
  request: NextRequest,
  { params }: { params: { movieId: string } }
) {
  try {
    const { movieId } = params;

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

    // Obtener película
    const { data: movie, error: movieError } = await supabaseAdmin
      .from("movies")
      .select("*")
      .eq("id", movieId)
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

    // Obtener escenas
    const { data: scenes } = await supabaseAdmin
      .from("scenes")
      .select("id, scene_number, clip_status")
      .eq("movie_id", movieId)
      .order("scene_number", { ascending: true });

    const totalScenes = scenes?.length || 0;
    const completedScenes =
      scenes?.filter((s) => s.clip_status === "completed").length || 0;

    // Calcular progreso basado en el estado
    let progress = 0;
    let currentStep = "";
    let estimatedTimeRemaining: number | null = null;

    switch (movie.status) {
      case "script_generating":
        progress = 10;
        currentStep = "Generando guión...";
        estimatedTimeRemaining = 120; // 2 minutos estimados
        break;
      case "video_generating":
        progress = 20 + Math.floor((completedScenes / totalScenes) * 50);
        currentStep = `Generando video - Escena ${completedScenes + 1} de ${totalScenes}`;
        estimatedTimeRemaining = (totalScenes - completedScenes) * 30; // 30 segundos por escena
        break;
      case "audio_generating":
        progress = 70;
        currentStep = "Generando audio...";
        estimatedTimeRemaining = 60; // 1 minuto estimado
        break;
      case "assembling":
        progress = 90;
        currentStep = "Ensamblando película...";
        estimatedTimeRemaining = 120; // 2 minutos estimados
        break;
      case "completed":
        progress = 100;
        currentStep = "Completada";
        estimatedTimeRemaining = null;
        break;
      case "failed":
        progress = 0;
        currentStep = "Error en la generación";
        estimatedTimeRemaining = null;
        break;
      default:
        progress = 0;
        currentStep = "Pendiente";
        estimatedTimeRemaining = null;
    }

    const response: GenerationProgress = {
      movie_id: movieId,
      status: movie.status,
      progress,
      current_step: currentStep,
      scenes_completed: completedScenes,
      total_scenes: totalScenes,
      estimated_time_remaining: estimatedTimeRemaining,
    };

    return NextResponse.json(response);
  } catch (error: any) {
    console.error("Error in generation progress route:", error);
    return NextResponse.json(
      { error: "Error interno del servidor", details: error.message },
      { status: 500 }
    );
  }
}

