"use client";

import { useState, useMemo } from "react";
import type { Movie } from "@/types/database";
import { GENRES, DURATIONS } from "@/types/movie";
import { MovieCard } from "./movie-card";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Film, Filter } from "lucide-react";
import { cn } from "@/lib/utils/cn";

interface MovieGridProps {
  movies: Movie[];
  isLoading?: boolean;
  hasMore?: boolean;
  onLoadMore?: () => void;
  onMovieClick?: (movie: Movie) => void;
}

interface Filters {
  genre: string | null;
  duration: string | null;
  priceRange: string | null;
}

export function MovieGrid({
  movies,
  isLoading = false,
  hasMore = false,
  onLoadMore,
  onMovieClick,
}: MovieGridProps) {
  const [filters, setFilters] = useState<Filters>({
    genre: null,
    duration: null,
    priceRange: null,
  });

  const filteredMovies = useMemo(() => {
    let filtered = [...movies];

    if (filters.genre) {
      filtered = filtered.filter((m) => m.genre === filters.genre);
    }

    if (filters.duration) {
      const [min, max] = filters.duration.split("-").map(Number);
      filtered = filtered.filter((m) => {
        if (!m.duration_minutes) return false;
        if (max) {
          return m.duration_minutes >= min && m.duration_minutes <= max;
        }
        return m.duration_minutes >= min;
      });
    }

    if (filters.priceRange) {
      const [min, max] = filters.priceRange.split("-").map(Number);
      filtered = filtered.filter((m) => {
        if (!m.rental_price) return false;
        if (max) {
          return m.rental_price >= min && m.rental_price <= max;
        }
        return m.rental_price >= min;
      });
    }

    return filtered;
  }, [movies, filters]);

  const hasActiveFilters = Object.values(filters).some((f) => f !== null);

  if (isLoading && movies.length === 0) {
    return (
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
        {Array.from({ length: 12 }).map((_, i) => (
          <Skeleton key={i} className="aspect-[2/3] w-full" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-foreground-muted" />
              <span className="text-sm font-medium text-foreground">Filtros:</span>
            </div>

            {/* Genre Filter */}
            <select
              value={filters.genre || ""}
              onChange={(e) =>
                setFilters({ ...filters, genre: e.target.value || null })
              }
              className="px-3 py-2 rounded-md bg-card border border-border text-foreground text-sm"
            >
              <option value="">Todos los géneros</option>
              {GENRES.map((genre) => (
                <option key={genre.id} value={genre.id}>
                  {genre.icon} {genre.name}
                </option>
              ))}
            </select>

            {/* Duration Filter */}
            <select
              value={filters.duration || ""}
              onChange={(e) =>
                setFilters({ ...filters, duration: e.target.value || null })
              }
              className="px-3 py-2 rounded-md bg-card border border-border text-foreground text-sm"
            >
              <option value="">Cualquier duración</option>
              <option value="1-10">Menos de 10 min</option>
              <option value="10-20">10-20 min</option>
              <option value="20-30">20-30 min</option>
              <option value="30-60">30-60 min</option>
              <option value="60-">Más de 60 min</option>
            </select>

            {/* Price Filter */}
            <select
              value={filters.priceRange || ""}
              onChange={(e) =>
                setFilters({ ...filters, priceRange: e.target.value || null })
              }
              className="px-3 py-2 rounded-md bg-card border border-border text-foreground text-sm"
            >
              <option value="">Cualquier precio</option>
              <option value="0-2">Gratis - 2€</option>
              <option value="2-5">2€ - 5€</option>
              <option value="5-10">5€ - 10€</option>
              <option value="10-">Más de 10€</option>
            </select>

            {/* Clear Filters */}
            {hasActiveFilters && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() =>
                  setFilters({ genre: null, duration: null, priceRange: null })
                }
              >
                Limpiar
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Results Count */}
      <div className="text-sm text-foreground-muted">
        {filteredMovies.length} película{filteredMovies.length !== 1 ? "s" : ""}{" "}
        encontrada{filteredMovies.length !== 1 ? "s" : ""}
      </div>

      {/* Empty State */}
      {filteredMovies.length === 0 && (
        <Card>
          <CardContent className="p-12 text-center">
            <Film className="h-16 w-16 text-foreground-muted mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-foreground mb-2">
              No se encontraron películas
            </h3>
            <p className="text-foreground-muted">
              {hasActiveFilters
                ? "Intenta ajustar los filtros para ver más resultados"
                : "No hay películas disponibles en este momento"}
            </p>
            {hasActiveFilters && (
              <Button
                variant="secondary"
                className="mt-4"
                onClick={() =>
                  setFilters({ genre: null, duration: null, priceRange: null })
                }
              >
                Limpiar Filtros
              </Button>
            )}
          </CardContent>
        </Card>
      )}

      {/* Grid */}
      {filteredMovies.length > 0 && (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
            {filteredMovies.map((movie) => (
              <MovieCard
                key={movie.id}
                movie={movie}
                variant="poster"
                onPlay={onMovieClick}
              />
            ))}
          </div>

          {/* Load More */}
          {hasMore && onLoadMore && (
            <div className="flex justify-center pt-8">
              <Button variant="secondary" onClick={onLoadMore} disabled={isLoading}>
                {isLoading ? "Cargando..." : "Cargar más"}
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
