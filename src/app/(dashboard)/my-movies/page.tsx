"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useMyMovies } from "@/hooks/use-movies";
import { useDeleteMovie, usePublishMovie } from "@/hooks/use-movies";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { MovieCard } from "@/components/movies/movie-card";
import { MOVIE_STATUS_CONFIG } from "@/types/movie";
import { formatDate } from "@/lib/utils/formatters";
import { Eye, Edit, Trash2, Globe, Film, Plus } from "lucide-react";
import Image from "next/image";
import { toast } from "@/hooks/use-toast";

export default function MyMoviesPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState("all");
  const [deleteDialog, setDeleteDialog] = useState<{ open: boolean; movieId: string | null }>({
    open: false,
    movieId: null,
  });

  const { data: movies = [], isLoading } = useMyMovies();
  const { mutate: deleteMovie } = useDeleteMovie();
  const { mutate: publishMovie } = usePublishMovie();

  const filteredMovies = movies.filter((movie) => {
    switch (activeTab) {
      case "in-progress":
        return [
          "script_generating",
          "video_generating",
          "audio_generating",
          "assembling",
        ].includes(movie.status);
      case "completed":
        return movie.status === "completed";
      case "published":
        return movie.is_published;
      default:
        return true;
    }
  });

  const handleDelete = (movieId: string) => {
    deleteMovie(movieId, {
      onSuccess: () => {
        toast.success("Película eliminada correctamente");
        setDeleteDialog({ open: false, movieId: null });
      },
      onError: () => {
        toast.error("Error al eliminar la película");
      },
    });
  };

  const handlePublish = (movieId: string, publish: boolean) => {
    publishMovie(
      { id: movieId, publish },
      {
        onSuccess: () => {
          toast.success(
            publish ? "Película publicada" : "Película despublicada"
          );
        },
        onError: () => {
          toast.error("Error al cambiar el estado de publicación");
        },
      }
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Mis Películas</h1>
          <p className="text-foreground-muted mt-1">
            Gestiona todas tus creaciones
          </p>
        </div>
        <Button onClick={() => router.push("/create-movie")}>
          <Plus className="h-4 w-4 mr-2" />
          Crear Película
        </Button>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="all">Todas ({movies.length})</TabsTrigger>
          <TabsTrigger value="in-progress">
            En Progreso (
            {
              movies.filter((m) =>
                [
                  "script_generating",
                  "video_generating",
                  "audio_generating",
                  "assembling",
                ].includes(m.status)
              ).length
            }
            )
          </TabsTrigger>
          <TabsTrigger value="completed">
            Completadas (
            {movies.filter((m) => m.status === "completed").length})
          </TabsTrigger>
          <TabsTrigger value="published">
            Publicadas ({movies.filter((m) => m.is_published).length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value={activeTab} className="mt-6">
          {isLoading ? (
            <div className="text-center py-12 text-foreground-muted">
              Cargando...
            </div>
          ) : filteredMovies.length === 0 ? (
            <Card>
              <CardContent className="p-12 text-center">
                <Film className="h-16 w-16 text-foreground-muted mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-foreground mb-2">
                  No hay películas
                </h3>
                <p className="text-foreground-muted mb-6">
                  {activeTab === "all"
                    ? "Comienza creando tu primera película"
                    : `No tienes películas en esta categoría`}
                </p>
                <Button onClick={() => router.push("/create-movie")}>
                  <Plus className="h-4 w-4 mr-2" />
                  Crear Película
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredMovies.map((movie) => {
                const statusConfig = MOVIE_STATUS_CONFIG[movie.status];
                return (
                  <Card key={movie.id} className="overflow-hidden">
                    <div className="relative aspect-video">
                      <Image
                        src={movie.thumbnail_url || "/placeholder-movie.jpg"}
                        alt={movie.title}
                        fill
                        className="object-cover"
                      />
                      <div className="absolute top-2 right-2">
                        <Badge
                          style={{
                            backgroundColor: statusConfig.color + "20",
                            color: statusConfig.color,
                            borderColor: statusConfig.color,
                          }}
                        >
                          {statusConfig.label}
                        </Badge>
                      </div>
                    </div>
                    <CardContent className="p-4">
                      <h3 className="font-semibold text-foreground mb-1 line-clamp-1">
                        {movie.title}
                      </h3>
                      <p className="text-xs text-foreground-muted mb-4">
                        {formatDate(movie.created_at)}
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {movie.status === "completed" && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => router.push(`/watch/${movie.id}`)}
                          >
                            <Eye className="h-4 w-4 mr-1" />
                            Ver
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() =>
                            router.push(`/dashboard/my-movies/${movie.id}`)
                          }
                        >
                          <Edit className="h-4 w-4 mr-1" />
                          Editar
                        </Button>
                        {movie.status === "completed" && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() =>
                              handlePublish(movie.id, !movie.is_published)
                            }
                          >
                            <Globe className="h-4 w-4 mr-1" />
                            {movie.is_published ? "Despublicar" : "Publicar"}
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() =>
                            setDeleteDialog({ open: true, movieId: movie.id })
                          }
                          className="text-error hover:text-error"
                        >
                          <Trash2 className="h-4 w-4 mr-1" />
                          Eliminar
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

      {/* Delete Dialog */}
      <Dialog
        open={deleteDialog.open}
        onOpenChange={(open) =>
          setDeleteDialog({ open, movieId: deleteDialog.movieId })
        }
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Eliminar Película</DialogTitle>
            <DialogDescription>
              ¿Estás seguro de que deseas eliminar esta película? Esta acción
              no se puede deshacer.
            </DialogDescription>
          </DialogHeader>
          <div className="flex gap-4">
            <Button
              variant="secondary"
              onClick={() => setDeleteDialog({ open: false, movieId: null })}
              className="flex-1"
            >
              Cancelar
            </Button>
            <Button
              variant="danger"
              onClick={() => {
                if (deleteDialog.movieId) {
                  handleDelete(deleteDialog.movieId);
                }
              }}
              className="flex-1"
            >
              Eliminar
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
