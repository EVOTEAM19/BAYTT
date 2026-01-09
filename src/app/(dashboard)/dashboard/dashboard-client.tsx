"use client";

import { useRouter } from "next/navigation";
import type { User } from "@supabase/supabase-js";
import type { Profile, Plan, Movie, Rental } from "@/types/database";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { MovieCard } from "@/components/movies/movie-card";
import { GenerationProgress } from "@/components/create/generation-progress";
import { formatPrice } from "@/lib/utils/formatters";
import { formatDate } from "@/lib/utils/formatters";
import {
  Film,
  TrendingUp,
  DollarSign,
  Play,
  Plus,
  Compass,
  CreditCard,
  Clock,
} from "lucide-react";
import Link from "next/link";

interface DashboardClientProps {
  user: User;
  profile: Profile;
  plan: Plan | null;
  stats: {
    totalMovies: number;
    publishedMovies: number;
    activeRentals: number;
    totalEarnings: number;
    totalViews: number;
    totalRentals: number;
  };
  inProgressMovies: Movie[];
  activeRentals: (Rental & { movies: Movie })[];
  recentMovies: Movie[];
}

export function DashboardClient({
  user,
  profile,
  plan,
  stats,
  inProgressMovies,
  activeRentals,
  recentMovies,
}: DashboardClientProps) {
  const router = useRouter();
  const userName = profile.full_name || user.email?.split("@")[0] || "Usuario";

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-foreground">
          Hola, {userName}
        </h1>
        <p className="text-foreground-muted mt-1">
          Bienvenido de vuelta a tu panel de control
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-foreground-muted">
              Películas Creadas
            </CardTitle>
            <Film className="h-4 w-4 text-foreground-muted" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">
              {stats.totalMovies}
            </div>
            <p className="text-xs text-foreground-muted mt-1">
              {stats.publishedMovies} publicadas
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-foreground-muted">
              Alquiladas
            </CardTitle>
            <Play className="h-4 w-4 text-foreground-muted" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">
              {stats.activeRentals}
            </div>
            <p className="text-xs text-foreground-muted mt-1">
              Activas ahora
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-foreground-muted">
              Monedero
            </CardTitle>
            <DollarSign className="h-4 w-4 text-foreground-muted" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">
              {formatPrice(stats.totalEarnings)}
            </div>
            <p className="text-xs text-foreground-muted mt-1">
              Ingresos totales
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-foreground-muted">
              Plan Actual
            </CardTitle>
            <CreditCard className="h-4 w-4 text-foreground-muted" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">
              {plan?.name || "Sin plan"}
            </div>
            <p className="text-xs text-foreground-muted mt-1">
              {profile.movies_created_this_month} / {plan?.movies_per_month || 0}{" "}
              este mes
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Acciones Rápidas</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Button
              variant="default"
              className="h-auto py-6 flex flex-col items-center gap-2"
              onClick={() => router.push("/create-movie")}
            >
              <Plus className="h-6 w-6" />
              <span>Crear Película</span>
            </Button>
            <Button
              variant="secondary"
              className="h-auto py-6 flex flex-col items-center gap-2"
              onClick={() => router.push("/browse")}
            >
              <Compass className="h-6 w-6" />
              <span>Explorar</span>
            </Button>
            <Button
              variant="secondary"
              className="h-auto py-6 flex flex-col items-center gap-2"
              onClick={() => router.push("/dashboard/subscription")}
            >
              <CreditCard className="h-6 w-6" />
              <span>Mi Plan</span>
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Películas en Progreso */}
      {inProgressMovies.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-2xl font-bold text-foreground">
            Películas en Progreso
          </h2>
          <div className="space-y-4">
            {inProgressMovies.map((movie) => (
              <Card key={movie.id}>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-semibold text-foreground mb-1">
                        {movie.title}
                      </h3>
                      <p className="text-sm text-foreground-muted">
                        {formatDate(movie.created_at)}
                      </p>
                    </div>
                    <Link href={`/create-movie?movie_id=${movie.id}`}>
                      <Button variant="secondary">Ver Progreso</Button>
                    </Link>
                  </div>
                  <div className="mt-4">
                    <GenerationProgress movieId={movie.id} />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Continuar Viendo */}
      {activeRentals.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-2xl font-bold text-foreground">
            Continuar Viendo
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
            {activeRentals.map((rental) => {
              const movie = Array.isArray(rental.movies)
                ? rental.movies[0]
                : rental.movies;
              if (!movie) return null;

              const rentalEnd = rental.rental_end
                ? new Date(rental.rental_end)
                : null;
              const hoursRemaining = rentalEnd
                ? Math.max(
                    0,
                    Math.floor(
                      (rentalEnd.getTime() - Date.now()) / (1000 * 60 * 60)
                    )
                  )
                : 0;

              return (
                <div key={rental.id} className="relative">
                  <MovieCard movie={movie} variant="poster" />
                  {hoursRemaining > 0 && (
                    <div className="absolute top-2 right-2 bg-card/90 backdrop-blur-sm px-2 py-1 rounded text-xs text-foreground">
                      <Clock className="h-3 w-3 inline mr-1" />
                      {hoursRemaining}h
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Mis Últimas Películas */}
      {recentMovies.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-bold text-foreground">
              Mis Últimas Películas
            </h2>
            <Link href="/dashboard/my-movies">
              <Button variant="ghost">Ver todas</Button>
            </Link>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
            {recentMovies.map((movie) => (
              <MovieCard key={movie.id} movie={movie} variant="poster" />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

