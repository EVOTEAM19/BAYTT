"use client";

import { useMovie } from "@/hooks/use-movies";
import { useApproveScript, useGenerateScript } from "@/hooks/use-generation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { ChevronDown, ChevronUp, Check, RefreshCw, Edit } from "lucide-react";
import { useState } from "react";
import { useRouter } from "next/navigation";
import type { SceneOutline } from "@/types/api";

interface ScriptPreviewProps {
  movieId: string;
}

export function ScriptPreview({ movieId }: ScriptPreviewProps) {
  const { data: movie, isLoading } = useMovie(movieId);
  const { mutate: approveScript, isPending: isApproving } = useApproveScript();
  const { mutate: regenerateScript, isPending: isRegenerating } =
    useGenerateScript();
  const router = useRouter();

  const [expandedScenes, setExpandedScenes] = useState<Set<number>>(new Set());
  const [editingScene, setEditingScene] = useState<number | null>(null);

  const toggleScene = (sceneNumber: number) => {
    const newExpanded = new Set(expandedScenes);
    if (newExpanded.has(sceneNumber)) {
      newExpanded.delete(sceneNumber);
    } else {
      newExpanded.add(sceneNumber);
    }
    setExpandedScenes(newExpanded);
  };

  const handleApprove = () => {
    approveScript(movieId, {
      onSuccess: () => {
        router.push(`/create-movie?movie_id=${movieId}&step=generating`);
      },
    } as any);
  };

  const handleRegenerate = () => {
    if (!movie) return;

    regenerateScript(
      {
        movie_id: movieId,
        user_prompt: movie.user_prompt || "",
        user_plot: movie.user_plot || undefined,
        user_ending: movie.user_ending || undefined,
        genre: movie.genre,
        duration_minutes: movie.duration_minutes,
        character_ids: [], // TODO: Get from movie
      },
      {
        onSuccess: () => {
          // Refresh movie data
          window.location.reload();
        },
      }
    );
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Progress value={50} />
      </div>
    );
  }

  // Obtener script desde la API
  // Por ahora, asumimos que el script está en movie.script o similar
  const script = (movie as any)?.script;
  const scenes: SceneOutline[] = script?.scenes || [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-2xl">Guión Generado</CardTitle>
              <p className="text-sm text-foreground-muted mt-1">
                Revisa el guión antes de continuar con la generación
              </p>
            </div>
            <Badge variant="default">
              {scenes.length} escena{scenes.length !== 1 ? "s" : ""}
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          {script?.summary && (
            <div className="mb-4 p-4 bg-card border border-border rounded-lg">
              <p className="text-sm text-foreground-muted mb-1">Resumen:</p>
              <p className="text-foreground">{script.summary}</p>
            </div>
          )}

          <div className="flex gap-4">
            <Button
              variant="default"
              onClick={handleApprove}
              isLoading={isApproving}
              leftIcon={<Check className="h-4 w-4" />}
            >
              Aprobar y Continuar
            </Button>
            <Button
              variant="secondary"
              onClick={handleRegenerate}
              isLoading={isRegenerating}
              leftIcon={<RefreshCw className="h-4 w-4" />}
            >
              Regenerar Guión
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Scenes List */}
      <div className="space-y-4">
        {scenes.map((scene) => {
          const isExpanded = expandedScenes.has(scene.scene_number);
          const isEditing = editingScene === scene.scene_number;

          return (
            <Card key={scene.scene_number}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Badge variant="secondary">
                      Escena {scene.scene_number}
                    </Badge>
                    <CardTitle className="text-lg">{scene.title}</CardTitle>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setEditingScene(isEditing ? null : scene.scene_number)}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => toggleScene(scene.scene_number)}
                    >
                      {isExpanded ? (
                        <ChevronUp className="h-4 w-4" />
                      ) : (
                        <ChevronDown className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                </div>
              </CardHeader>

              {isExpanded && (
                <CardContent className="space-y-4">
                  {/* Description */}
                  <div>
                    <p className="text-sm font-semibold text-foreground-muted mb-1">
                      Descripción:
                    </p>
                    <p className="text-foreground whitespace-pre-wrap">
                      {scene.description}
                    </p>
                  </div>

                  {/* Dialogue */}
                  {scene.dialogue && (
                    <div>
                      <p className="text-sm font-semibold text-foreground-muted mb-1">
                        Diálogo:
                      </p>
                      <p className="text-foreground italic">"{scene.dialogue}"</p>
                    </div>
                  )}

                  {/* Characters */}
                  {scene.characters && scene.characters.length > 0 && (
                    <div>
                      <p className="text-sm font-semibold text-foreground-muted mb-2">
                        Personajes:
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {scene.characters.map((char, idx) => (
                          <Badge key={idx} variant="secondary">
                            {char}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Visual Prompt */}
                  <div>
                    <p className="text-sm font-semibold text-foreground-muted mb-1">
                      Prompt Visual:
                    </p>
                    <p className="text-sm text-foreground bg-card border border-border rounded p-3">
                      {scene.visual_prompt}
                    </p>
                  </div>

                  {/* Audio Prompt */}
                  {scene.audio_prompt && (
                    <div>
                      <p className="text-sm font-semibold text-foreground-muted mb-1">
                        Audio:
                      </p>
                      <p className="text-sm text-foreground">{scene.audio_prompt}</p>
                    </div>
                  )}

                  {/* Music Mood */}
                  {scene.music_mood && (
                    <div>
                      <p className="text-sm font-semibold text-foreground-muted mb-1">
                        Música:
                      </p>
                      <Badge variant="info">{scene.music_mood}</Badge>
                    </div>
                  )}

                  {/* Duration */}
                  <div className="text-sm text-foreground-muted">
                    Duración: {scene.duration_seconds}s
                  </div>
                </CardContent>
              )}
            </Card>
          );
        })}
      </div>
    </div>
  );
}

