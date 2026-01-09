"use client";

import { useGenerationProgress } from "@/hooks/use-generation";
import { useMovie } from "@/hooks/use-movies";
import { Progress } from "@/components/ui/progress";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { MOVIE_STATUS_CONFIG } from "@/types/movie";
import { Loader2, CheckCircle2, XCircle, Clock, X } from "lucide-react";
import { formatDuration } from "@/lib/utils/formatters";
import { useMemo } from "react";
import { useRouter } from "next/navigation";

interface GenerationProgressProps {
  movieId: string;
}

export function GenerationProgress({ movieId }: GenerationProgressProps) {
  const { data: progress, isLoading } = useGenerationProgress(movieId);
  const { data: movie } = useMovie(movieId);
  const router = useRouter();

  const statusConfig = useMemo(() => {
    if (!progress?.status) return null;
    return MOVIE_STATUS_CONFIG[progress.status];
  }, [progress?.status]);

  const estimatedTimeRemaining = useMemo(() => {
    if (!progress?.estimated_time_remaining) return null;
    return formatDuration(progress.estimated_time_remaining);
  }, [progress?.estimated_time_remaining]);

  const scenes = useMemo(() => {
    // Obtener escenas del movie si están disponibles
    // Por ahora, usamos datos del progress
    return [];
  }, []);

  if (isLoading || !progress) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const isCompleted = progress.status === "completed";
  const isFailed = progress.status === "failed";
  const isGenerating =
    progress.status === "script_generating" ||
    progress.status === "video_generating" ||
    progress.status === "audio_generating" ||
    progress.status === "assembling";

  return (
    <div className="space-y-6">
      {/* Main Progress Card */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-2xl">Generando tu película</CardTitle>
            {statusConfig && (
              <Badge
                style={{
                  backgroundColor: statusConfig.color + "20",
                  color: statusConfig.color,
                  borderColor: statusConfig.color,
                }}
              >
                {statusConfig.label}
              </Badge>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Progress Bar */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-foreground-muted">Progreso general</span>
              <span className="font-semibold text-foreground">
                {progress.progress}%
              </span>
            </div>
            <Progress value={progress.progress} showValue />
          </div>

          {/* Current Step */}
          <div className="flex items-center gap-3">
            {isGenerating && (
              <Loader2 className="h-5 w-5 animate-spin text-primary" />
            )}
            {isCompleted && (
              <CheckCircle2 className="h-5 w-5 text-success" />
            )}
            {isFailed && <XCircle className="h-5 w-5 text-error" />}
            <div>
              <p className="font-semibold text-foreground">
                {statusConfig?.description || progress.current_step}
              </p>
              {progress.scenes_completed !== undefined &&
                progress.total_scenes !== undefined && (
                  <p className="text-sm text-foreground-muted">
                    Escena {progress.scenes_completed} de {progress.total_scenes}
                  </p>
                )}
            </div>
          </div>

          {/* Estimated Time */}
          {estimatedTimeRemaining && isGenerating && (
            <div className="flex items-center gap-2 text-sm text-foreground-muted">
              <Clock className="h-4 w-4" />
              <span>Tiempo estimado restante: {estimatedTimeRemaining}</span>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-4">
            {isCompleted && (
              <Button
                variant="default"
                onClick={() => router.push(`/dashboard/my-movies/${movieId}`)}
              >
                Ver Película
              </Button>
            )}
            {isFailed && (
              <Button
                variant="secondary"
                onClick={() => router.push("/create-movie")}
              >
                Intentar de Nuevo
              </Button>
            )}
            {isGenerating && (
              <Button
                variant="secondary"
                onClick={() => router.push("/dashboard/my-movies")}
                leftIcon={<X className="h-4 w-4" />}
              >
                Cancelar (Volver)
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Scenes List */}
      {progress.scenes_completed !== undefined &&
        progress.total_scenes !== undefined && (
          <Card>
            <CardHeader>
              <CardTitle>Escenas</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {Array.from({ length: progress.total_scenes }).map((_, index) => {
                  const sceneNumber = index + 1;
                  const isCompleted = sceneNumber <= progress.scenes_completed!;
                  const isCurrent =
                    sceneNumber === progress.scenes_completed! + 1 && isGenerating;
                  const isPending = sceneNumber > progress.scenes_completed! + 1;

                  return (
                    <div
                      key={sceneNumber}
                      className="flex items-center gap-3 p-3 rounded-lg bg-card border border-border"
                    >
                      <div className="flex-shrink-0">
                        {isCompleted ? (
                          <CheckCircle2 className="h-5 w-5 text-success" />
                        ) : isCurrent ? (
                          <Loader2 className="h-5 w-5 animate-spin text-primary" />
                        ) : (
                          <Clock className="h-5 w-5 text-foreground-muted" />
                        )}
                      </div>
                      <div className="flex-1">
                        <p className="font-medium text-foreground">
                          Escena {sceneNumber}
                        </p>
                        <p className="text-sm text-foreground-muted">
                          {isCompleted
                            ? "Completada"
                            : isCurrent
                            ? "Generando..."
                            : "Pendiente"}
                        </p>
                      </div>
                      {isCompleted && (
                        <Badge variant="success" className="text-xs">
                          ✓
                        </Badge>
                      )}
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        )}
    </div>
  );
}
