import { createServerSupabaseClient } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { redirect, notFound } from "next/navigation";
import { MoviePlayer } from "@/components/movies/movie-player";

export default async function WatchPage({
  params,
}: {
  params: Promise<{ id: string }> | { id: string };
}) {
  // Manejar tanto el formato nuevo (Promise) como el antiguo
  const resolvedParams = params instanceof Promise ? await params : params;
  const movieId = resolvedParams.id;

  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Verificar si el usuario es superadmin o admin
  let isSuperAdmin = false;
  let isAdmin = false;
  if (user) {
    const { data: profile } = await supabaseAdmin
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .maybeSingle();
    isSuperAdmin = profile?.role === "superadmin";
    isAdmin = profile?.role === "admin" || isSuperAdmin;
  }

  // Obtener película - si es admin/superadmin, no filtrar por status
  let movieQuery = supabaseAdmin
    .from("movies")
    .select("*")
    .eq("id", movieId);

  // Si no es admin, solo mostrar películas completadas
  if (!isAdmin) {
    movieQuery = movieQuery.eq("status", "completed");
  }

  const { data: movie } = await movieQuery.maybeSingle();

  if (!movie) {
    notFound();
  }

  // Verificar si el usuario tiene acceso (creador, alquilada, gratis, o es admin)
  const isCreator = user && movie.user_id === user.id;
  const isFree = !movie.rental_price || movie.rental_price === 0;

  // Los admins/superadmins tienen acceso completo
  if (!isAdmin && !isCreator && !isFree) {
    // Verificar si tiene un alquiler activo
    if (user) {
      const { data: rental } = await supabaseAdmin
        .from("rentals")
        .select("*")
        .eq("movie_id", movieId)
        .eq("user_id", user.id)
        .eq("payment_status", "completed")
        .gt("rental_end", new Date().toISOString())
        .maybeSingle();

      if (!rental) {
        redirect(`/movie/${movieId}`);
      }
    } else {
      redirect(`/movie/${movieId}`);
    }
  }

  // Siempre obtener escenas para verificar si hay múltiples escenas
  const { data: movieScenes } = await supabaseAdmin
    .from('movie_scenes')
    .select('video_url, scene_number, status')
    .eq('movie_id', movieId)
    .eq('status', 'completed')
    .not('video_url', 'is', null)
    .order('scene_number', { ascending: true });
  
  const sceneVideos: string[] = [];
  if (movieScenes && movieScenes.length > 0) {
    const validScenes = movieScenes
      .map((s: any) => s.video_url)
      .filter((url: string | null) => url && url.trim() !== '' && url !== 'null' && url !== 'undefined');
    
    sceneVideos.push(...validScenes);
    console.log(`[WATCH PAGE] Found ${sceneVideos.length} scene videos`);
  }

  // Determinar si usar video ensamblado real o reproducción secuencial
  const metadata = (movie.metadata as any) || {};
  
  // Verificar si hay un video realmente ensamblado
  // Un video ensamblado real:
  // 1. Tiene video_url que apunta a R2 o storage (no a Runway directamente)
  // 2. O tiene video_url_4k/1080p/720p
  // 3. O metadata indica que el ensamblaje se completó exitosamente
  const hasRealAssembledVideo = !!(
    movie.video_url_4k || 
    movie.video_url_1080p || 
    movie.video_url_720p ||
    (movie.video_url && (
      movie.video_url.includes('r2.dev') ||
      movie.video_url.includes('r2.baytt.com') ||
      movie.video_url.includes('storage.baytt.com') ||
      movie.video_url.includes('supabase.co/storage') ||
      metadata.assembly_status === 'completed'
    ))
  );
  
  // Usar reproducción secuencial SOLO si:
  // - Hay múltiples escenas
  // - NO hay video ensamblado real
  // - El video_url actual es una URL de Runway (temporal)
  const isRunwayUrl = movie.video_url && (
    movie.video_url.includes('cloudfront.net') ||
    movie.video_url.includes('runway') ||
    movie.video_url.includes('cdn.runwayml.com')
  );
  
  const useSequentialPlayback = sceneVideos.length > 1 && !hasRealAssembledVideo && isRunwayUrl;

  // Obtener URL de video según calidad disponible (para referencia, pero puede no usarse si es reproducción secuencial)
  const videoUrl =
    movie.video_url_4k ||
    movie.video_url_1080p ||
    movie.video_url_720p ||
    movie.video_url ||
    (sceneVideos.length > 0 ? sceneVideos[0] : null);

  if (!videoUrl && sceneVideos.length === 0) {
    console.error('[WATCH PAGE] No video URL found for movie:', movie.id);
    console.error('[WATCH PAGE] Available video fields:', {
      video_url: movie.video_url,
      video_url_720p: movie.video_url_720p,
      video_url_1080p: movie.video_url_1080p,
      video_url_4k: movie.video_url_4k,
      scene_count: movieScenes?.length || 0
    });
    notFound();
  }
  
  if (useSequentialPlayback) {
    console.log(`[WATCH PAGE] ✅ Using sequential playback for ${sceneVideos.length} scenes`);
    console.log(`[WATCH PAGE] Scene URLs:`, sceneVideos.map((url, i) => `${i + 1}: ${url.substring(0, 80)}...`));
  } else if (hasRealAssembledVideo) {
    console.log('[WATCH PAGE] ✅ Using assembled video:', videoUrl?.substring(0, 100));
  } else {
    console.log('[WATCH PAGE] Using single video URL:', videoUrl?.substring(0, 100));
  }

  // Pasar el objeto movie completo al MoviePlayer, incluyendo las escenas si hay múltiples
  // Usar reproducción secuencial si hay más de 1 escena y el video parece ser temporal
  return (
    <MoviePlayer
      movie={movie as any}
      quality="1080p"
      sceneVideos={useSequentialPlayback && sceneVideos.length > 1 ? sceneVideos : undefined}
    />
  );
}
