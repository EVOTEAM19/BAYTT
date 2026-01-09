import { createServerSupabaseClient } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { notFound } from "next/navigation";
import { AdminMovieDetailClient } from "./admin-movie-detail-client";

export default async function AdminMovieDetailPage({
  params,
}: {
  params: Promise<{ id: string }> | { id: string };
}) {
  // Manejar tanto el formato nuevo (Promise) como el antiguo
  const resolvedParams = params instanceof Promise ? await params : params
  const movieId = resolvedParams.id

  const supabase = await createServerSupabaseClient();
  const {
    data: { user: currentUser },
  } = await supabase.auth.getUser();

  if (!currentUser) {
    return null;
  }

  // Verificar si es admin o superadmin
  const { data: currentProfile } = await supabaseAdmin
    .from("profiles")
    .select("role")
    .eq("id", currentUser.id)
    .maybeSingle();

  const isSuperAdmin = currentProfile?.role === "superadmin";
  const isAdmin = currentProfile?.role === "admin" || isSuperAdmin;

  if (!isAdmin) {
    notFound();
  }

  // Obtener película con información del creador
  // Nota: En Supabase, para hacer join con otra tabla, usamos la sintaxis correcta
  const { data: movie } = await supabaseAdmin
    .from("movies")
    .select("*")
    .eq("id", movieId)
    .maybeSingle();

  // Obtener información del creador por separado
  let creatorProfile = null;
  if (movie?.user_id) {
    const { data: profile } = await supabaseAdmin
      .from("profiles")
      .select("id, email, full_name, role")
      .eq("id", movie.user_id)
      .maybeSingle();
    creatorProfile = profile;
  }

  if (!movie) {
    notFound();
  }

  // Obtener script si existe
  const { data: script } = await supabaseAdmin
    .from("scripts")
    .select("*")
    .eq("movie_id", movieId)
    .maybeSingle();

  // Obtener escenas si existen (de movie_scenes primero, luego de scenes como fallback)
  let scenes: any[] = []
  const { data: movieScenes = [] } = await supabaseAdmin
    .from("movie_scenes")
    .select("*")
    .eq("movie_id", movieId)
    .order("scene_number", { ascending: true });
  
  if (movieScenes && movieScenes.length > 0) {
    // Convertir movie_scenes al formato esperado por el frontend
    scenes = movieScenes.map((ms: any) => ({
      id: ms.id,
      scene_number: ms.scene_number,
      description: ms.full_scene_description || ms.video_prompt || '',
      dialogue: null, // Se puede extraer de scene_audio si es necesario
      clip_url: ms.video_url, // ⭐ CRÍTICO: video_url se mapea a clip_url para compatibilidad
      clip_status: ms.status, // ⭐ CRÍTICO: status se mapea a clip_status
      video_url: ms.video_url,
      status: ms.status,
      error_message: ms.error_message,
      created_at: ms.created_at,
      updated_at: ms.updated_at
    }))
  } else {
    // Fallback a la tabla antigua 'scenes'
    const { data: oldScenes = [] } = await supabaseAdmin
      .from("scenes")
      .select("*")
      .eq("movie_id", movieId)
      .order("scene_number", { ascending: true });
    scenes = oldScenes || []
  }

  // Obtener planes para mostrar información de disponibilidad
  const { data: plans = [] } = await supabaseAdmin
    .from("plans")
    .select("*")
    .eq("is_active", true);

  return (
    <AdminMovieDetailClient
      movie={{ ...movie, profiles: creatorProfile } as any}
      script={script || null}
      scenes={scenes}
      plans={plans}
      isSuperAdmin={isSuperAdmin}
    />
  );
}

