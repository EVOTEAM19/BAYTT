import { createServerSupabaseClient } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { redirect } from "next/navigation";
import { CreateMoviePageClient } from "./create-movie-client";

export default async function CreateMoviePage({
  searchParams,
}: {
  searchParams: { movie_id?: string; step?: string };
}) {
  // Verificar autenticación
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  // Obtener perfil y plan
  const { data: profile } = await supabaseAdmin
    .from("profiles")
    .select("*, plans(*)")
    .eq("id", user.id)
    .maybeSingle();

  if (!profile) {
    redirect("/login");
  }

  // Obtener plan (puede ser array o objeto según Supabase)
  const planData = (profile as any).plans;
  const plan = Array.isArray(planData) ? planData[0] : planData;

  // Verificar límites del plan (superadmin puede crear sin límites)
  const isSuperAdmin = profile.role === "superadmin";
  const canCreateMore =
    isSuperAdmin || profile.movies_created_this_month < (plan?.movies_per_month || 0);

  // Obtener película en progreso si hay movie_id en query params
  let movieInProgress = null;
  if (searchParams.movie_id) {
    const { data: movie } = await supabaseAdmin
      .from("movies")
      .select("*")
      .eq("id", searchParams.movie_id)
      .eq("user_id", user.id)
      .maybeSingle();

    if (movie) {
      movieInProgress = movie;
    }
  } else {
    // Buscar película en progreso del usuario
    const { data: movies } = await supabaseAdmin
      .from("movies")
      .select("*")
      .eq("user_id", user.id)
      .in("status", [
        "script_generating",
        "video_generating",
        "audio_generating",
        "assembling",
      ])
      .order("created_at", { ascending: false })
      .limit(1);

    if (movies && movies.length > 0) {
      movieInProgress = movies[0];
    }
  }

  // Obtener script si la película está en estado de revisión
  let script = null;
  if (movieInProgress && movieInProgress.status === "script_generating") {
    const { data: scriptData } = await supabaseAdmin
      .from("scripts")
      .select("*")
      .eq("movie_id", movieInProgress.id)
      .maybeSingle();

    if (scriptData) {
      script = scriptData;
    }
  }

  return (
    <CreateMoviePageClient
      user={user}
      profile={profile}
      plan={plan}
      canCreateMore={canCreateMore}
      movieInProgress={movieInProgress}
      script={script}
      searchParams={searchParams}
      isSuperAdmin={isSuperAdmin}
    />
  );
}
