import { createServerSupabaseClient } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { MovieHero } from "@/components/movies/movie-hero";
import { MovieCarousel } from "@/components/movies/movie-carousel";
import { GENRES } from "@/types/movie";

export default async function BrowsePage() {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Obtener plan del usuario si está autenticado
  let userPlanId: string | null = null;
  if (user) {
    const { data: profile } = await supabaseAdmin
      .from("profiles")
      .select("plan_id")
      .eq("id", user.id)
      .single();
    userPlanId = profile?.plan_id || null;
  }

  // Función helper para filtrar por plan
  const getPlanFilter = () => {
    if (!userPlanId) {
      // Usuario no autenticado: solo películas disponibles para todos
      return supabaseAdmin
        .from("movies")
        .select("*")
        .eq("is_published", true)
        .eq("status", "completed")
        .is("available_plans", null);
    }
    // Usuario autenticado: películas disponibles para todos O para su plan
    return supabaseAdmin
      .from("movies")
      .select("*")
      .eq("is_published", true)
      .eq("status", "completed")
      .or(`available_plans.is.null,available_plans.cs.{${userPlanId}}`);
  };

  // Obtener película destacada (más reciente publicada)
  const { data: featuredMovie } = await getPlanFilter()
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  // Obtener películas destacadas para hero (top 5 más recientes)
  const { data: featuredMovies = [] } = await getPlanFilter()
    .order("created_at", { ascending: false })
    .limit(5);

  // Tendencias (más vistas)
  const { data: trendingMovies = [] } = await getPlanFilter()
    .order("views_count", { ascending: false })
    .limit(20);

  // Nuevas (más recientes)
  const { data: newMovies = [] } = await getPlanFilter()
    .order("created_at", { ascending: false })
    .limit(20);

  // Mejor valoradas
  const { data: topRatedMovies = [] } = await getPlanFilter()
    .not("average_rating", "is", null)
    .order("average_rating", { ascending: false })
    .limit(20);

  return (
    <div className="space-y-8 pb-8">
      {/* Hero Section */}
      {featuredMovies.length > 0 && (
        <MovieHero movies={featuredMovies} autoRotate={true} />
      )}

      {/* Carousels */}
      <div className="container mx-auto px-4 space-y-12">
        {/* Tendencias */}
        {trendingMovies.length > 0 && (
          <MovieCarousel
            title="Tendencias"
            movies={trendingMovies}
            variant="poster"
          />
        )}

        {/* Nuevas */}
        {newMovies.length > 0 && (
          <MovieCarousel
            title="Nuevas"
            movies={newMovies}
            variant="poster"
          />
        )}

        {/* Mejor valoradas */}
        {topRatedMovies.length > 0 && (
          <MovieCarousel
            title="Mejor valoradas"
            movies={topRatedMovies}
            variant="poster"
          />
        )}

        {/* Carousels por género */}
        {GENRES.map((genre) => (
          <GenreCarousel key={genre.id} genre={genre.id} genreName={genre.name} />
        ))}
      </div>
    </div>
  );
}

async function GenreCarousel({
  genre,
  genreName,
}: {
  genre: string;
  genreName: string;
}) {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Obtener plan del usuario si está autenticado
  let userPlanId: string | null = null;
  if (user) {
    const { data: profile } = await supabaseAdmin
      .from("profiles")
      .select("plan_id")
      .eq("id", user.id)
      .single();
    userPlanId = profile?.plan_id || null;
  }

  // Filtrar por plan
  let query = supabaseAdmin
    .from("movies")
    .select("*")
    .eq("is_published", true)
    .eq("status", "completed")
    .eq("genre", genre);

  if (!userPlanId) {
    query = query.is("available_plans", null);
  } else {
    query = query.or(
      `available_plans.is.null,available_plans.cs.{${userPlanId}}`
    );
  }

  const { data: movies = [] } = await query
    .order("views_count", { ascending: false })
    .limit(20);

  if (movies.length === 0) {
    return null;
  }

  return (
    <MovieCarousel
      title={genreName}
      movies={movies}
      variant="poster"
    />
  );
}
