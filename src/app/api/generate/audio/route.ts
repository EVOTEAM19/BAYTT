// ============================================
// BAYTT - Generate Audio API Route
// ============================================

import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { generateVoice, generateVoiceBatch } from "@/lib/ai/audio-generator";

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
    const { scene_id, type = "dialogue" } = body; // dialogue o effects

    if (!scene_id) {
      return NextResponse.json(
        { error: "scene_id es requerido" },
        { status: 400 }
      );
    }

    // Obtener escena
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

    // Verificar autorización
    if (movie.user_id !== user.id) {
      return NextResponse.json(
        { error: "No autorizado" },
        { status: 403 }
      );
    }

    // Registrar job
    const jobId = crypto.randomUUID();
    await supabaseAdmin.from("generation_jobs").insert({
      id: jobId,
      movie_id: movie.id,
      scene_id: scene.id,
      job_type: "audio",
      status: "processing",
      input_data: { scene_id, type },
    });

    try {
      if (type === "dialogue" && scene.dialogue) {
        // Obtener personajes de la escena
        const { data: characters } = await supabaseAdmin
          .from("characters")
          .select("id, name, voice_id, voice_provider_id")
          .in("id", scene.character_ids || []);

        // Generar audio para diálogo
        // Por simplicidad, asumimos un solo diálogo por escena
        // En producción, podrías necesitar parsear múltiples diálogos
        const audio = await generateVoice({
          text: scene.dialogue,
          character_id: characters?.[0]?.id,
          voice_id: characters?.[0]?.voice_id || "default",
        });

        // Guardar URL de audio
        const { error: updateError } = await supabaseAdmin
          .from("scenes")
          .update({
            audio_dialogue_url: audio.audio_url,
          })
          .eq("id", scene.id);

        if (updateError) {
          throw new Error(`Error actualizando escena: ${updateError.message}`);
        }

        // Actualizar job
        await supabaseAdmin
          .from("generation_jobs")
          .update({
            status: "completed",
            output_data: { audio_url: audio.audio_url },
            cost: audio.cost,
          })
          .eq("id", jobId);

        return NextResponse.json({
          success: true,
          audio_url: audio.audio_url,
          duration: audio.duration,
          cost: audio.cost,
        });
      } else if (type === "effects") {
        // Generar efectos de sonido (si hay audio_prompt)
        if (scene.audio_prompt) {
          // Por ahora, retornamos placeholder
          // En producción, podrías usar un servicio de efectos de sonido
          const effectsUrl = `/api/mock/effects/${scene.id}.mp3`;

          await supabaseAdmin
            .from("scenes")
            .update({
              // Guardar URL de efectos si hay campo en DB
            })
            .eq("id", scene.id);

          await supabaseAdmin
            .from("generation_jobs")
            .update({
              status: "completed",
              output_data: { effects_url: effectsUrl },
              cost: 0,
            })
            .eq("id", jobId);

          return NextResponse.json({
            success: true,
            effects_url: effectsUrl,
          });
        }
      }

      return NextResponse.json({
        success: true,
        message: "No hay audio para generar",
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
          error: "Error generando audio",
          details: error.message,
        },
        { status: 500 }
      );
    }
  } catch (error: any) {
    console.error("Error in generate audio route:", error);
    return NextResponse.json(
      { error: "Error interno del servidor", details: error.message },
      { status: 500 }
    );
  }
}
