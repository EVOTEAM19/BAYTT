"use client";

import { useState, useEffect, useMemo } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { useMovies } from "@/hooks/use-movies";
import { MovieGrid } from "@/components/movies/movie-grid";
import { PageHeader } from "@/components/shared/page-header";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { GENRES } from "@/types/movie";
import { Search, Filter } from "lucide-react";

export default function SearchPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState(searchParams.get("q") || "");
  const [filters, setFilters] = useState({
    genre: searchParams.get("genre") || "",
    duration: searchParams.get("duration") || "",
    price: searchParams.get("price") || "",
    rating: searchParams.get("rating") || "",
  });

  const debouncedSearch = useDebounce(searchQuery, 500);

  // Update URL when search or filters change
  useEffect(() => {
    const params = new URLSearchParams();
    if (debouncedSearch) params.set("q", debouncedSearch);
    if (filters.genre) params.set("genre", filters.genre);
    if (filters.duration) params.set("duration", filters.duration);
    if (filters.price) params.set("price", filters.price);
    if (filters.rating) params.set("rating", filters.rating);

    router.replace(`/search?${params.toString()}`, { scroll: false });
  }, [debouncedSearch, filters, router]);

  // Fetch movies
  const { data, isLoading } = useMovies({
    search: debouncedSearch || undefined,
    genre: filters.genre || undefined,
    page: 1,
    pageSize: 50,
  });

  const movies = data?.data || [];

  return (
    <div className="container mx-auto px-4 py-8">
      <PageHeader
        title="Buscar películas"
        subtitle="Encuentra tu próxima película favorita"
      />

      {/* Search Bar */}
      <div className="mb-6">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-foreground-muted" />
          <Input
            type="text"
            placeholder="Buscar por título, género, creador..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 h-12 text-lg"
          />
        </div>
      </div>

      {/* Filters */}
      <Card className="mb-6">
        <CardContent className="p-4">
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-foreground-muted" />
              <span className="text-sm font-medium text-foreground">Filtros:</span>
            </div>

            {/* Genre Filter */}
            <select
              value={filters.genre}
              onChange={(e) =>
                setFilters({ ...filters, genre: e.target.value })
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
              value={filters.duration}
              onChange={(e) =>
                setFilters({ ...filters, duration: e.target.value })
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
              value={filters.price}
              onChange={(e) =>
                setFilters({ ...filters, price: e.target.value })
              }
              className="px-3 py-2 rounded-md bg-card border border-border text-foreground text-sm"
            >
              <option value="">Cualquier precio</option>
              <option value="0-2">Gratis - 2€</option>
              <option value="2-5">2€ - 5€</option>
              <option value="5-10">5€ - 10€</option>
              <option value="10-">Más de 10€</option>
            </select>

            {/* Rating Filter */}
            <select
              value={filters.rating}
              onChange={(e) =>
                setFilters({ ...filters, rating: e.target.value })
              }
              className="px-3 py-2 rounded-md bg-card border border-border text-foreground text-sm"
            >
              <option value="">Cualquier rating</option>
              <option value="4-5">4+ estrellas</option>
              <option value="3-4">3+ estrellas</option>
              <option value="2-3">2+ estrellas</option>
              <option value="1-2">1+ estrella</option>
            </select>

            {/* Clear Filters */}
            {(filters.genre ||
              filters.duration ||
              filters.price ||
              filters.rating) && (
              <button
                onClick={() =>
                  setFilters({ genre: "", duration: "", price: "", rating: "" })
                }
                className="px-4 py-2 text-sm text-foreground-muted hover:text-foreground transition-colors"
              >
                Limpiar
              </button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Results */}
      <div className="mb-4">
        <p className="text-sm text-foreground-muted">
          {isLoading
            ? "Buscando..."
            : `${movies.length} resultado${movies.length !== 1 ? "s" : ""} encontrado${movies.length !== 1 ? "s" : ""}`}
        </p>
      </div>

      <MovieGrid movies={movies} isLoading={isLoading} />
    </div>
  );
}

// Hook de debounce simple
function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
}
