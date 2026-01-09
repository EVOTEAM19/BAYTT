"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { GENRES } from "@/types/movie";
import { formatDuration, formatPrice } from "@/lib/utils/formatters";
import { MovieCard } from "@/components/movies/movie-card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useState } from "react";
import { Plus, Star } from "lucide-react";

interface MovieDetailClientProps {
  movie: any;
  creator: any;
  rental: any;
  similarMovies: any[];
  user: any;
}

export function MovieDetailClient({
  movie,
  creator,
  rental,
  similarMovies,
  user,
}: MovieDetailClientProps) {
  const router = useRouter();
  const [showRentModal, setShowRentModal] = useState(false);

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

  const handleRent = () => {
    if (!user) {
      router.push("/login");
      return;
    }
    setShowRentModal(true);
  };

  const handleWatch = () => {
    router.push(`/watch/${movie.id}`);
  };

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
                    <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                    {movie.average_rating.toFixed(1)}
                  </span>
                )}
              </div>
            </div>

            {/* Actions */}
            <div className="flex flex-wrap gap-4">
              {isRented ? (
                <>
                  <Button variant="default" size="lg" onClick={handleWatch}>
                    ▶ Ver ahora
                  </Button>
                  {hoursRemaining > 0 && (
                    <div className="px-4 py-3 bg-card border border-border rounded-md flex items-center">
                      <span className="text-sm text-foreground-muted">
                        Tiempo restante: {hoursRemaining}h
                      </span>
                    </div>
                  )}
                </>
              ) : (
                <>
                  {movie.rental_price ? (
                    <Button variant="default" size="lg" onClick={handleRent}>
                      Alquilar por {formatPrice(movie.rental_price)}
                    </Button>
                  ) : (
                    <Button variant="default" size="lg" onClick={handleWatch}>
                      ▶ Ver ahora
                    </Button>
                  )}
                </>
              )}
              <Button variant="secondary" size="lg">
                <Plus className="h-4 w-4 mr-2" />
                Mi Lista
              </Button>
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
            {similarMovies.length > 0 && (
              <div className="flex gap-4 overflow-x-auto scrollbar-hide snap-x snap-mandatory">
                {similarMovies.map((movie) => (
                  <div
                    key={movie.id}
                    className="flex-shrink-0 snap-start w-32 sm:w-40 md:w-48"
                  >
                    <MovieCard movie={movie} variant="poster" />
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Rent Modal */}
      <Dialog open={showRentModal} onOpenChange={setShowRentModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Alquilar película</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-foreground-muted">
              ¿Deseas alquilar "{movie.title}" por {formatPrice(movie.rental_price)}?
            </p>
            <p className="text-sm text-foreground-muted">
              Tendrás acceso durante 48 horas desde el momento del pago.
            </p>
            <div className="flex gap-4">
              <Button
                variant="secondary"
                onClick={() => setShowRentModal(false)}
                className="flex-1"
              >
                Cancelar
              </Button>
              <Button
                variant="default"
                onClick={async () => {
                  try {
                    const response = await fetch(`/api/movies/${movie.id}/rent`, {
                      method: "POST",
                    });
                    const data = await response.json();
                    if (response.ok) {
                      router.push(`/watch/${movie.id}`);
                    } else {
                      alert(data.error || "Error al alquilar la película");
                    }
                  } catch (error) {
                    alert("Error al alquilar la película");
                  }
                  setShowRentModal(false);
                }}
                className="flex-1"
              >
                Proceder al pago
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

