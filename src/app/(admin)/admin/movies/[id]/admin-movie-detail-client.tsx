"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { formatDate, formatPrice, formatDuration } from "@/lib/utils/formatters";
import { MOVIE_STATUS_CONFIG, GENRES } from "@/types/movie";
import { 
  ArrowLeft, 
  Edit, 
  Play, 
  Download, 
  Trash2, 
  CheckCircle2, 
  XCircle,
  Eye,
  Film,
  FileText,
  Video,
  Users,
  AlertCircle,
  Loader2,
  RefreshCw
} from "lucide-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { API_ENDPOINTS } from "@/lib/utils/constants";
import { useToast } from "@/hooks/use-toast";
import type { Movie, Script, Scene, Plan, Profile } from "@/types/database";
import Image from "next/image";

interface AdminMovieDetailClientProps {
  movie: Movie & { profiles?: Profile };
  script: Script | null;
  scenes: Scene[];
  plans: Plan[];
  isSuperAdmin: boolean;
}

export function AdminMovieDetailClient({
  movie,
  script,
  scenes,
  plans,
  isSuperAdmin,
}: AdminMovieDetailClientProps) {
  const router = useRouter();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const statusConfig = MOVIE_STATUS_CONFIG[movie.status] || MOVIE_STATUS_CONFIG.draft;
  const genre = GENRES.find((g) => g.id === movie.genre);

  // Moderation actions
  const moderateMutation = useMutation({
    mutationFn: async (action: "approve" | "reject") => {
      const response = await fetch(
        API_ENDPOINTS.admin.moderateMovie(movie.id),
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ approve: action === "approve" }),
        }
      );
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Error al moderar película");
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "movies"] });
      toast({
        title: "✅ Película moderada",
        description: "La película ha sido actualizada correctamente",
        variant: "success",
      });
      router.refresh();
    },
    onError: (error: Error) => {
      toast({
        title: "Error al moderar",
        description: error.message,
        variant: "error",
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch(`/api/movies/${movie.id}`, {
        method: "DELETE",
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Error al eliminar película");
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "movies"] });
      toast({
        title: "✅ Película eliminada",
        description: "La película ha sido eliminada correctamente",
        variant: "success",
      });
      router.push("/admin/movies");
    },
    onError: (error: Error) => {
      toast({
        title: "Error al eliminar",
        description: error.message,
        variant: "error",
      });
    },
  });

  const fixScenesMutation = useMutation({
    mutationFn: async () => {
      // Primero obtener info de debug
      const debugResponse = await fetch(`/api/admin/movies/${movie.id}/debug-scenes`);
      const debugData = await debugResponse.json();
      console.log('[FIX SCENES] Debug antes:', debugData);

      // Luego intentar corregir
      const response = await fetch(`/api/admin/movies/${movie.id}/fix-scenes`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Error al corregir estados de escenas");
      }
      const result = await response.json();
      console.log('[FIX SCENES] Result:', result);
      return { ...result, debugBefore: debugData };
    },
    onSuccess: (data) => {
      console.log('[FIX SCENES] Success:', data);
      queryClient.invalidateQueries({ queryKey: ["admin", "movies"] });
      queryClient.invalidateQueries({ queryKey: ["admin", "movies", movie.id] });
      
      const message = data.debug ? 
        `Debug: ${JSON.stringify(data.debug, null, 2)}. ${data.message || ''}` :
        data.message || `Se actualizaron ${data.updated || 0} escena(s)`;
      
      toast({
        title: "✅ Estados corregidos",
        description: message.substring(0, 200),
        variant: "success",
      });
      
      // Forzar refresh completo de la página para recargar los datos del servidor
      setTimeout(() => {
        window.location.href = window.location.href; // Refresh forzado
      }, 1000);
    },
    onError: (error: Error) => {
      console.error('[FIX SCENES] Error:', error);
      toast({
        title: "Error al corregir estados",
        description: error.message,
        variant: "error",
      });
    },
  });

  const handleModerate = (action: "approve" | "reject") => {
    if (confirm(`¿Estás seguro de ${action === "approve" ? "aprobar" : "rechazar"} esta película?`)) {
      moderateMutation.mutate(action);
    }
  };

  const handleDelete = () => {
    if (confirm("¿Estás seguro de eliminar esta película? Esta acción no se puede deshacer.")) {
      deleteMutation.mutate();
    }
  };

  // Obtener planes disponibles
  const availablePlans = movie.available_plans
    ? plans.filter((p) => movie.available_plans?.includes(p.id))
    : plans; // Si es null, está disponible para todos

  // Validar que tenemos los datos necesarios
  if (!movie) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen">
        <AlertCircle className="h-12 w-12 text-error mb-4" />
        <p className="text-lg">Película no encontrada</p>
        <Button onClick={() => router.push("/admin/movies")} className="mt-4">
          Volver al listado
        </Button>
      </div>
    )
  }

  return (
    <div className="container-app py-8">
      <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => router.push("/admin/movies")}
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold text-foreground">{movie.title}</h1>
            <p className="text-foreground-muted">
              Creada el {formatDate(movie.created_at)}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {movie.status === "pending_review" && (
            <>
              <Button
                onClick={() => handleModerate("approve")}
                disabled={moderateMutation.isPending}
                variant="success"
              >
                <CheckCircle2 className="mr-2 h-4 w-4" />
                Aprobar y Publicar
              </Button>
              <Button
                onClick={() => handleModerate("reject")}
                disabled={moderateMutation.isPending}
                variant="error"
              >
                <XCircle className="mr-2 h-4 w-4" />
                Rechazar
              </Button>
            </>
          )}
          <Button
            variant="outline"
            onClick={() => router.push(`/admin/movies/${movie.id}/edit`)}
          >
            <Edit className="mr-2 h-4 w-4" />
            Editar
          </Button>
          {isSuperAdmin && (
            <Button
              variant="error"
              onClick={handleDelete}
              disabled={deleteMutation.isPending}
            >
              <Trash2 className="mr-2 h-4 w-4" />
              Eliminar
            </Button>
          )}
        </div>
      </div>

      {/* Status Badge */}
      <div className="flex items-center gap-2">
        <Badge
          style={{
            backgroundColor: statusConfig.color,
            color: statusConfig.foreground,
          }}
        >
          {statusConfig.label}
        </Badge>
        {genre && (
          <Badge variant="secondary">
            {genre.icon} {genre.name}
          </Badge>
        )}
        {movie.is_published && (
          <Badge variant="success">
            <Eye className="mr-1 h-3 w-3" />
            Publicada
          </Badge>
        )}
      </div>

      {/* Main Content */}
      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList>
          <TabsTrigger value="overview">Resumen</TabsTrigger>
          {(movie.status !== 'completed' && movie.status !== 'failed' && movie.status !== 'published') && (
            <TabsTrigger value="progress">
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Progreso
            </TabsTrigger>
          )}
          <TabsTrigger value="content">Contenido</TabsTrigger>
          <TabsTrigger value="scenes">Escenas ({scenes.length})</TabsTrigger>
          <TabsTrigger value="plans">Planes Disponibles</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Main Info */}
            <div className="lg:col-span-2 space-y-6">
              {/* Thumbnail */}
              <Card>
                <CardContent className="p-0">
                  <div className="relative aspect-video w-full group bg-black/20 rounded-lg flex items-center justify-center">
                    {(movie.thumbnail_url || movie.poster_url) ? (
                      <Image
                        src={movie.thumbnail_url || movie.poster_url || "/placeholder-movie.jpg"}
                        alt={movie.title}
                        fill
                        className="object-cover rounded-lg"
                      />
                    ) : (
                      <div className="text-foreground-muted text-lg">
                        {movie.title}
                      </div>
                    )}
                    {/* Botón de play para ver la película completa - SIEMPRE VISIBLE si hay video */}
                    {(movie.video_url_720p || movie.video_url_1080p || movie.video_url_4k || movie.video_url) && (
                      <div className="absolute inset-0 flex items-center justify-center bg-black/30 rounded-lg">
                        <Button
                          size="lg"
                          className="h-20 w-20 rounded-full bg-primary hover:bg-primary-hover shadow-lg"
                          onClick={(e) => {
                            e.stopPropagation()
                            router.push(`/watch/${movie.id}`)
                          }}
                        >
                          <Play className="h-10 w-10 ml-1 text-primary-foreground" fill="currentColor" />
                        </Button>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
              
              {/* Botón de reproducir película completa - Visible siempre si hay video */}
              {(movie.video_url_720p || movie.video_url_1080p || movie.video_url_4k || movie.video_url) && (
                <Card>
                  <CardContent className="p-4">
                    <Button
                      size="lg"
                      className="w-full bg-primary hover:bg-primary-hover text-primary-foreground"
                      onClick={() => router.push(`/watch/${movie.id}`)}
                    >
                      <Play className="mr-2 h-5 w-5" fill="currentColor" />
                      Reproducir Película Completa
                    </Button>
                  </CardContent>
                </Card>
              )}

              {/* Description */}
              <Card>
                <CardHeader>
                  <CardTitle>Descripción</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-foreground-muted whitespace-pre-wrap">
                    {movie.description || "Sin descripción"}
                  </p>
                </CardContent>
              </Card>

              {/* Creator Info */}
              <Card>
                <CardHeader>
                  <CardTitle>Información del Creador</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <div>
                      <span className="text-sm text-foreground-muted">Creador:</span>
                      <p className="font-medium">
                        {movie.profiles?.full_name || movie.profiles?.email || "Usuario eliminado"}
                      </p>
                    </div>
                    <div>
                      <span className="text-sm text-foreground-muted">Email:</span>
                      <p className="font-medium">{movie.profiles?.email || "N/A"}</p>
                    </div>
                    <div>
                      <span className="text-sm text-foreground-muted">Rol:</span>
                      <Badge variant="secondary">{movie.profiles?.role || "user"}</Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Sidebar */}
            <div className="space-y-6">
              {/* Stats */}
              <Card>
                <CardHeader>
                  <CardTitle>Estadísticas</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <span className="text-sm text-foreground-muted">Duración</span>
                    <p className="font-semibold">{formatDuration(movie.duration_minutes)}</p>
                  </div>
                  <div>
                    <span className="text-sm text-foreground-muted">Progreso</span>
                    <p className="font-semibold">{movie.progress}%</p>
                  </div>
                  <div>
                    <span className="text-sm text-foreground-muted">Visualizaciones</span>
                    <p className="font-semibold">{movie.views_count}</p>
                  </div>
                  <div>
                    <span className="text-sm text-foreground-muted">Alquileres</span>
                    <p className="font-semibold">{movie.rentals_count}</p>
                  </div>
                  {movie.rental_price && (
                    <div>
                      <span className="text-sm text-foreground-muted">Precio de Alquiler</span>
                      <p className="font-semibold">{formatPrice(movie.rental_price)}</p>
                    </div>
                  )}
                  {movie.average_rating && (
                    <div>
                      <span className="text-sm text-foreground-muted">Valoración</span>
                      <p className="font-semibold">{movie.average_rating.toFixed(1)} / 5.0</p>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Video Links */}
              {(movie.video_url_720p || movie.video_url_1080p || movie.video_url_4k) && (
                <Card>
                  <CardHeader>
                    <CardTitle>Videos Disponibles</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    {movie.video_url_720p && (
                      <Button
                        variant="outline"
                        className="w-full justify-start"
                        onClick={() => window.open(movie.video_url_720p!, "_blank")}
                      >
                        <Video className="mr-2 h-4 w-4" />
                        720p
                      </Button>
                    )}
                    {movie.video_url_1080p && (
                      <Button
                        variant="outline"
                        className="w-full justify-start"
                        onClick={() => window.open(movie.video_url_1080p!, "_blank")}
                      >
                        <Video className="mr-2 h-4 w-4" />
                        1080p
                      </Button>
                    )}
                    {movie.video_url_4k && (
                      <Button
                        variant="outline"
                        className="w-full justify-start"
                        onClick={() => window.open(movie.video_url_4k!, "_blank")}
                      >
                        <Video className="mr-2 h-4 w-4" />
                        4K
                      </Button>
                    )}
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        </TabsContent>

        {/* Progress Tab */}
        {(movie.status !== 'completed' && movie.status !== 'failed' && movie.status !== 'published') && (
          <TabsContent value="progress" className="space-y-6">
            <div className="flex justify-center">
              <Button
                onClick={() => router.push(`/admin/movies/${movie.id}/progress`)}
                size="lg"
              >
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Ver Página de Progreso Completa
              </Button>
            </div>
            
            <Card>
              <CardHeader>
                <CardTitle>Progreso de Generación</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium">Progreso General</span>
                      <span className="text-2xl font-bold text-primary">
                        {movie.progress}%
                      </span>
                    </div>
                    <Progress value={movie.progress} className="h-4" />
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4 mt-6">
                    <div className="p-3 bg-background-secondary rounded-lg">
                      <p className="text-xs text-foreground-muted mb-1">Estado</p>
                      <p className="font-semibold">{statusConfig.label}</p>
                    </div>
                    <div className="p-3 bg-background-secondary rounded-lg">
                      <p className="text-xs text-foreground-muted mb-1">Duración Objetivo</p>
                      <p className="font-semibold">{formatDuration(movie.duration_minutes)}</p>
                    </div>
                  </div>
                  
                  <div className="mt-4 p-4 bg-primary/10 rounded-lg border border-primary/20">
                    <p className="text-sm text-foreground-muted mb-2">
                      La película se está generando. Puedes ver el progreso detallado en la página completa.
                    </p>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => router.push(`/admin/movies/${movie.id}/progress`)}
                      className="w-full"
                    >
                      Ver Progreso Detallado
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        )}

        {/* Content Tab */}
        <TabsContent value="content" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Prompt Principal</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-foreground-muted whitespace-pre-wrap">
                {movie.user_prompt}
              </p>
            </CardContent>
          </Card>

          {movie.user_plot && (
            <Card>
              <CardHeader>
                <CardTitle>Trama Detallada</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-foreground-muted whitespace-pre-wrap">
                  {movie.user_plot}
                </p>
              </CardContent>
            </Card>
          )}

          {movie.user_ending && (
            <Card>
              <CardHeader>
                <CardTitle>Final Definido</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-foreground-muted whitespace-pre-wrap">
                  {movie.user_ending}
                </p>
              </CardContent>
            </Card>
          )}

          {script && (
            <Card>
              <CardHeader>
                <CardTitle>Guion Generado</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <span className="text-sm text-foreground-muted">Total de Escenas:</span>
                    <p className="font-semibold">{script.total_scenes}</p>
                  </div>
                  {script.summary && (
                    <div>
                      <span className="text-sm text-foreground-muted">Resumen:</span>
                      <p className="text-foreground-muted whitespace-pre-wrap mt-1">
                        {script.summary}
                      </p>
                    </div>
                  )}
                  <div>
                    <span className="text-sm text-foreground-muted">Guion Completo:</span>
                    <div className="mt-2 p-4 bg-background-secondary rounded-lg max-h-96 overflow-y-auto">
                      <pre className="text-sm text-foreground-muted whitespace-pre-wrap">
                        {script.full_text}
                      </pre>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Scenes Tab */}
        <TabsContent value="scenes" className="space-y-4">
          {scenes.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center text-foreground-muted">
                No hay escenas generadas aún
              </CardContent>
            </Card>
          ) : (
            <>
              {/* Botón para corregir estados de escenas */}
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-foreground">
                        Corrección de Estados
                      </p>
                      <p className="text-xs text-foreground-muted mt-1">
                        Corrige automáticamente el estado de las escenas que tienen videos generados pero están marcadas como "pending"
                      </p>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => fixScenesMutation.mutate()}
                      disabled={fixScenesMutation.isPending}
                    >
                      {fixScenesMutation.isPending ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Corrigiendo...
                        </>
                      ) : (
                        <>
                          <RefreshCw className="mr-2 h-4 w-4" />
                          Corregir Estados
                        </>
                      )}
                    </Button>
                  </div>
                </CardContent>
              </Card>
              
              <div className="space-y-4">
                {scenes.map((scene) => (
                <Card key={scene.id}>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle className="flex items-center gap-2">
                        <Film className="h-5 w-5" />
                        Escena {scene.scene_number}
                      </CardTitle>
                      <Badge 
                        variant={
                          (scene.status === 'completed' || scene.clip_status === 'completed') 
                            ? 'success' 
                            : (scene.status === 'failed' || scene.clip_status === 'failed')
                            ? 'error'
                            : 'secondary'
                        }
                      >
                        {scene.status || scene.clip_status || "pending"}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {scene.description && (
                      <div>
                        <span className="text-sm text-foreground-muted">Descripción:</span>
                        <p className="text-foreground-muted">{scene.description}</p>
                      </div>
                    )}
                    {scene.dialogue && (
                      <div>
                        <span className="text-sm text-foreground-muted">Diálogo:</span>
                        <p className="text-foreground-muted">{scene.dialogue}</p>
                      </div>
                    )}
                    {/* Debug: Mostrar información de la escena */}
                    <div className="text-xs text-foreground-muted space-y-1 p-2 bg-black/20 rounded">
                      <div><strong>Status:</strong> {scene.status || scene.clip_status || 'null'} (raw: {JSON.stringify(scene.status)})</div>
                      <div><strong>Video URL:</strong> {(scene.video_url || scene.clip_url) ? 'EXISTS' : 'NULL'}</div>
                      <div><strong>video_url value:</strong> {scene.video_url ? `"${scene.video_url.substring(0, 60)}..."` : 'null'}</div>
                      <div><strong>clip_url value:</strong> {scene.clip_url ? `"${scene.clip_url.substring(0, 60)}..."` : 'null'}</div>
                      <div><strong>Raw scene data:</strong> {JSON.stringify({ status: scene.status, clip_status: scene.clip_status, has_video: !!scene.video_url, has_clip: !!scene.clip_url })}</div>
                    </div>
                    
                    {/* Mostrar video_url o clip_url (compatibilidad con ambas tablas) */}
                    {(scene.video_url || scene.clip_url) && (
                      <div className="space-y-2">
                        <div>
                          <span className="text-sm text-foreground-muted">Estado:</span>
                          <Badge 
                            variant={
                              (scene.status === 'completed' || scene.clip_status === 'completed') 
                                ? 'success' 
                                : (scene.status === 'failed' || scene.clip_status === 'failed')
                                ? 'error'
                                : 'secondary'
                            }
                            className="ml-2"
                          >
                            {scene.status || scene.clip_status || 'pending'}
                          </Badge>
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            // Usar video_url (de movie_scenes) o clip_url (de scenes legacy)
                            const sceneUrl = (scene.video_url || scene.clip_url)?.includes('/api/mock/video/')
                              ? "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4"
                              : (scene.video_url || scene.clip_url);
                            
                            if (!sceneUrl) {
                              toast({
                                title: "Error",
                                description: "No hay URL de video disponible para esta escena",
                                variant: "error"
                              })
                              return
                            }
                            
                            // Abrir en una nueva ventana con solo el video de la escena
                            const newWindow = window.open("", "_blank");
                            if (newWindow) {
                              newWindow.document.write(`
                                <!DOCTYPE html>
                                <html>
                                  <head>
                                    <title>Escena ${scene.scene_number} - ${movie.title}</title>
                                    <style>
                                      body {
                                        margin: 0;
                                        padding: 0;
                                        background: #000;
                                        display: flex;
                                        justify-content: center;
                                        align-items: center;
                                        min-height: 100vh;
                                      }
                                      video {
                                        width: 100%;
                                        height: 100vh;
                                        object-fit: contain;
                                      }
                                    </style>
                                  </head>
                                  <body>
                                    <video controls autoplay>
                                      <source src="${sceneUrl}" type="video/mp4">
                                      Tu navegador no soporta la reproducción de video.
                                    </video>
                                  </body>
                                </html>
                              `);
                              newWindow.document.close();
                            }
                          }}
                          disabled={!scene.video_url && !scene.clip_url}
                        >
                          <Play className="mr-2 h-4 w-4" />
                          {scene.video_url || scene.clip_url ? 'Ver Escena' : 'Video no disponible'}
                        </Button>
                      </div>
                    )}
                    {!scene.video_url && !scene.clip_url && (
                      <div className="text-sm text-foreground-muted">
                        Video aún no generado o no disponible
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
              </div>
            </>
          )}
        </TabsContent>

        {/* Plans Tab */}
        <TabsContent value="plans" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Planes Disponibles</CardTitle>
            </CardHeader>
            <CardContent>
              {movie.available_plans === null || movie.available_plans.length === 0 ? (
                <p className="text-foreground-muted">
                  Esta película está disponible para todos los planes activos.
                </p>
              ) : (
                <div className="space-y-2">
                  <p className="text-sm text-foreground-muted mb-4">
                    Esta película está disponible solo para los siguientes planes:
                  </p>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {availablePlans.map((plan) => (
                      <Card key={plan.id} className="bg-background-secondary">
                        <CardContent className="p-4">
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="font-semibold">{plan.name}</p>
                              <p className="text-sm text-foreground-muted">
                                {formatPrice(plan.price)}/mes
                              </p>
                            </div>
                            <Badge variant="success">Disponible</Badge>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
      </div>
    </div>
  );
}

