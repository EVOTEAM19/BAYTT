"use client";

import { useState, useMemo, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import Image from "next/image";
import { PageHeader } from "@/components/shared/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { GENRES, MOVIE_STATUS_CONFIG } from "@/types/movie";
import { formatDate } from "@/lib/utils/formatters";
import { Eye, MoreHorizontal, CheckCircle2, XCircle, Trash2, AlertTriangle, Plus } from "lucide-react";
import { API_ENDPOINTS } from "@/lib/utils/constants";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";

export default function AdminMoviesPage() {
  const router = useRouter();
  const { toast } = useToast();
  const { profile, isLoading: authLoading } = useAuth();
  const [searchQuery, setSearchQuery] = useState("");
  const [moderationFilter, setModerationFilter] = useState<"all" | "active" | "pending" | "rejected" | "processing" | "deleted">("all");
  const [filters, setFilters] = useState({
    status: "",
    published: "",
    genre: "",
  });
  
  const isSuperAdmin = profile?.role === "superadmin";
  const isAdmin = profile?.role === "admin" || isSuperAdmin;

  // Debug: Log para verificar el rol
  useEffect(() => {
    if (typeof window !== "undefined") {
      console.log("Profile:", profile);
      console.log("isSuperAdmin:", isSuperAdmin);
      console.log("isAdmin:", isAdmin);
      console.log("Role:", profile?.role);
      console.log("authLoading:", authLoading);
    }
  }, [profile, isSuperAdmin, isAdmin, authLoading]);

  const { data, isLoading } = useQuery({
    queryKey: ["admin", "movies", filters, searchQuery, moderationFilter],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (filters.status) params.set("status", filters.status);
      if (filters.published) params.set("published", filters.published);
      if (filters.genre) params.set("genre", filters.genre);
      if (searchQuery) params.set("search", searchQuery);
      
      // Aplicar filtro de moderación
      if (moderationFilter === "active") {
        params.set("published", "true");
        params.set("status", "completed");
      } else if (moderationFilter === "pending") {
        params.set("status", "pending_review");
      } else if (moderationFilter === "rejected") {
        params.set("status", "rejected");
      } else if (moderationFilter === "processing") {
        params.set("show_processing", "true");
      } else if (moderationFilter === "deleted") {
        params.set("show_deleted", "true");
      }

      const response = await fetch(
        `${API_ENDPOINTS.admin.movies}?${params.toString()}`
      );
      if (!response.ok) throw new Error("Failed to fetch movies");
      return response.json();
    },
  });

  const movies = data?.data || [];

  const filteredMovies = useMemo(() => {
    let filtered = [...movies];

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (movie: any) =>
          movie.title?.toLowerCase().includes(query) ||
          movie.description?.toLowerCase().includes(query)
      );
    }

    return filtered;
  }, [movies, searchQuery]);

  const handleModerate = async (movieId: string, approve: boolean) => {
    try {
      const response = await fetch(API_ENDPOINTS.admin.moderateMovie(movieId), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ approve }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Error al moderar película");
      }

      toast({
        title: approve ? "✅ Película aprobada" : "❌ Película rechazada",
        description: approve 
          ? "La película ha sido aprobada y publicada" 
          : "La película ha sido rechazada",
        variant: approve ? "success" : "error",
      });

      // Refrescar datos
      window.location.reload();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "error",
      });
    }
  };

  const handleDelete = async (movieId: string) => {
    if (!confirm("¿Estás seguro de eliminar esta película? Esta acción no se puede deshacer.")) {
      return;
    }

    try {
      const response = await fetch(`/api/movies/${movieId}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Error al eliminar película");
      }

      toast({
        title: "✅ Película eliminada",
        description: "La película ha sido eliminada correctamente",
        variant: "success",
      });

      // Refrescar datos
      window.location.reload();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "error",
      });
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Gestión de Películas</h1>
          <p className="text-foreground-muted mt-2">
            Administra todas las películas de la plataforma
          </p>
        </div>
        <div className="flex items-center gap-2">
          {/* Mostrar botón siempre - si puede acceder a /admin/movies, es admin/superadmin */}
          <Button 
            onClick={() => router.push("/admin/movies/create")}
            className="bg-primary hover:bg-primary-hover text-primary-foreground"
          >
            <Plus className="mr-2 h-4 w-4" />
            Crear Película
          </Button>
        </div>
      </div>

      {/* Filtros de Moderación */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-wrap gap-2 items-center">
            <span className="text-sm font-medium text-foreground-muted mr-2">Moderación:</span>
            <Button
              variant={moderationFilter === "all" ? "default" : "secondary"}
              onClick={() => setModerationFilter("all")}
              size="sm"
            >
              Todas
            </Button>
            <Button
              variant={moderationFilter === "active" ? "default" : "secondary"}
              onClick={() => setModerationFilter("active")}
              size="sm"
            >
              Activas
            </Button>
            <Button
              variant={moderationFilter === "pending" ? "default" : "secondary"}
              onClick={() => setModerationFilter("pending")}
              size="sm"
            >
              Pendientes
            </Button>
            <Button
              variant={moderationFilter === "rejected" ? "default" : "secondary"}
              onClick={() => setModerationFilter("rejected")}
              size="sm"
            >
              Rechazadas
            </Button>
            <Button
              variant={moderationFilter === "processing" ? "default" : "secondary"}
              onClick={() => setModerationFilter("processing")}
              size="sm"
            >
              En Proceso
            </Button>
            <Button
              variant={moderationFilter === "deleted" ? "default" : "secondary"}
              onClick={() => setModerationFilter("deleted")}
              size="sm"
            >
              Eliminadas
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-wrap gap-4 items-center">
            <Input
              placeholder="Buscar por título o descripción..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="max-w-sm"
            />
            <select
              value={filters.status}
              onChange={(e) =>
                setFilters({ ...filters, status: e.target.value })
              }
              className="px-3 py-2 rounded-md bg-card border border-border text-foreground text-sm"
            >
              <option value="">Todos los estados</option>
              {Object.entries(MOVIE_STATUS_CONFIG).map(([key, config]) => (
                <option key={key} value={key}>
                  {config.label}
                </option>
              ))}
            </select>
            <select
              value={filters.published}
              onChange={(e) =>
                setFilters({ ...filters, published: e.target.value })
              }
              className="px-3 py-2 rounded-md bg-card border border-border text-foreground text-sm"
            >
              <option value="">Todas</option>
              <option value="true">Publicadas</option>
              <option value="false">No publicadas</option>
            </select>
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
          </div>
        </CardContent>
      </Card>

      {/* Movies Table */}
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-background-secondary">
                <tr>
                  <th className="px-4 py-3 text-left text-sm font-medium text-foreground-muted">
                    Película
                  </th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-foreground-muted">
                    Creador
                  </th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-foreground-muted">
                    Género
                  </th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-foreground-muted">
                    Estado
                  </th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-foreground-muted">
                    Publicada
                  </th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-foreground-muted">
                    Views
                  </th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-foreground-muted">
                    Fecha
                  </th>
                  <th className="px-4 py-3 text-right text-sm font-medium text-foreground-muted">
                    Acciones
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {isLoading ? (
                  <tr>
                    <td colSpan={8} className="px-4 py-12 text-center text-foreground-muted">
                      Cargando...
                    </td>
                  </tr>
                ) : filteredMovies.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-4 py-12 text-center text-foreground-muted">
                      No se encontraron películas
                    </td>
                  </tr>
                ) : (
                  filteredMovies.map((movie: any) => {
                    const statusConfig = MOVIE_STATUS_CONFIG[movie.status];
                    return (
                      <tr
                        key={movie.id}
                        className="hover:bg-card-hover transition-colors cursor-pointer"
                        onClick={() => router.push(`/admin/movies/${movie.id}`)}
                      >
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-3">
                            <div className="relative w-16 h-24 rounded overflow-hidden flex-shrink-0 bg-background-secondary">
                              <Image
                                src={movie.thumbnail_url || movie.poster_url || "/placeholder-movie.jpg"}
                                alt={movie.title}
                                fill
                                className="object-cover"
                                onError={(e) => {
                                  // Si falla la carga de la imagen, mostrar placeholder
                                  const target = e.target as HTMLImageElement
                                  target.src = "/placeholder-movie.jpg"
                                }}
                              />
                            </div>
                            <div>
                              <p className="font-medium text-foreground">
                                {movie.title}
                              </p>
                              <p className="text-xs text-foreground-muted line-clamp-1">
                                {movie.description}
                              </p>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-sm text-foreground-muted">
                          {movie.profiles?.full_name || movie.profiles?.email || "N/A"}
                        </td>
                        <td className="px-4 py-3">
                          <Badge variant="secondary">
                            {GENRES.find((g) => g.id === movie.genre)?.icon}{" "}
                            {GENRES.find((g) => g.id === movie.genre)?.name}
                          </Badge>
                        </td>
                        <td className="px-4 py-3">
                          <Badge
                            style={{
                              backgroundColor: statusConfig.color + "20",
                              color: statusConfig.color,
                              borderColor: statusConfig.color,
                            }}
                          >
                            {statusConfig.label}
                          </Badge>
                        </td>
                        <td className="px-4 py-3">
                          <Badge
                            variant={movie.is_published ? "success" : "secondary"}
                          >
                            {movie.is_published ? "Sí" : "No"}
                          </Badge>
                        </td>
                        <td className="px-4 py-3 text-sm text-foreground">
                          {movie.views_count || 0}
                        </td>
                        <td className="px-4 py-3 text-sm text-foreground-muted">
                          {formatDate(movie.created_at)}
                        </td>
                        <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem
                                onClick={() => router.push(`/admin/movies/${movie.id}`)}
                              >
                                <Eye className="h-4 w-4 mr-2" />
                                Ver Detalles
                              </DropdownMenuItem>
                              {(movie.status === "pending_review" || (movie.status === "completed" && !movie.is_published)) && (
                                <>
                                  <DropdownMenuItem
                                    onClick={() => handleModerate(movie.id, true)}
                                  >
                                    <CheckCircle2 className="h-4 w-4 mr-2" />
                                    Aprobar y Publicar
                                  </DropdownMenuItem>
                                  <DropdownMenuItem
                                    onClick={() => handleModerate(movie.id, false)}
                                  >
                                    <XCircle className="h-4 w-4 mr-2" />
                                    Rechazar
                                  </DropdownMenuItem>
                                </>
                              )}
                              {movie.status === "rejected" && (
                                <DropdownMenuItem
                                  onClick={() => handleModerate(movie.id, true)}
                                >
                                  <CheckCircle2 className="h-4 w-4 mr-2" />
                                  Reaprobar
                                </DropdownMenuItem>
                              )}
                              <DropdownMenuItem
                                onClick={() => handleDelete(movie.id)}
                                className="text-error"
                              >
                                <Trash2 className="h-4 w-4 mr-2" />
                                Eliminar
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
