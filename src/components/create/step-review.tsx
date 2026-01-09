"use client";

import { useCreationStore } from "@/stores/creation-store";
import { useCreateMovie } from "@/hooks/use-movies";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { GENRES, DURATIONS } from "@/types/movie";
import { CHARACTER_CATEGORIES } from "@/types/character";
import { useCharacters } from "@/hooks/use-characters";
import { useRouter } from "next/navigation";
import { useMemo } from "react";
import { Film, Clock, Tag, Users, Sparkles, Wand2 } from "lucide-react";
import { formatDuration } from "@/lib/utils/formatters";

export function StepReview() {
  const {
    duration_minutes,
    genre,
    user_prompt,
    user_plot,
    ending_type,
    user_ending,
    character_ids,
    use_random_characters,
    random_characters_count,
    setMovieId,
  } = useCreationStore();

  const { mutate: createMovie, isPending: isCreating } = useCreateMovie();
  const router = useRouter();

  const { data: selectedCharacters = [] } = useCharacters({});

  const genreData = GENRES.find((g) => g.id === genre);
  const durationData = DURATIONS.find((d) => d.minutes === duration_minutes);

  const estimatedTimeMinutes = useMemo(() => {
    if (!duration_minutes) return null;
    // Estimación: 2 minutos por minuto de película
    return duration_minutes * 2;
  }, [duration_minutes]);

  const handleCreate = () => {
    if (!duration_minutes || !genre) return;

    createMovie(
      {
        title: `Película ${genreData?.name || ""} - ${new Date().toLocaleDateString()}`,
        genre,
        duration_minutes,
        user_prompt,
        user_plot: user_plot || undefined,
        user_ending: ending_type === "user" ? user_ending : undefined,
        ending_type,
        // Enviar tanto personajes aleatorios como de librería
        character_ids: character_ids, // Personajes de librería seleccionados
        use_random_characters: use_random_characters || false,
        random_characters_count: use_random_characters ? random_characters_count : undefined,
      },
      {
        onSuccess: async (response: any) => {
          const movieId = response.data?.id || response.movie_id || response.id;
          if (movieId) {
            setMovieId(movieId);
            // Iniciar generación de guión
            router.push(`/create-movie?movie_id=${movieId}&step=generating`);
          }
        },
      }
    );
  };

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      <div className="text-center space-y-2">
        <h2 className="text-3xl font-bold text-foreground">
          Revisa tu película
        </h2>
        <p className="text-foreground-muted">
          Verifica todos los detalles antes de crear tu película
        </p>
      </div>

      <div className="space-y-4">
        {/* Duration */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Duración
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-foreground">
              {durationData?.label} ({durationData?.scenes} escenas)
            </p>
          </CardContent>
        </Card>

        {/* Genre */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Tag className="h-5 w-5" />
              Género
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <span className="text-2xl">{genreData?.icon}</span>
              <span className="text-foreground font-semibold">
                {genreData?.name}
              </span>
            </div>
          </CardContent>
        </Card>

        {/* Description */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Film className="h-5 w-5" />
              Descripción
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-foreground whitespace-pre-wrap">{user_prompt}</p>
          </CardContent>
        </Card>

        {/* Plot */}
        {user_plot && (
          <Card>
            <CardHeader>
              <CardTitle>Trama detallada</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-foreground whitespace-pre-wrap">{user_plot}</p>
            </CardContent>
          </Card>
        )}

        {/* Ending */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              {ending_type === "user" ? (
                <Wand2 className="h-5 w-5" />
              ) : (
                <Sparkles className="h-5 w-5" />
              )}
              Final
            </CardTitle>
          </CardHeader>
          <CardContent>
            {ending_type === "user" ? (
              <div>
                <Badge variant="default" className="mb-2">
                  Final personalizado
                </Badge>
                <p className="text-foreground whitespace-pre-wrap">
                  {user_ending}
                </p>
              </div>
            ) : (
              <Badge variant="secondary">IA generará el final</Badge>
            )}
          </CardContent>
        </Card>

        {/* Characters */}
        {(character_ids.length > 0 || use_random_characters) && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Personajes
              </CardTitle>
            </CardHeader>
            <CardContent>
              {use_random_characters ? (
                <div className="space-y-2">
                  <Badge variant="default" className="mb-2">
                    <Sparkles className="h-3 w-3 mr-1" />
                    Personajes Aleatorios
                  </Badge>
                  <p className="text-sm text-foreground-muted">
                    Se generarán {random_characters_count || 3} personajes únicos basados en tu historia
                  </p>
                </div>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {selectedCharacters
                    .filter((c) => character_ids.includes(c.id))
                    .map((character) => (
                      <Badge key={character.id} variant="secondary">
                        {character.name}
                      </Badge>
                    ))}
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Estimated Time */}
        {estimatedTimeMinutes && (
          <Card className="bg-card border-primary/20">
            <CardContent className="p-6">
              <div className="text-center space-y-2">
                <p className="text-sm text-foreground-muted">
                  Tiempo estimado de generación
                </p>
                <p className="text-2xl font-bold text-primary">
                  ~{formatDuration(estimatedTimeMinutes)}
                </p>
                <p className="text-xs text-foreground-muted">
                  Este tiempo puede variar según la complejidad y la carga del
                  sistema
                </p>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      <div className="flex gap-4">
        <Button
          variant="secondary"
          className="flex-1"
          onClick={() => router.back()}
        >
          Volver
        </Button>
        <Button
          variant="default"
          className="flex-1"
          onClick={handleCreate}
          isLoading={isCreating}
          disabled={isCreating}
        >
          Crear Película
        </Button>
      </div>
    </div>
  );
}

