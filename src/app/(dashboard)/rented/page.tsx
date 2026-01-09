"use client";

import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import { MovieCard } from "@/components/movies/movie-card";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { formatPrice, formatDate } from "@/lib/utils/formatters";
import { formatDurationSeconds } from "@/lib/utils/formatters";
import { Play, Clock, History } from "lucide-react";
import { API_ENDPOINTS } from "@/lib/utils/constants";
import { toast } from "@/hooks/use-toast";

export default function RentedPage() {
  const router = useRouter();
  const supabase = createClient();

  // Obtener alquileres activos
  const { data: activeRentals = [], isLoading: loadingActive } = useQuery({
    queryKey: ["rentals", "active"],
    queryFn: async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return [];

      const response = await fetch(API_ENDPOINTS.rentals.myRentals);
      if (!response.ok) throw new Error("Failed to fetch rentals");
      const data = await response.json();
      return (data.data || []).filter(
        (r: any) =>
          r.payment_status === "completed" &&
          r.rental_end &&
          new Date(r.rental_end) > new Date()
      );
    },
  });

  // Obtener historial
  const { data: historyRentals = [], isLoading: loadingHistory } = useQuery({
    queryKey: ["rentals", "history"],
    queryFn: async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return [];

      const response = await fetch(API_ENDPOINTS.rentals.myRentals);
      if (!response.ok) throw new Error("Failed to fetch rentals");
      const data = await response.json();
      return (data.data || []).filter(
        (r: any) =>
          r.payment_status === "completed" &&
          (!r.rental_end || new Date(r.rental_end) <= new Date())
      );
    },
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Películas Alquiladas</h1>
        <p className="text-foreground-muted mt-1">
          Gestiona tus alquileres activos y revisa tu historial
        </p>
      </div>

      <Tabs defaultValue="active">
        <TabsList>
          <TabsTrigger value="active">
            Activas ({activeRentals.length})
          </TabsTrigger>
          <TabsTrigger value="history">
            Historial ({historyRentals.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="active" className="mt-6">
          {loadingActive ? (
            <div className="text-center py-12 text-foreground-muted">
              Cargando...
            </div>
          ) : activeRentals.length === 0 ? (
            <Card>
              <CardContent className="p-12 text-center">
                <Play className="h-16 w-16 text-foreground-muted mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-foreground mb-2">
                  No tienes alquileres activos
                </h3>
                <p className="text-foreground-muted mb-6">
                  Explora el marketplace para encontrar películas increíbles
                </p>
                <Button onClick={() => router.push("/browse")}>
                  Explorar Películas
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {activeRentals.map((rental: any) => {
                const movie = rental.movies || rental.movie;
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
                  <Card key={rental.id}>
                    <div className="relative aspect-video">
                      <MovieCard movie={movie} variant="backdrop" />
                      {hoursRemaining > 0 && (
                        <div className="absolute top-2 right-2 bg-card/90 backdrop-blur-sm px-3 py-1 rounded-md flex items-center gap-1 text-sm text-foreground">
                          <Clock className="h-4 w-4" />
                          {hoursRemaining}h restantes
                        </div>
                      )}
                    </div>
                    <CardContent className="p-4">
                      <h3 className="font-semibold text-foreground mb-2">
                        {movie.title}
                      </h3>
                      <div className="flex items-center justify-between">
                        <div className="text-sm text-foreground-muted">
                          Alquilada el {formatDate(rental.created_at)}
                        </div>
                        <Button
                          variant="default"
                          size="sm"
                          onClick={() => router.push(`/watch/${movie.id}`)}
                        >
                          <Play className="h-4 w-4 mr-1" />
                          Ver ahora
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>

        <TabsContent value="history" className="mt-6">
          {loadingHistory ? (
            <div className="text-center py-12 text-foreground-muted">
              Cargando...
            </div>
          ) : historyRentals.length === 0 ? (
            <Card>
              <CardContent className="p-12 text-center">
                <History className="h-16 w-16 text-foreground-muted mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-foreground mb-2">
                  No hay historial
                </h3>
                <p className="text-foreground-muted">
                  Tus alquileres anteriores aparecerán aquí
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {historyRentals.map((rental: any) => {
                const movie = rental.movies || rental.movie;
                if (!movie) return null;

                return (
                  <Card key={rental.id}>
                    <CardContent className="p-4">
                      <div className="flex items-center gap-4">
                        <div className="relative w-24 h-32 flex-shrink-0 rounded overflow-hidden">
                          <img
                            src={movie.thumbnail_url || "/placeholder-movie.jpg"}
                            alt={movie.title}
                            className="w-full h-full object-cover"
                          />
                        </div>
                        <div className="flex-1">
                          <h3 className="font-semibold text-foreground mb-1">
                            {movie.title}
                          </h3>
                          <div className="text-sm text-foreground-muted space-y-1">
                            <p>Alquilada: {formatDate(rental.created_at)}</p>
                            <p>Precio: {formatPrice(rental.price_paid)}</p>
                            {rental.watch_count > 0 && (
                              <p>Vista {rental.watch_count} vez(es)</p>
                            )}
                          </div>
                        </div>
                        <Button
                          variant="secondary"
                          onClick={() => router.push(`/browse/movie/${movie.id}`)}
                        >
                          Ver Detalles
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
