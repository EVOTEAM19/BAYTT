import { createServerSupabaseClient } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { notFound } from "next/navigation";
import { MovieDetailClient } from "./movie-detail-client";

export default async function MovieDetailPage({
  params,
}: {
  params: { id: string };
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

  // Obtener película con verificación de acceso por plan
  let movieQuery = supabaseAdmin
    .from("movies")
    .select("*")
    .eq("id", params.id)
    .eq("is_published", true)
    .eq("status", "completed");

  // Si hay usuario, verificar que tenga acceso según su plan
  if (userPlanId) {
    movieQuery = movieQuery.or(
      `available_plans.is.null,available_plans.cs.{${userPlanId}}`
    );
  } else {
    // Usuario no autenticado: solo películas disponibles para todos
    movieQuery = movieQuery.is("available_plans", null);
  }

  const { data: movie } = await movieQuery.maybeSingle();

  if (!movie) {
    notFound();
  }

  // Obtener creador
  const { data: creator } = await supabaseAdmin
    .from("profiles")
    .select("id, full_name, avatar_url")
    .eq("id", movie.user_id)
    .maybeSingle();

  // Verificar si está alquilada (si hay usuario)
  let rental = null;
  if (user) {
    const { data: rentalData } = await supabaseAdmin
      .from("rentals")
      .select("*")
      .eq("movie_id", movie.id)
      .eq("user_id", user.id)
      .eq("payment_status", "completed")
      .gt("rental_end", new Date().toISOString())
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    rental = rentalData;
  }

  // Obtener películas similares (mismo género) con filtro de plan
  let similarQuery = supabaseAdmin
    .from("movies")
    .select("*")
    .eq("is_published", true)
    .eq("status", "completed")
    .eq("genre", movie.genre)
    .neq("id", movie.id);

  if (userPlanId) {
    similarQuery = similarQuery.or(
      `available_plans.is.null,available_plans.cs.{${userPlanId}}`
    );
  } else {
    similarQuery = similarQuery.is("available_plans", null);
  }

  const { data: similarMovies = [] } = await similarQuery
    .order("views_count", { ascending: false })
    .limit(20);

  // Obtener reviews (si hay tabla de reviews)
  // Por ahora, usamos average_rating del movie

  return (
    <MovieDetailClient
      movie={movie}
      creator={creator}
      rental={rental}
      similarMovies={similarMovies}
      user={user}
    />
  );
}

function MovieDetailClient({
  movie,
  creator,
  rental,
  similarMovies,
  user,
}: {
  movie: any;
  creator: any;
  rental: any;
  similarMovies: any[];
  user: any;
}) {
  const genre = GENRES.find((g) => g.id === movie.genre);
  const trailerUrl = (movie as any).trailer_url || movie.video_url_1080p;
  const backdropUrl = movie.thumbnail_url || "/placeholder-backdrop.jpg";
  const posterUrl = movie.thumbnail_url || "/placeholder-poster.jpg";
  const releaseYear = new Date(movie.created_at).getFullYear();

  const isRented = !!rental;
  const rentalEnd = rental?.rental_end
    ? new Date(rental.rental_end)
    : null;
  const hoursRemaining = rentalEnd
    ? Math.max(0, Math.floor((rentalEnd.getTime() - Date.now()) / (1000 * 60 * 60)))
    : 0;

  return (
    <div className="min-h-screen bg-background">
      {/* Backdrop */}
      <div className="relative w-full h-[60vh] md:h-[70vh] overflow-hidden">
        {trailerUrl ? (
          <video
            src={trailerUrl}
            autoPlay
            muted
            loop
            playsInline
            className="absolute inset-0 w-full h-full object-cover"
          />
        ) : (
          <div
            className="absolute inset-0 w-full h-full bg-cover bg-center"
            style={{ backgroundImage: `url(${backdropUrl})` }}
          />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/80 to-transparent" />
      </div>

      {/* Content */}
      <div className="container mx-auto px-4 -mt-32 relative z-10">
        <div className="flex flex-col md:flex-row gap-8">
          {/* Poster */}
          <div className="flex-shrink-0">
            <div className="relative w-48 md:w-64 aspect-[2/3] rounded-lg overflow-hidden shadow-card-hover">
              <Image
                src={posterUrl}
                alt={movie.title}
                fill
                className="object-cover"
                sizes="(max-width: 768px) 192px, 256px"
              />
            </div>
          </div>

          {/* Info */}
          <div className="flex-1 space-y-6 pb-8">
            {/* Title and Meta */}
            <div>
              <h1 className="text-4xl md:text-5xl font-bold text-foreground mb-4">
                {movie.title}
              </h1>
              <div className="flex flex-wrap items-center gap-4 text-sm text-foreground-muted">
                <span>{releaseYear}</span>
                {movie.duration_minutes && (
                  <span>{formatDuration(movie.duration_minutes)}</span>
                )}
                {genre && (
                  <span className="flex items-center gap-1">
                    {genre.icon} {genre.name}
                  </span>
                )}
                {movie.average_rating && (
                  <span className="flex items-center gap-1">
                    ⭐ {movie.average_rating.toFixed(1)}
                  </span>
                )}
              </div>
            </div>

            {/* Actions */}
            <div className="flex flex-wrap gap-4">
              {isRented ? (
                <>
                  <a
                    href={`/watch/${movie.id}`}
                    className="px-6 py-3 bg-primary text-primary-foreground rounded-md font-semibold hover:bg-primary-hover transition-colors inline-flex items-center gap-2"
                  >
                    ▶ Ver ahora
                  </a>
                  {hoursRemaining > 0 && (
                    <div className="px-4 py-3 bg-card border border-border rounded-md">
                      <span className="text-sm text-foreground-muted">
                        Tiempo restante: {hoursRemaining}h
                      </span>
                    </div>
                  )}
                </>
              ) : (
                <>
                  {movie.rental_price ? (
                    <RentButton movie={movie} price={movie.rental_price} />
                  ) : (
                    <a
                      href={`/watch/${movie.id}`}
                      className="px-6 py-3 bg-primary text-primary-foreground rounded-md font-semibold hover:bg-primary-hover transition-colors inline-flex items-center gap-2"
                    >
                      ▶ Ver ahora
                    </a>
                  )}
                </>
              )}
              <button className="px-6 py-3 bg-card border border-border rounded-md font-semibold hover:bg-card-hover transition-colors">
                + Mi Lista
              </button>
            </div>

            {/* Description */}
            {movie.description && (
              <div>
                <h2 className="text-xl font-semibold text-foreground mb-2">
                  Sinopsis
                </h2>
                <p className="text-foreground-muted leading-relaxed">
                  {movie.description}
                </p>
              </div>
            )}

            {/* Creator */}
            {creator && (
              <div className="flex items-center gap-3">
                <span className="text-sm text-foreground-muted">Creador:</span>
                <a
                  href={`/profile/${creator.id}`}
                  className="flex items-center gap-2 hover:text-primary transition-colors"
                >
                  {creator.avatar_url ? (
                    <Image
                      src={creator.avatar_url}
                      alt={creator.full_name || "Creador"}
                      width={32}
                      height={32}
                      className="rounded-full"
                    />
                  ) : (
                    <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-primary-foreground text-sm font-semibold">
                      {(creator.full_name || "U")[0].toUpperCase()}
                    </div>
                  )}
                  <span className="font-medium text-foreground">
                    {creator.full_name || "Usuario"}
                  </span>
                </a>
              </div>
            )}

            {/* Stats */}
            <div className="flex flex-wrap gap-6 text-sm">
              {movie.views_count > 0 && (
                <div>
                  <span className="text-foreground-muted">Vistas: </span>
                  <span className="text-foreground font-semibold">
                    {movie.views_count.toLocaleString()}
                  </span>
                </div>
              )}
              {movie.rentals_count > 0 && (
                <div>
                  <span className="text-foreground-muted">Alquileres: </span>
                  <span className="text-foreground font-semibold">
                    {movie.rentals_count.toLocaleString()}
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Similar Movies */}
        {similarMovies.length > 0 && (
          <div className="mt-12">
            <h2 className="text-2xl font-bold text-foreground mb-6">
              Películas similares
            </h2>
            <MovieCarousel
              title=""
              movies={similarMovies}
              variant="poster"
            />
          </div>
        )}
      </div>
    </div>
  );
}

function RentButton({ movie, price }: { movie: any; price: number }) {
  return (
    <button
      onClick={() => {
        // TODO: Abrir modal de pago
        alert(`Alquilar por ${formatPrice(price)}`);
      }}
      className="px-6 py-3 bg-primary text-primary-foreground rounded-md font-semibold hover:bg-primary-hover transition-colors"
    >
      Alquilar por {formatPrice(price)}
    </button>
  );
}
