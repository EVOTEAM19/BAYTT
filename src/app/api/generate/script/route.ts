// ============================================
// BAYTT - Generate Script API Route
// ============================================

import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { generateScript } from "@/lib/ai/script-generator";
import { createMovieSchema } from "@/lib/utils/validators";

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

    // Obtener perfil y plan
    const { data: profile } = await supabaseAdmin
      .from("profiles")
      .select("*, plans(*)")
      .eq("id", user.id)
      .maybeSingle();

    if (!profile) {
      return NextResponse.json({ error: "Perfil no encontrado" }, { status: 404 });
    }

    // Obtener plan (puede ser array o objeto según Supabase)
    const planData = (profile as any).plans;
    const plan = Array.isArray(planData) ? planData[0] : planData;

    // Verificar límites del plan
    if (profile.movies_created_this_month >= (plan?.movies_per_month || 0)) {
      return NextResponse.json(
        { error: "Has alcanzado el límite de películas de tu plan" },
        { status: 403 }
      );
    }

    // Parsear y validar request
    const body = await request.json();
    const validated = createMovieSchema.parse(body);
    const { use_random_characters, random_characters_count } = body;

    // Crear movie en estado 'script_generating'
    const { data: movie, error: movieError } = await supabaseAdmin
      .from("movies")
      .insert({
        user_id: user.id,
        title: validated.title,
        description: validated.description,
        genre: validated.genre,
        duration_minutes: validated.duration_minutes,
        user_prompt: validated.user_prompt,
        user_plot: validated.user_plot,
        user_ending: validated.user_ending,
        ending_type: validated.ending_type,
        status: "script_generating",
        progress: 10,
      })
      .select()
      .single();

    if (movieError || !movie) {
      return NextResponse.json(
        { error: "Error al crear película", details: movieError },
        { status: 500 }
      );
    }

    // Obtener nombres de personajes
    let characterNames: string[] = [];
    
    // Si se usan personajes aleatorios, generarlos primero
    if (use_random_characters) {
      try {
        const randomCharsResponse = await fetch(
          `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/characters/generate-from-movie`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              user_prompt: validated.user_prompt,
              user_plot: validated.user_plot,
              genre: validated.genre,
              count: random_characters_count || 3
            })
          }
        );

        if (randomCharsResponse.ok) {
          const { characters } = await randomCharsResponse.json();
          characterNames = characters?.map((c: any) => c.name) || [];
          
          // Guardar los personajes generados en la base de datos (opcional, para referencia futura)
          // Por ahora solo usamos los nombres para el script
        }
      } catch (err) {
        console.error('Error generating random characters:', err);
        // Continuar sin personajes si falla la generación
      }
    } else if (validated.character_ids && validated.character_ids.length > 0) {
      // Obtener nombres de personajes de la librería
      const { data: characters } = await supabaseAdmin
        .from("characters")
        .select("name")
        .in("id", validated.character_ids);

      characterNames = characters?.map((c) => c.name) || [];
    }

    // Registrar job de generación
    const jobId = crypto.randomUUID();
    await supabaseAdmin.from("generation_jobs").insert({
      id: jobId,
      movie_id: movie.id,
      job_type: "script",
      status: "processing",
      input_data: { ...validated, character_names: characterNames },
    });

    try {
      // Generar guión
      const script = await generateScript({
        movie_id: movie.id,
        user_prompt: validated.user_prompt,
        user_plot: validated.user_plot,
        user_ending: validated.user_ending,
        genre: validated.genre,
        duration_minutes: validated.duration_minutes,
        character_ids: validated.character_ids,
        character_names: characterNames,
      });

      // Guardar script en DB
      const { error: scriptError } = await supabaseAdmin.from("scripts").insert({
        movie_id: movie.id,
        full_text: script.full_text,
        summary: script.summary,
        total_scenes: script.total_scenes,
        is_approved: false,
      });

      if (scriptError) {
        throw new Error(`Error guardando script: ${scriptError.message}`);
      }

      // Guardar escenas en DB
      const scenesToInsert = script.scenes.map((scene) => ({
        movie_id: movie.id,
        scene_number: scene.scene_number,
        description: scene.description,
        dialogue: scene.dialogue,
        character_ids: scene.characters,
        visual_prompt: scene.visual_prompt,
        audio_prompt: scene.audio_prompt,
        music_mood: scene.music_mood,
        clip_status: "pending",
        visual_context: scene.transition_to_next || null,
      }));

      const { error: scenesError } = await supabaseAdmin
        .from("scenes")
        .insert(scenesToInsert);

      if (scenesError) {
        throw new Error(`Error guardando escenas: ${scenesError.message}`);
      }

      // Actualizar movie a 'script_review' (o 'video_generating' si auto-aprobado)
      await supabaseAdmin
        .from("movies")
        .update({
          status: "script_generating", // Cambiar a 'video_generating' si se auto-aprueba
          progress: 20,
        })
        .eq("id", movie.id);

      // Actualizar job como completado
      await supabaseAdmin
        .from("generation_jobs")
        .update({
          status: "completed",
          output_data: { script_id: script.movie_id, total_scenes: script.total_scenes },
        })
        .eq("id", jobId);

      // Incrementar contador de películas del mes
      await supabaseAdmin
        .from("profiles")
        .update({
          movies_created_this_month: profile.movies_created_this_month + 1,
        })
        .eq("id", user.id);

      return NextResponse.json({
        success: true,
        movie_id: movie.id,
        script: {
          summary: script.summary,
          total_scenes: script.total_scenes,
          scenes: script.scenes,
        },
      });
    } catch (error: any) {
      // Actualizar movie a 'failed'
      await supabaseAdmin
        .from("movies")
        .update({
          status: "failed",
          progress: 0,
        })
        .eq("id", movie.id);

      // Actualizar job como fallido
      await supabaseAdmin
        .from("generation_jobs")
        .update({
          status: "failed",
          error_message: error.message || "Error desconocido",
        })
        .eq("id", jobId);

      return NextResponse.json(
        {
          error: "Error generando guión",
          details: error.message,
        },
        { status: 500 }
      );
    }
  } catch (error: any) {
    console.error("Error in generate script route:", error);
    return NextResponse.json(
      { error: "Error interno del servidor", details: error.message },
      { status: 500 }
    );
  }
}
